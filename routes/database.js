'use strict';

var utils = require('../utils');

var routes = function() {
  var exp = {};

  exp.viewDatabase = function(req, res) {

    req.db.stats(function(err, data) {
      var ctx = {
        title: 'Viewing Database: ' + req.dbName,
        colls: req.collections[req.dbName],
        stats: {
          avgObjSize:         utils.bytesToSize(data.avgObjSize),
          collections:        data.collections,
          dataFileVersion:    (data.dataFileVersion && data.dataFileVersion.major && data.dataFileVersion.minor ?
            data.dataFileVersion.major + '.' + data.dataFileVersion.minor :
            null),
          dataSize:           utils.bytesToSize(data.dataSize),
          extentFreeListNum:  (data.extentFreeList && data.extentFreeList.num ? data.extentFreeList.num : null),
          fileSize:           (typeof data.fileSize !== 'undefined' ? utils.bytesToSize(data.fileSize) : null),
          indexes:            data.indexes,
          indexSize:          utils.bytesToSize(data.indexSize),
          numExtents:         data.numExtents.toString(),
          objects:            data.objects,
          storageSize:        utils.bytesToSize(data.storageSize),
        },
      };
      res.render('database', ctx);
    });
  };

  exp.updateCollections = function(req, res) {
    req.updateCollections(req.db, req.dbName, function(err) {
      if (err) {
        req.session.error = 'Something went wrong: ' + err;
        return res.redirect('back');
      }

      req.session.success = 'Collections Updated!';
      res.redirect(res.locals.baseHref + 'db/' + req.dbName);
    });
  };

  return exp;
};

module.exports = routes;
