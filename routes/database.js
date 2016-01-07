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

  exp.viewDatabases = function(req, res) {

    var ctx = {
      title: 'Manage Databases',
      databases: req.databases
    }

    res.render( 'databases', ctx );   

  };

  exp.addDatabases = function(req, res) {

    var name = req.body.database;

    if (name === undefined || name.length === 0) {
      //TODO: handle error
      console.error( 'That database name is invalid.' );
      req.session.error = 'That database name is invalid.';
      return res.redirect('back');
    }

   //Database names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
    if (!name.match(/^[a-zA-Z_][a-zA-Z0-9\._]*$/)) {
      //TODO: handle error
      console.error( 'That database name is invalid.' );
      req.session.error = 'That database name is invalid.';
      return res.redirect('back');
    }

    var ndb = req.mainConn.db(name);
    ndb.createCollection("delete_me", function(err) {
      if( err ) {
        //TODO: handle error
        console.error( 'Could not create collection.' );
        req.session.error = 'Could not create collection.';
        return res.redirect('back');
      }
      ndb.dropCollection("delete_me", function( err ) {
        if( err ) {
          //TODO: handle error
          console.error( 'Could not delete collection.' );
          req.session.error = 'Could not delete collection.';
          return res.redirect('back');
        }
        res.redirect(res.locals.baseHref + 'dbs');
      });
    });

  };

  exp.deleteDatabases = function(req,res) {
    req.db.dropDatabase(function(err){
      if( err ) {
        //TODO: handle error
        console.error( 'Could not to delte database.' );
        req.session.error = 'Failed to delte database.';
        return res.redirect('back');
      }
      res.redirect(res.locals.baseHref + 'dbs');
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
