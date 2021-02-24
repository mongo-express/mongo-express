'use strict';

const _             = require('lodash');
const Busboy        = require('busboy');
const GridFSStream  = require('gridfs-stream');
const mongo         = require('mongodb');
const utils         = require('../utils');

// var routes = function(config) {
const routes = function () {
  const exp = {};

  // view all files in a bucket
  exp.viewBucket = function (req, res) {
    const { files } = req;
    let columns = ['filename', 'length']; // putting these here keeps them at the front/left

    const statsAvgChunk  = utils.bytesToSize(files.reduce((prev, curr) => prev + curr.chunkSize, 0) / files.length);
    const statsTotalSize = utils.bytesToSize(files.reduce((prev, curr) => prev + curr.length, 0));

    // Iterate through files for a cleanup
    for (const f in files) {
      columns.push(Object.keys(files[f]));                        // Generate an array of columns used by all documents visible on this page
      files[f].length     = utils.bytesToSize(files[f].length);   // Filesizes to something more readable
      delete files[f].chunkSize;                                   // Already taken the average above, no need;
    }

    columns = _.uniq(_.flatten(columns));
    columns.splice(columns.indexOf('_id'), 1);
    columns.splice(columns.indexOf('chunkSize'), 1);

    const ctx = {
      buckets: res.locals.gridFSBuckets[req.dbName],
      columns,
      files: req.files,
      title: 'Viewing Bucket: ' + req.bucketName,
      stats: {
        avgChunk: statsAvgChunk,
        totalSize: statsTotalSize,
      },
    };

    res.render('gridfs', ctx);
  };

  // upload a file
  exp.addFile = function (req, res) {
    const busboy      = new Busboy({ headers: req.headers });
    const newFileID   = new mongo.ObjectId();

    // Override the bucket name with what is currently selected
    // https://github.com/aheckmann/gridfs-stream/blob/a3b7c4e48a08ac625cf7564304c83e56d6b93821/lib/index.js#L31
    mongo.GridStore.DEFAULT_ROOT_COLLECTION = req.bucketName;

    const gfs         = new GridFSStream(req.db, mongo);

    busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
      if (!filename) {
        req.session.error = 'No filename.';
        return res.redirect('back');
      }

      const writeStream = gfs.createWriteStream({
        _id: newFileID,
        filename,
        mode: 'w',
        content_type: mimetype,
      });
      file.pipe(writeStream);
    }).on('finish', function () {
      req.session.success = 'File uploaded!';

      setTimeout(function () {
        // short delay to allow Mongo to finish syncing
        return res.redirect('back');
      }, 500);
    });

    req.pipe(busboy);
  };

  // download a file
  exp.getFile = function (req, res) {
    // Override the bucket name with what is currently selected
    // https://github.com/aheckmann/gridfs-stream/blob/a3b7c4e48a08ac625cf7564304c83e56d6b93821/lib/index.js#L31
    mongo.GridStore.DEFAULT_ROOT_COLLECTION = req.bucketName;

    const gfs = new GridFSStream(req.db, mongo);

    gfs.findOne({ _id: req.fileID }, function (err, file) {
      if (err) {
        console.error(err);
        req.session.error = 'Error: ' + err;
        return res.redirect('back');
      }

      if (!file) {
        console.error('No file');
        req.session.error = 'File not found!';
        return res.redirect('back');
      }

      res.set('Content-Type', file.contentType);
      res.set('Content-Disposition', 'attachment; filename="' + encodeURI(file.filename) + '"');

      const readstream = gfs.createReadStream({
        _id: file._id,
      });

      readstream.on('error', function (err) {
        console.error('Got error while processing stream ' + err.message);
        req.session.error = 'Error: ' + err;
        res.end();
      });

      readstream.pipe(res);
    });
  };

  // delete a file
  exp.deleteFile = function (req, res) {
    // Override the bucket name with what is currently selected
    // https://github.com/aheckmann/gridfs-stream/blob/a3b7c4e48a08ac625cf7564304c83e56d6b93821/lib/index.js#L31
    mongo.GridStore.DEFAULT_ROOT_COLLECTION = req.bucketName;

    const gfs = new GridFSStream(req.db, mongo);

    gfs.remove({ _id: req.fileID }, function (err) {
      if (err) {
        req.session.error = 'Error: ' + err;
        return res.redirect('back');
      }

      req.session.success = 'File _id: "' + req.fileID + '" deleted! ';
      setTimeout(function () {
        // short delay to allow Mongo to finish syncing
        return res.redirect('back');
      }, 500);
    });
  };

  // add bucket
  exp.addBucket = function (req, res) {
    req.session.error('addBucket not implemented yet');
    res.redirect('back');

    // req.session.success = 'Bucket created!';
  };

  // delete bucket
  exp.deleteBucket = function (req, res) {
    req.session.error('deleteBucket not implemented yet');
    res.redirect('back');

    // req.session.success = 'Bucket deleted!';
  };

  exp.renameBucket = function (req, res) {
    req.session.error('renameBucket not implemented yet');
    res.redirect('back');
  };

  return exp;
};

module.exports = routes;
