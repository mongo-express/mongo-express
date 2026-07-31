import mongo from 'mongodb';
import * as utils from '../utils.js';
import { Readable } from 'node:stream';

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
  exp.addFile = async function (req, res) {
    if (!req.files || !req.files.filefield) {
      req.session.error = 'No file uploaded!';
      return res.redirect(req.get('Referrer') || '/');
    }

    const bucket = new mongo.GridFSBucket(req.db, { bucketName: req.bucketName });
    const { data, name, mimetype } = req.files.filefield;

    try {
      // Await the stream rather than redirecting on a timer: the original slept 500ms and
      // hoped Mongo had caught up, which races on a slow write and hides failures entirely.
      await new Promise((resolve, reject) => {
        Readable.from([data]).pipe(bucket.openUploadStream(name, { contentType: mimetype }))
          .on('finish', resolve)
          .on('error', reject);
      });
      req.session.success = 'File uploaded!';
    } catch (error) {
      req.session.error = 'Could not upload the file! ' + error;
      console.error(error);
    }

    res.redirect(req.get('Referrer') || '/');
  };

  // download a file
  exp.getFile = async function (req, res) {
    const bucket = new mongo.GridFSBucket(req.db, { bucketName: req.bucketName });
    const _id = mongo.ObjectId.createFromHexString(req.fileID);

    // Look the file up first: the headers below need its name and type, and a missing file
    // should redirect with a message rather than stream an empty 200.
    const [file] = await bucket.find({ _id }).limit(1).toArray();

    if (!file) {
      req.session.error = 'File not found!';
      return res.redirect(req.get('Referrer') || '/');
    }

    // Files stored without a contentType would otherwise send the literal 'Content-Type: false'
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Disposition', 'attachment; filename="' + encodeURI(file.filename) + '"');

    bucket.openDownloadStream(_id)
      .on('error', function (error) {
        console.error('Got error while processing stream ' + error.message);
        req.session.error = 'Error: ' + error;
        res.end();
      })
      .pipe(res);
  };

  // delete a file
  exp.deleteFile = async function (req, res) {
    const bucket = new mongo.GridFSBucket(req.db, { bucketName: req.bucketName });

    try {
      await bucket.delete(mongo.ObjectId.createFromHexString(req.fileID));
      req.session.success = 'File _id: "' + req.fileID + '" deleted! ';
    } catch (error) {
      req.session.error = 'Could not delete the file! ' + error;
      console.error(error);
    }

    res.redirect(req.get('Referrer') || '/');
  };

  // add bucket
  exp.addBucket = function (req, res) {
    req.session.error = 'addBucket not implemented yet';
    res.redirect(req.get('Referrer') || '/');

    // req.session.success = 'Bucket created!';
  };

  // delete bucket
  exp.deleteBucket = function (req, res) {
    req.session.error = 'deleteBucket not implemented yet';
    res.redirect(req.get('Referrer') || '/');

    // req.session.success = 'Bucket deleted!';
  };

  exp.renameBucket = function (req, res) {
    req.session.error = 'renameBucket not implemented yet';
    res.redirect(req.get('Referrer') || '/');
  };

  return exp;
};

export default routes;
