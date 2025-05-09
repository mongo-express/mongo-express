import $ from 'jquery';
import { encode } from 'html-entities';
import renderjson from 'renderjson-2';
import 'bootstrap-paginator-2';
import { Modal } from 'bootstrap';
import editor from './editor.js';

function getParameterByName(name) {
  // eslint-disable-next-line unicorn/better-regex
  name = name.replace(/\[/, String.raw`\[`).replace(/[\]]/, String.raw`\]`);
  const regex = new RegExp(String.raw`[\?&]` + name + '=([^&#]*)');
  const results = regex.exec(globalThis.location.search);
  return results === null ? '' : decodeURIComponent(results[1].replaceAll('+', ' '));
}

$(() => {
  $('#tabs').tab();
  if (document.location.href.includes('query=') && getParameterByName('query') !== '') {
    $('#tabs a[href="#advanced"]').tab('show');
  }
  const { limit, skip, totalPages } = ME_SETTINGS;
  // https://jacobmarshall-etc.github.io/bootstrap-paginator
  const options = {
    currentPage: Math.round(skip / limit) + 1,
    totalPages,
    centerCurrentPage: true,
    onPageClicked(e, originalEvent, type, page) {
      const searchParams = new URLSearchParams(globalThis.location.search);
      searchParams.set('skip', (page * limit) - limit);
      globalThis.location.search = searchParams.toString();
    },
  };
  $('#paginator-top').bootstrapPaginator(options);
  $('#paginator-bottom').bootstrapPaginator(options);
});

const addDoc = editor(document.querySelector('#document'), {
  readOnly: ME_SETTINGS.readOnly,
});

const addIndexDoc = editor(document.querySelector('#index'), {
  readOnly: ME_SETTINGS.readOnly,
});

globalThis.checkValidJSON = function (csrfToken) {
  $.ajax({
    type: 'POST',
    url: `${ME_SETTINGS.baseHref}checkValid`,
    data: {
      document: addDoc.getValue(),
      _csrf: csrfToken,
    },
  }).done((data) => {
    if (data === 'Valid') {
      $('#documentInvalidJSON').remove();
      $('#addDocumentForm').submit();
    } else if ($('#documentInvalidJSON').length === 0) {
      $('#document-modal-body').parent().append('<div id="documentInvalidJSON" class="alert alert-danger"><strong>Invalid JSON</strong></div>');
    }
  });
  return false;
};

globalThis.checkValidIndexJSON = function (csrfToken) {
  $.ajax({
    type: 'POST',
    url: `${ME_SETTINGS.baseHref}checkValid`,
    data: {
      document: addIndexDoc.getValue(),
      _csrf: csrfToken,
    },
  }).done((data) => {
    if (data === 'Valid') {
      $('#indexInvalidJSON').remove();
      $('#addIndexForm').submit();
    } else if ($('#indexInvalidJSON').length === 0) {
      $('#index-modal-body').parent().append('<div id="indexInvalidJSON" class="alert alert-danger"><strong>Invalid JSON</strong></div>');
    }
  });
  return false;
};

$('#addDocument').on('shown.bs.modal', function () {
  addDoc.refresh();
  addDoc.focus();
});

$('#addIndex').on('shown.bs.modal', function () {
  addIndexDoc.refresh();
  addIndexDoc.focus();
});

if (ME_SETTINGS.collapsibleJSON) {
  $(function () {
    // convert all objects to renderjson elements
    $('div.tableContent pre').each(function () {
      const $this = $(this);
      const text = $.trim($this.text());
      if (text) {
        $this.html(renderjson(JSON.parse(text)));
      }
    });
  });
  renderjson.set_show_to_level(ME_SETTINGS.collapsibleJSONDefaultUnfold);
}

function makeCollectionUrl() {
  const st = ME_SETTINGS;
  return `${st.baseHref}db/${encodeURIComponent(st.dbName)}/${encodeURIComponent(st.collectionName)}/`;
}

globalThis.loadDocument = function (url) {
  const selection = globalThis.getSelection().toString();
  if (selection === '') {
    globalThis.location.href = url;
  }
};

function renderProp(input) {
  // Images inline
  if (
    typeof input === 'string'
    && (
      input.slice(0, 22) === 'data:image/png;base64,'
      || input.slice(0, 22) === 'data:image/gif;base64,'
      || input.slice(0, 22) === 'data:image/jpg;base64,'
      || input.slice(0, 23) === 'data:image/jpeg;base64,'
    )
  ) {
    return `<img src="${encode(input)}" style="max-height:100%; max-width:100%; "/>`;
  }

  // Audio inline
  if (
    typeof input === 'string'
    && (
      input.slice(0, 22) === 'data:audio/ogg;base64,'
      || input.slice(0, 22) === 'data:audio/wav;base64,'
      || input.slice(0, 22) === 'data:audio/mp3;base64,'
    )
  ) {
    return `<audio controls style="width:45px;" src="${encode(input)}">Your browser does not support the audio element.</audio>`;
  }

  // Video inline
  if (
    typeof input === 'string'
    && (
      input.slice(0, 23) === 'data:video/webm;base64,'
      || input.slice(0, 22) === 'data:video/mp4;base64,'
      || input.slice(0, 22) === 'data:video/ogv;base64,'
    )
  ) {
    const videoFormat = input.match(/^data:(.*);base64/)[1];
    return `<video controls><source type="${encode(videoFormat)}" src="${encode(input)}"/>
      + 'Your browser does not support the video element.</video>`;
  }
  if (typeof input === 'object' && (input.toString() === '[object Object]' || input.toString().slice(0, 7) === '[object')) {
    return renderjson(input);
  }

  // treat unknown data as escaped string
  return encode(input.toString());
}

