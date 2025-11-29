import mongo from 'mongodb';
import * as utils from '../utils.js';
import { Readable } from "stream";

// var routes = function(config) {
const routes = function () {
  const exp = {};

  // view all files in a bucket
  exp.viewBucket = function (req, res) {
    const { bucketName, dbName, connFiles } = req;
    let columns = ['filename', 'length']; // putting these here keeps them at the front/left

    const statsAvgChunk  = utils.bytesToSize(connFiles.reduce((prev, curr) => prev + curr.chunkSize, 0) / connFiles.length);
    const statsTotalSize = utils.bytesToSize(connFiles.reduce((prev, curr) => prev + curr.length, 0));

    // Iterate through files for a cleanup
    for (const f in connFiles) {
      columns.push(Object.keys(connFiles[f]));                        // Generate an array of columns used by all documents visible on this page
      connFiles[f].length     = utils.bytesToSize(connFiles[f].length);   // Filesizes to something more readable
      delete connFiles[f].chunkSize;                                   // Already taken the average above, no need;
    }

    columns = columns.flat()
      .filter((value, index, arr) => arr.indexOf(value) === index);  // Remove duplicates
    columns.splice(columns.indexOf('_id'), 1);
    columns.splice(columns.indexOf('chunkSize'), 1);

    const ctx = {
      buckets: res.locals.gridFSBuckets[dbName],
      columns,
      files: connFiles,
      csrfToken: req.csrfToken(),
      title: 'Viewing Bucket: ' + bucketName,
      stats: {
        avgChunk: statsAvgChunk,
        totalSize: statsTotalSize,
      },
    };

    res.render('gridfs', ctx);
  };

  // upload a file
  exp.addFile = function (req, res) {
    if (!req.files || !req.files.filefield) {
      return res.status(400).send("No file uploaded.");
    }

    const bucket = new mongo.GridFSBucket(req.db, { bucketName: req.bucketName });

    const bufferStream = new Readable();
    bufferStream.push(req.files.filefield.data);
    bufferStream.push(null);
    bufferStream.pipe(bucket.openUploadStream(req.files.filefield.name));
    req.session.success = 'File uploaded!';

    setTimeout(function () {
      // short delay to allow Mongo to finish syncing
      return res.redirect('back');
    }, 500);
  };

  // download a file
  exp.getFile = function (req, res) {
    const bucket = new mongo.GridFSBucket(req.db, { bucketName: req.bucketName });
    bucket.openDownloadStream(mongo.ObjectId.createFromHexString(req.fileID)).pipe(res);
  };

  // delete a file
  exp.deleteFile = function (req, res) {
    const bucket = new mongo.GridFSBucket(req.db, { bucketName: req.bucketName });
    bucket.delete(mongo.ObjectId.createFromHexString(req.fileID));
    
    req.session.success = 'File _id: "' + req.fileID + '" deleted! ';
    setTimeout(function () {
      // short delay to allow Mongo to finish syncing
      return res.redirect('back');
    }, 500);
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

export default routes;
