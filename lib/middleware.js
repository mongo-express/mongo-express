'use strict';

const path = require('path');
const express = require('express');
const swig = require('swig-templates');
const fileUpload = require('express-fileupload');
const swigFilters = require('./filters');
const router = require('./router');

const assets = require('../build-assets.json');

const middleware = async function (config) {
  const app = express();

  app.locals.assets = assets;

  // Set up swig
  const swigOptions = {
    cache: process.env.NODE_ENV === 'production' ? 'memory' : false,
  };
  const swigEngine = new swig.Swig(swigOptions);
  app.engine('html', swigEngine.renderFile);
  Object.keys(swigFilters).forEach(function (name) {
    swig.setFilter(name, swigFilters[name]);
  });

  // App configuration
  app.set('views', path.resolve(__dirname, 'views'));
  app.set('view engine', 'html');
  app.set('view options', { layout: false });

  // Handle file upload
  app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  }));

  app.use('/', await router(config));

  app.set('read_only', config.options.readOnly || false);
  app.set('me_confirm_delete', config.options.confirmDelete || false);
  app.set('me_collapsible_json', config.options.collapsibleJSON || false);
  app.set('me_collapsible_json_default_unfold', config.options.collapsibleJSONDefaultUnfold || false);
  app.set('me_no_export', config.options.noExport || false);
  app.set('gridFSEnabled', config.options.gridFSEnabled || false);
  app.set('no_delete', config.options.noDelete || false);

  return app;
};

module.exports = middleware;
