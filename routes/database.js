'use strict';

var utils = require('../utils');

var routes = function() {
  var exp = {};

  exp.viewDatabase = function(req, res) {

    req.db.stats(function(err, data){
      var ctx = {
      title: 'Viewing Database: ' + req.dbName,
      colls: req.collections[req.dbName],
      stats: {
        collections: data.collections,
        dataSize: utils.bytesToSize(data.dataSize),
        storageSize: utils.bytesToSize(data.storageSize),
        fileSize: utils.bytesToSize(data.fileSize)
      }
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
