var config = require('../config');

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
        stats: stats,
        editorTheme: config.options.editorTheme
      };

      res.render('collection', ctx);
    });
  });
};


exports.addCollection = function(req, res, next) {
  var name = req.body.collection;

  if (name === undefined) {
    //TODO: handle error
    return res.redirect('back');
  }

  //Collection names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
  if (!name.match(/^[a-zA-Z_][a-zA-Z0-9\._]*$/)) {
    //TODO: handle error
    return res.redirect('back');
  }

  req.db.createCollection(name, function(err, collection) {
    if (err) {
      //TODO: handle error
      console.error(err);
    }

    req.updateCollections(req.db, req.dbName, function() {
      //TODO: use session flash to show success or error message
      res.redirect('/db/' + req.dbName + '/' + name);
    });
  });
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


exports.renameCollection = function(req, res, next) {
  var name = req.body.collection;

  if (name == undefined) {
    //TODO: handle error
    return res.redirect('back');
  }

  //Collection names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
  if (!name.match(/^[a-zA-Z_][a-zA-Z0-9\._]*$/)) {
    //TODO: handle error
    return res.redirect('back');
  }

  req.collection.rename(name, function(err, collection) {
    if (err) {
      //TODO: handle error
      console.error(err);
    }

    req.updateCollections(req.db, req.dbName, function() {
      res.redirect('/db/' + req.dbName + '/' + name);
    });
  });
};
