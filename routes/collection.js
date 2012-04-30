var utils = require('../utils');


//view all entries in a collection
exports.collection = function(req, res, next) {
  var query_options = {
    limit: 20,
    skip: 0
  };

  req.collection.find({}, query_options).toArray(function(err, items) {
    req.collection.stats(function(err, stats) {
      var ctx = {
        title: 'Viewing Collection: ' + req.collection_name,
        collection: req.collection_name,
        documents: items,
        stats: stats
      };

      res.render('collection', ctx);
    });
  });
};


exports.deleteCollection = function(req, res, next) {
  var db = req.db;
  var collection = req.params.collection;
  var collection_name = utils.parseCollectionName(collection);

  db.dropCollection(collection_name, function(err, result) {
    if (err) {
      //TODO: handle error
      console.error(err);
    }

    //If delete was successful, result === true

    //Update list of collections
    db.collectionNames(function(err, names) {
      if (err) {
        //TODO: handle error
        console.error(err);
      }

      req.updateCollections(names);

      res.redirect('/');
    });
  });
};