$(() => {
  const $tableWrapper = $('.tableWrapper');
  if ($('.tableHeaderFooterBars').width() === $tableWrapper.width()) {
    // table wrapper is the same width as the table itself, so not overflowing, so remove the white gradient
    $('.fadeToWhite').remove();
  } else {
    $('.fadeToWhite').height($('.tableWrapper').height()); // limit the height only to the table div
  }

  $('.deleteButtonCollection').tooltip({
    title: 'Are you sure you want to delete this collection? All documents will be deleted.',
  });

  $tableWrapper.scroll(function () {
    const proximityToRightOfTable = $('.tableWrapper table').width() - $tableWrapper.scrollLeft() - $tableWrapper.width();
    const opacity = Math.min(Math.max(proximityToRightOfTable - 50, 50) - 50, 100) / 100;
    document.querySelector('#fadeToWhiteID').style.opacity = Math.min(opacity, 0.6);
  });

  $('.tooDamnBig').on('click', function (e) {
    e.preventDefault();
    e.stopPropagation();

    const target = $(this);
    const _id = target.attr('doc_id');
    const prop = target.attr('doc_prop');
    const spinner = `<img src="${ME_SETTINGS.baseHref}public/img/gears.gif" />`;
    const leftScroll = $tableWrapper.scrollLeft();

    // Set the element with spinner for now
    target.html(spinner);

    $.get(`${makeCollectionUrl()}${encodeURIComponent(_id)}/${prop}`, function (prop) {
      prop = renderProp(prop);
      // Set the element with gotten datas
      target.parent().html(prop);

      // Set original scroll position
      $('.tableWrapper').scrollLeft(leftScroll);
    });
  });

  $('.deleteButtonDocument').on('click', function (e) {
    const $form = $(this).closest('form');
    const $target = $('#confirm-deletion-document');
    e.stopPropagation();
    e.preventDefault();

    const modal = new Modal($target, { backdrop: 'static', keyboard: false });

    $target
      .one('click', '#delete', function () {
        $form.trigger('submit'); // submit the form
      });
    modal.show();
  });

  $('#deleteListConfirmButton').on('click', function () {
    // we just need to POST the form, as all the query parameters are already embedded in the form action
    $('#deleteListForm').trigger('submit');
  });

  $('.deleteButtonCollection').on('click', function (event) {
    $('.deleteButtonCollection').tooltip('hide');

    event.preventDefault();

    const $target = $('#confirm-deletion-collection');
    const $parentForm = $(this).parent();

    const modal = new Modal($target, { backdrop: 'static', keyboard: false });

    $('#confirmation-input').attr('shouldbe', $(this).data('collection-name'));
    $('#modal-collection-name').text($(this).data('collection-name'));
    $target
      .one('shown.bs.modal', function () {
        $('#confirmation-input').focus();
      })
      .one('click', '#deleteCollectionConfirmation', function () {
        const $input = $('#confirmation-input');
        if ($input.val().toLowerCase() === $input.attr('shouldbe').toLowerCase()) {
          $parentForm.trigger('submit');
        }
      });
    modal.show();
  });

  const nextSort = {
    1: -1,
    '-1': 0,
    0: 1,
    undefined: 1,
  };
  $('.sorting-button').on('click', function () {
    const $this = $(this);
    const column = $this.data('column');
    const direction = nextSort[$this.data('direction')];

    $('input.sort-' + column).val(direction).prop('checked', direction !== 0);

    $('#my-tab-content .tab-pane.active form').trigger('submit');
  });

  const $importInputsFile = $('.import-input-file');
  const $importFileLinks = $('.import-file-link');

  // Trigger onClick event on hidden input file
  $.each($importFileLinks, (key, link) => {
    $(link).on('click', function () {
      $($importInputsFile[key]).trigger('click');
    });
  });
  // When file is add in input, send it to the server
  $importInputsFile.on('change', function (event) {
    const { files } = event.target;
    const collection = $(event.target).attr('collection-name');
    const data = new FormData();

    $.each(files, (key, value) => {
      data.append(`file_${key}`, value);
    });

    const csrfToken = document.querySelector('[name="_csrf"]').value;

    $.ajax({
      type: 'POST',
      url: `${ME_SETTINGS.baseHref}db/${ME_SETTINGS.dbName}/import/${collection}`,
      data,
      cache: false,
      processData: false, // Don't process the files
      contentType: false, // Set content type to false as jQuery will tell the server its a query string request
      beforeSend: (request) => request.setRequestHeader('X-CSRF-TOKEN', csrfToken),
    })
      .done(function (res) {
        // eslint-disable-next-line no-alert
        alert(res);
        globalThis.location.reload();
      })
      .catch(function (error) {
        // eslint-disable-next-line no-alert
        alert(error?.responseText);
      });
  });
});
