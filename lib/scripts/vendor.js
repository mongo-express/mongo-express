import './jQueryLoader.js';
// Need to import jQuery first to expose it on window
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import $ from 'jquery';

$(() => {
  document.body.dataset.bsTheme = localStorage.getItem('bsTheme');
  document.querySelector('#darkModeIcon').addEventListener('click', function () {
    this.classList.toggle('fa-moon');
    this.classList.toggle('fa-sun');
    const theme = document.body.dataset.bsTheme;
    document.body.dataset.bsTheme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('bsTheme', document.body.dataset.bsTheme);
  });
});
