'use strict';

//Add routes from other files
var
    database = require('./database'),
    collection = require('./collection'),
    document = require('./document');

var routes = function(config) {
  var exp = {};

  exp.viewDatabase = database(config).viewDatabase;
  exp.updateCollections = database(config).updateCollections;

  exp.viewCollection = collection(config).viewCollection;
  exp.addCollection = collection(config).addCollection;
  exp.deleteCollection = collection(config).deleteCollection;
  exp.renameCollection = collection(config).renameCollection;
  exp.exportCollection = collection(config).exportCollection;

  exp.viewDocument = document(config).viewDocument;
  exp.updateDocument = document(config).updateDocument;
  exp.deleteDocument = document(config).deleteDocument;
  exp.addDocument = document(config).addDocument;


  //Homepage route
  exp.index = function(req, res) {
    var ctx = {
      title: 'Mongo Express',
      info: false
    };

    if (typeof req.adminDb === 'undefined') {
      return res.render('index');
    }

    req.adminDb.serverStatus(function(err, info) {
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
