'use strict';

// var bson  = require('../bson');
// var os    = require('os');
// var utils = require('../utils');
// var GridStore       = require('mongodb').GridStore;
var _       = require('underscore');
var mongodb = require('mongodb');
var Grid    = require('gridfs-stream');

// var routes = function(config) {
var routes = function() {
  var exp = {};

  //view all files in a bucket
  exp.viewBucket = function(req, res) {

    var files   = req.files;
    var columns = ['filename', 'length']; // putting these here keeps them at the front/left

    // Generate an array of columns used by all documents visible on this page
    for (var f in files) {
      columns.push(Object.keys(files[f]));
    }

    columns = _.uniq(_.flatten(columns));
    columns.splice(columns.indexOf('_id'), 1);

    var ctx = {
      columns: columns,
      files: req.files,
      title: 'Viewing Bucket: ' + req.bucketName,
    };

    res.render('gridfs', ctx);

  };

  exp.addFile = function(req, res) {
    // no-op
    console.log(req);
    res.send('no-op');
  };

  exp.getFile = function(req, res) {

    var gfs = new Grid(req.db, mongodb);

    gfs.findOne({ _id: req.fileID }, function(err, file) {
      if (err) return res.status(400).send(err);
      if (!file) return res.status(404).send('');

      res.set('Content-Type', file.contentType);
      res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');

      var readstream = gfs.createReadStream({
        _id: file._id,
      });

      readstream.on('error', function(err) {
        console.log('Got error while processing stream ' + err.message);
        res.end();
      });

      readstream.pipe(res);
    });
  };

  exp.deleteFile = function(req, res) {
    // no-op
    console.log(req);
    res.send('no-op');
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
