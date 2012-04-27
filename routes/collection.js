//view all entries in a collection
exports.collection = function(req, res, next) {
  var db = req.db;
  var collection_name = req.params.collection;

  var getCollection = function() {
    //remove database prefix from collection name
    //TODO: refactor this into a helper function
    var coll_parts = collection_name.split('.');
    coll_parts.splice(0,1);
    var coll_name = coll_parts.join('.');

    //get documents from the collection
    db.collection(coll_name, function(err, collection) {
      if (err) {
        //TODO: handle error
        console.error(err);
      }

      var query_options = {
        limit: 20,
        skip: 0
      };

      collection.find({}, query_options).toArray(function(err, items) {
        var ctx = {
          title: 'Viewing Collection: ' + collection_name,
          collection: collection_name,
          documents: items
        };

        res.render('collection', ctx);
      });
    });
  };

  //Check if collection name is in list of collections
  for (var key in req.collections) {
    if (req.collections[key].name == collection_name) {
      return getCollection();
    }
  }

  var found = false;
  //Check if collection is in db
  db.collectionNames(function(err, names) {
    if (err) {
      //TODO: handle error
      console.error(err);
    }

    for (var key in names) {
      if (names[key].name == collection_name) {
        req.updateCollections(names);
        getCollection();
        found = true;
        return;
      }
    }

    if (found === false) {
      //TODO: show error page for non-existent collection
      next();
    }
  });
};
