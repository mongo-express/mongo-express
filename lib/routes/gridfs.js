'use strict';

let _       = require('underscore');
let mongo   = require('mongodb');
let Grid    = require('gridfs-stream');
var Busboy  = require('busboy');
var utils   = require('../utils');

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
      files[f].length     = utils.bytesToSize(files[f].length);
      files[f].chunkSize  = utils.bytesToSize(files[f].chunkSize);
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
    var busboy = new Busboy({ headers: req.headers });
    var fileId = new mongo.ObjectId();
    var gfs = new Grid(req.db, mongo);

    console.log(busboy.toString());

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      console.log('got file', filename, mimetype, encoding);
      var writeStream = gfs.createWriteStream({
        _id: fileId,
        filename: filename,
        mode: 'w',
        content_type: mimetype,
      });
      file.pipe(writeStream);
    }).on('finish', function() {
      // show a link to the uploaded file
      res.writeHead(200, {'content-type': 'text/html'});
      res.end('<a href="/file/' + fileId.toString() + '">download file</a>');
    });

    req.pipe(busboy);

  };

  exp.getFile = function(req, res) {

    var gfs = new Grid(req.db, mongo);

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
