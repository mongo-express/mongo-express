'use strict';

//Add routes from other files
var collectionRoute  = require('./collection');
var databaseRoute    = require('./database');
var documentRoute    = require('./document');
var gridFSRoute      = require('./gridfs');

var routes = function (config) {
  var exp = {};

  exp.addDatabase       = databaseRoute(config).addDatabase;
  exp.deleteDatabase    = databaseRoute(config).deleteDatabase;
  exp.viewDatabase      = databaseRoute(config).viewDatabase;

  exp.addCollection     = collectionRoute(config).addCollection;
  exp.compactCollection = collectionRoute(config).compactCollection;
  exp.deleteCollection  = collectionRoute(config).deleteCollection;
  exp.exportColArray    = collectionRoute(config).exportColArray;
  exp.exportCsv         = collectionRoute(config).exportCsv;
  exp.exportCollection  = collectionRoute(config).exportCollection;
  exp.renameCollection  = collectionRoute(config).renameCollection;
  exp.updateCollections = collectionRoute(config).updateCollections;
  exp.viewCollection    = collectionRoute(config).viewCollection;
  exp.dropIndex         = collectionRoute(config).dropIndex;
  exp.reIndex           = collectionRoute(config).reIndex;

  exp.getProperty       = documentRoute(config).getProperty;
  exp.addDocument       = documentRoute(config).addDocument;
  exp.checkValid        = documentRoute(config).checkValid;
  exp.deleteDocument    = documentRoute(config).deleteDocument;
  exp.updateDocument    = documentRoute(config).updateDocument;
  exp.viewDocument      = documentRoute(config).viewDocument;

  exp.addBucket         = gridFSRoute(config).addBucket;
  exp.deleteBucket      = gridFSRoute(config).deleteBucket;
  exp.viewBucket        = gridFSRoute(config).viewBucket;
  exp.addFile           = gridFSRoute(config).addFile;
  exp.getFile           = gridFSRoute(config).getFile;
  exp.deleteFile        = gridFSRoute(config).deleteFile;

  //Homepage route
  exp.index = function (req, res) {
    var ctx = {
      title: 'Mongo Express',
      info: false,
    };

    if (typeof req.adminDb === 'undefined') {
      return res.render('index');
    }

    req.adminDb.serverStatus(function (err, info) {
      if (err) {
        //TODO: handle error
        console.error(err);
      }

      ctx.info = info;

      res.render('index', ctx);
    });
  };

  return exp;
};

module.exports = routes;
