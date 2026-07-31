import $ from 'jquery';
import { Modal } from 'bootstrap';

$(() => {
  $('#database').popover({
    content: 'Database names cannot be empty, must have fewer than 64 characters and must not contain /. "$*<>:|?',
    placement: 'left',
  });

  const $deleteButton = $('.deleteButton');

  $deleteButton.tooltip({
    title: 'Warning! Are you sure you want to delete this database? All collections and documents will be deleted.',
  });

  $deleteButton.on('click', function onDeleteClick(event) {
    $deleteButton.tooltip('hide');

    event.preventDefault();

    const $target = $('#confirm-deletion');
    const parentForm = $(this).parent();
    const dbName = $(this).data('database-name');

    const modal = new Modal($target, { backdrop: 'static', keyboard: false });

    $('#confirmation-input').attr('shouldbe', dbName);
    $('#modal-database-name').text(dbName);
    $target
      .one('shown.bs.modal', () => {
        $('#confirmation-input').focus();
      })
      .one('click', '#delete', () => {
        const input = $('#confirmation-input');
        if (input.val().toLowerCase() === input.attr('shouldbe').toLowerCase()) {
          parentForm.trigger('submit');
        }
      });
    modal.show();
  });
});
