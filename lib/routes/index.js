'use strict';

// Add routes from other files
const collectionRoute = require('./collection');
const databaseRoute = require('./database');
const documentRoute = require('./document');
const gridFSRoute = require('./gridfs');

module.exports = function (config) {
  const exp = {};

  const configuredDatabaseRoutes = databaseRoute(config);
  const configuredCollectionRoutes = collectionRoute(config);
  const configuredDocumentRoutes = documentRoute(config);
  const configuredGridFSRoute = gridFSRoute(config);

  exp.addDatabase = configuredDatabaseRoutes.addDatabase;
  exp.deleteDatabase = configuredDatabaseRoutes.deleteDatabase;
  exp.viewDatabase = configuredDatabaseRoutes.viewDatabase;

  exp.importCollection = configuredCollectionRoutes.importCollection;
  exp.addCollection = configuredCollectionRoutes.addCollection;
  exp.compactCollection = configuredCollectionRoutes.compactCollection;
  exp.deleteCollection = configuredCollectionRoutes.deleteCollection;
  exp.exportColArray = configuredCollectionRoutes.exportColArray;
  exp.exportCsv = configuredCollectionRoutes.exportCsv;
  exp.exportCollection = configuredCollectionRoutes.exportCollection;
  exp.renameCollection = configuredCollectionRoutes.renameCollection;
  exp.updateCollections = configuredCollectionRoutes.updateCollections;
  exp.viewCollection = configuredCollectionRoutes.viewCollection;
  exp.dropIndex = configuredCollectionRoutes.dropIndex;
  exp.reIndex = configuredCollectionRoutes.reIndex;
  exp.addIndex = configuredCollectionRoutes.addIndex;

  exp.getProperty = configuredDocumentRoutes.getProperty;
  exp.addDocument = configuredDocumentRoutes.addDocument;
  exp.checkValid = configuredDocumentRoutes.checkValid;
  exp.deleteDocument = configuredDocumentRoutes.deleteDocument;
  exp.updateDocument = configuredDocumentRoutes.updateDocument;
  exp.viewDocument = configuredDocumentRoutes.viewDocument;

  exp.addBucket = configuredGridFSRoute.addBucket;
  exp.deleteBucket = configuredGridFSRoute.deleteBucket;
  exp.viewBucket = configuredGridFSRoute.viewBucket;
  exp.addFile = configuredGridFSRoute.addFile;
  exp.getFile = configuredGridFSRoute.getFile;
  exp.deleteFile = configuredGridFSRoute.deleteFile;

  // Homepage route
  exp.index = function (req, res) {
    const ctx = {
      title: 'Mongo Express',
      info: false,
    };

    if (typeof req.adminDb === 'undefined') {
      return res.render('index');
    }

    req.adminDb.serverStatus((err, info) => {
      if (err) {
        // TODO: handle error
        console.error(err);
      }

      ctx.info = info;
      res.render('index', ctx);
    });
  };

  return exp;
};
