'use strict';

// var _     = require('underscore');
// var bson  = require('../bson');
// var os    = require('os');
// var utils = require('../utils');

// var routes = function(config) {
var routes = function() {
  var exp = {};

  //view all files in a bucket
  exp.viewBucket = function(req, res) {
    var ctx = {
      title: 'Viewing Bucket: ' + req.bucketName,
    };

    res.render('gridfs', ctx);
  };

  exp.addBucket = function(req, res) {
    // no-op
    console.log(req);
    res.send('no-op');
  };

  exp.deleteBucket = function(req, res) {
    // no-op
    console.log(req);
    res.send('no-op');
  };

  exp.renameBucket = function(req, res) {
    // no-op
    console.log(req);
    res.send('no-op');
  };

  return exp;
};

module.exports = routes;
