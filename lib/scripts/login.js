import $ from 'jquery';

$(() => {
  $('#togglePassword').click(function () {
    const passwordInput = $('#password');
    const type = passwordInput.attr('type');
    if (type === 'password') {
      passwordInput.attr('type', 'text');
      $(this).find('i').removeClass('fa fa-eye d-block').addClass('fa fa-eye-slash');
    } else {
      passwordInput.attr('type', 'password');
      $(this).find('i').removeClass('fa fa-eye-slash').addClass('fa fa-eye');
    }
  });
});
