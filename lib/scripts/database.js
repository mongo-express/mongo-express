import $ from 'jquery';

$(document).ready(() => {
  $('#collection').popover({
    content: 'Collection names must begin with a letter, underscore, hyphen or slash, and can contain only letters, ' +
      'underscores, hyphens, numbers, dots or slashes',
    placement: 'left',
  });

  const $deleteButton = $('.deleteButton');

  $deleteButton.tooltip({
    title: 'Warning! Are you sure you want to delete this collection? All documents will be deleted.',
  });

  $deleteButton.on('click', function onDeleteClick(event) {
    $deleteButton.tooltip('hide');

    event.preventDefault();

    const target = $(this);
    const parentForm = $('#' + target.attr('childof'));

    $('#confirmation-input').attr('shouldbe', target.attr('collection-name'));
    $('#modal-collection-name').text(target.attr('collection-name'));
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
});
