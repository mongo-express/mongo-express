var utils = require('../utils');


//view all entries in a collection
exports.viewCollection = function(req, res, next) {
  var query_options = {
    limit: 20,
    skip: 0
  };

  req.collection.find({}, query_options).toArray(function(err, items) {
    req.collection.stats(function(err, stats) {
      var ctx = {
        title: 'Viewing Collection: ' + req.collectionName,
        documents: items,
        stats: stats
      };

      res.render('collection', ctx);
    });
  });
};


exports.addCollection = function(req, res, next) {
};


exports.deleteCollection = function(req, res, next) {
  req.collection.drop(function(err, result) {
    if (err) {
      //TODO: handle error
      console.error(err);
    }

    //If delete was successful, result === true

    req.updateCollections(req.db, req.dbName, function(err) {
      if (err) {
        //TODO: handle error
        console.error(err);
      }

      res.redirect('/db/' + req.dbName);
    });
  });
};
