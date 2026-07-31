import './jQueryLoader.js';
// Need to import jQuery first to expose it on window
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import $ from 'jquery';

$(() => {
  function toggleThemeMode() {
    const $darkModeIconBtn = $('#darkModeIcon')[0];
    const $nav = $('#navbar')[0];
    const currentThemeMode = document.body.dataset.bsTheme;
    if (currentThemeMode === 'dark') {
      document.body.dataset.bsTheme = 'light';
      $darkModeIconBtn.classList.remove('fa-sun');
      $darkModeIconBtn.classList.add('fa-moon');

      $nav.classList.remove('navbar-dark');
      $nav.classList.remove('bg-dark');

      $nav.classList.add('navbar-light');
      $nav.classList.add('bg-light');
    } else {
      document.body.dataset.bsTheme = 'dark';
      $darkModeIconBtn.classList.remove('fa-moon');
      $darkModeIconBtn.classList.add('fa-sun');

      $nav.classList.remove('navbar-light');
      $nav.classList.remove('bg-light');

      $nav.classList.add('navbar-dark');
      $nav.classList.add('bg-dark');
    }

    localStorage.setItem('bsTheme', document.body.dataset.bsTheme);
  }
  const themeMode = localStorage.getItem('bsTheme');
  if (themeMode === 'dark') {
    toggleThemeMode();
  }
  document.querySelector('#darkModeIcon').addEventListener('click', toggleThemeMode);
});
