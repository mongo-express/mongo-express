import $ from 'jquery';

$(() => {
  $('#collection').popover({
    content: 'Collection names must begin with a letter, underscore, hyphen or slash, and can contain only letters, '
      + 'underscores, hyphens, numbers, dots or slashes',
    placement: 'left',
  });

  const $deleteButton = $('.deleteButton');

  $deleteButton.tooltip({
    title: 'Warning! Are you sure you want to delete this collection? All documents will be deleted.',
  });

  $deleteButton.on('click', function onDeleteClick(event) {
    $deleteButton.tooltip('hide');

    event.preventDefault();

    const $target = $(this);
    const parentForm = $target.parent();

    $('#confirmation-input').attr('shouldbe', $target.attr('collection-name'));
    $('#modal-collection-name').text($target.attr('collection-name'));
    $('#confirm-deletion').modal({ backdrop: 'static', keyboard: false })
      .one('shown.bs.modal', () => {
        $('#confirmation-input').focus();
      })
      .one('click', '#delete', () => {
        const input = $('#confirmation-input');
        if (input.val().toLowerCase() === input.attr('shouldbe').toLowerCase()) {
          parentForm.trigger('submit');
        }
      });
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

    $.ajax({
      type: 'POST',
      url: `${ME_SETTINGS.baseHref}db/${ME_SETTINGS.dbName}/import/${collection}`,
      data,
      cache: false,
      dataType: 'json',
      processData: false, // Don't process the files
      contentType: false, // Set content type to false as jQuery will tell the server its a query string request
    });
  });
});
