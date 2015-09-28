'use strict';

var express = require('express'),
  cons = require('consolidate'),
  swig = require('swig');

var swigFilters = require('./filters'),
  router = require('./router');

var middleware = function(config) {
  var app = express();

  //Set up swig
  app.engine('html', cons.swig);
  Object.keys(swigFilters).forEach(function (name) {
      swig.setFilter(name, swigFilters[name]);
  });

  //App configuration
  app.set('views', __dirname + '/views');
  app.set('view engine', 'html');
  app.set('view options', {layout: false});

  app.use('/', router(config));

  return app;
};

module.exports = middleware;
