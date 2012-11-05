var config = require('../config');
var bson = require('../bson');

//view all entries in a collection
exports.viewCollection = function(req, res, next) {
  //var limit = parseInt(req.params.limit, 10) || config.options.documentsPerPage;
  var limit = config.options.documentsPerPage;
  var skip = parseInt(req.query.skip, 10) || 0;
  var query_options = {
    limit: limit,
    skip: skip
  };

  // some query filter
  var query = {};
  var key = req.query.key || '';
  var value = req.query.value || '';
  var type = req.query.type || '';

  if (key && value) {
    if (type.toUpperCase() == 'N') {
      value = Number(req.query.value);
    }
    query[key] = value;
  } else {
    var query = {};
  }

  req.collection.find(query, query_options).toArray(function(err, items) {
    req.collection.stats(function(err, stats) {

      //Pagination
      //Have to do this here, swig template doesn't allow any calculations :(
      var prev, back2, here, next2, next, last;

      prev = {
        page: Math.round((skip - limit) / limit) + 1,
        skip: skip - limit
      };
      prev2 = {
        page: Math.round((skip - limit * 2) / limit) + 1,
        skip: skip - limit * 2
      };
      next2 = {
        page: Math.round((skip + limit * 2) / limit) + 1,
        skip: skip + limit * 2
      };
      next = {
        page: Math.round((skip + limit) / limit) + 1,
        skip: skip + limit
      };
      here = Math.round(skip / limit) + 1;
      last = (Math.ceil(stats.count / limit) - 1) * limit;

      var docs = [];

      for(var i in items) {
        docs[i] = items[i];
        items[i] = bson.toString(items[i]);
      }

      var ctx = {
        title: 'Viewing Collection: ' + req.collectionName,
        documents: items, //Docs converted to strings
        docs: docs, //Original docs
        stats: stats,
        editorTheme: config.options.editorTheme,
        limit: limit,
        skip: skip,
        prev: prev,
        prev2: prev2,
        next2: next2,
        next: next,
        here: here,
        last: last,
        key: key,
        value: value,
        type: type
      };

      res.render('collection', ctx);
    });
  });
};


exports.addCollection = function(req, res, next) {
  var name = req.body.collection;

  if (name === undefined || name.length == 0) {
    req.session.error = "You forgot to enter a collection name!";
    return res.redirect('back');
  }

  //Collection names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
  if (!name.match(/^[a-zA-Z_][a-zA-Z0-9\._]*$/)) {
    req.session.error = "That collection name is invalid.";
    return res.redirect('back');
  }

  req.db.createCollection(name, function(err, collection) {
    if (err) {
      req.session.error = "Something went wrong: " + err;
      console.error(err);
      return res.redirect('back');
    }

    req.updateCollections(req.db, req.dbName, function() {
      req.session.success = 'Collection created!';
      res.redirect('/db/' + req.dbName + '/' + name);
    });
  });
};


exports.deleteCollection = function(req, res, next) {
  req.collection.drop(function(err, result) {
    if (err) {
      req.session.error = "Something went wrong: " + err;
      console.error(err);
      return res.redirect('back');
    }

    //If delete was successful, result === true

    req.updateCollections(req.db, req.dbName, function(err) {
      if (err) {
        req.session.error = "Something went wrong: " + err;
        console.error(err);
        return res.redirect('back');
      }

      req.session.success = "Collection  '" + req.collectionName + "' deleted!";
      res.redirect('/db/' + req.dbName);
    });
  });
};


exports.renameCollection = function(req, res, next) {
  var name = req.body.collection;

  if (name == undefined || name.length == 0) {
    req.session.error = "You forgot to enter a collection name!";
    return res.redirect('back');
  }

  //Collection names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
  if (!name.match(/^[a-zA-Z_][a-zA-Z0-9\._]*$/)) {
    req.session.error = "That collection name is invalid.";
    return res.redirect('back');
  }

  req.collection.rename(name, function(err, collection) {
    if (err) {
      req.session.error('Something went wrong: ' + err);
      console.error(err);
      return res.redirect('back');
    }

    req.updateCollections(req.db, req.dbName, function(err) {
      if (err) {
        req.session.error('Something went wrong: ' + err);
        return res.redirect('back');
      }

      req.session.success('Collection renamed!');
      res.redirect('/db/' + req.dbName + '/' + name);
    });
  });
};
