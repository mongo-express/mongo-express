'use strict';

const Bluebird = require('bluebird');
const utils = require('../utils');

const routes = function () {
  const exp = {};

  exp.viewDatabase = function (req, res) {
    Bluebird.resolve(req.updateCollections(req.dbConnection)).asCallback(function (error) {
      if (error) {
        req.session.error = 'Could not refresh collections. ' + JSON.stringify(error);
        console.error(error);
        return res.redirect('back');
      }

      req.db.stats(function (error, data) {
        if (error) {
          req.session.error = 'Could not get stats. ' + JSON.stringify(error);
          console.error(error);
          return res.redirect('back');
        }

        const ctx = {
          title: 'Viewing Database: ' + req.dbName,
          databases: req.databases,
          colls: req.collections[req.dbName],
          grids: req.gridFSBuckets[req.dbName],
          stats: {
            avgObjSize: utils.bytesToSize(data.avgObjSize || 0),
            collections: data.collections,
            dataFileVersion: (data.dataFileVersion && data.dataFileVersion.major && data.dataFileVersion.minor
              ? data.dataFileVersion.major + '.' + data.dataFileVersion.minor
              : null),
            dataSize: utils.bytesToSize(data.dataSize),
            extentFreeListNum: (data.extentFreeList && data.extentFreeList.num ? data.extentFreeList.num : null),
            fileSize: (typeof data.fileSize !== 'undefined' ? utils.bytesToSize(data.fileSize) : null),
            indexes: data.indexes,
            indexSize: utils.bytesToSize(data.indexSize),
            numExtents: (data.numExtents ? data.numExtents.toString() : null),
            objects: data.objects,
            storageSize: utils.bytesToSize(data.storageSize),
          },
        };
        res.render('database', ctx);
      });
    });
  };

  exp.addDatabase = function (req, res) {
    const name = req.body.database;
    if (!utils.isValidDatabaseName(name)) {
      // TODO: handle error
      console.error('That database name is invalid.');
      req.session.error = 'That database name is invalid.';
      return res.redirect('back');
    }
    const ndb = req.mainClient.client.db(name);

    ndb.createCollection('delete_me', function (err) {
      if (err) {
        // TODO: handle error
        console.error('Could not create collection.');
        req.session.error = 'Could not create collection.';
        return res.redirect('back');
      }

      req.updateDatabases().then(() => res.redirect(res.locals.baseHref));

      // ndb.dropCollection('delete_me', function(err) {
      //   if (err) {
      //     //TODO: handle error
      //     console.error('Could not delete collection.');
      //     req.session.error = 'Could not delete collection.';
      //     return res.redirect('back');
      //   }
      //   res.redirect(res.locals.baseHref + 'db/' + name);
      // });
    });
  };

  exp.deleteDatabase = function (req, res) {
    req.db.dropDatabase(function (err) {
      if (err) {
        // TODO: handle error
        console.error('Could not to delete database.');
        req.session.error = 'Failed to delete database.';
        return res.redirect('back');
      }
      req.updateDatabases().then(() => res.redirect(res.locals.baseHref));
    });
  };

  return exp;
};

module.exports = routes;
