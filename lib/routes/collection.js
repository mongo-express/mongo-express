'use strict';

var _     = require('underscore');
var bson  = require('../bson');
var os    = require('os');
var utils = require('../utils');

var routes = function (config) {
  var exp = {};

  //view all entries in a collection
  exp.viewCollection = function (req, res) {

    req.query = req.query || {}; // might not be present in Express5

    var limit = config.options.documentsPerPage;
    var skip = parseInt(req.query.skip, 10) || 0;
    var sort = req.query.sort || {};

    for (var i in sort) {
      sort[i] = parseInt(sort[i], 10);
    }

    var query_options = {
      sort:   sort,
      limit:  limit,
      skip:   skip,
    };

    // some query filter
    var query           = {};
    var projection      = {};
    var key             = req.query.key         || '';
    var value           = req.query.value       || '';
    var type            = req.query.type        || '';
    var jsonQuery       = req.query.query       || '';
    var jsonProjection  = req.query.projection  || '';
    var dbName          = req.params.database;
    var collectionName  = req.params.collection;
    var defaultKey = (config.defaultKeyNames && config.defaultKeyNames[dbName] && config.defaultKeyNames[dbName][collectionName]) ?
      config.defaultKeyNames[dbName][collectionName] :
      '_id';
    var edKey = function (doc, defaultKey) {
      var defaultKeyAsArray = defaultKey.split('.');
      var val = doc;
      for (var i = 0; i < defaultKeyAsArray.length; i++) {
        if (val[defaultKeyAsArray[i]]) {
          val = val[defaultKeyAsArray[i]];
        }
      }

      return val;
    };

    if (key && value) {
      // If type == J, convert value as json document
      if (type.toUpperCase() === 'J') {
        value = JSON.parse(req.query.value);
      }

      // If type == N, convert value to Number
      if (type.toUpperCase() === 'N') {
        value = Number(req.query.value);
      }

      // If type == O, convert value to ObjectID
      // TODO: Add ObjectID validation to prevent error messages.
      if (type.toUpperCase() === 'O') {
        // Basic validation
        // Check we have ObjectID() wrapper
        if (
          req.query.value.toUpperCase().indexOf('OBJECTID(') === -1 ||   // missing the opening 'ObjectID('
          req.query.value.indexOf(')') === -1                            // missing the closing '('
        ) {
          req.session.error = 'ObjectID(...) wrapper must be present';
          return res.redirect('back');
        }

        value = bson.toObjectId(req.query.value);
        if (!value) {
          req.session.error = 'ObjectID is invalid';
          return res.redirect('back');
        }
      }

      if (type.toUpperCase() === 'R') {
        query[key] = new RegExp(req.query.value, 'i');
      } else {
        query[key] = value;
      }

    } else if (jsonQuery) {
      query = bson.toSafeBSON(jsonQuery);
      if (query === null) {
        req.session.error = 'Query entered is not valid';
        return res.redirect('back');
      }

      if (jsonProjection) {
        projection = bson.toSafeBSON(jsonProjection) || {};
      }
    } else {
      query = {};
    }

    req.collection.find(query, projection, query_options).toArray(function (err, items) {
      req.collection.stats(function (err, stats) {
        req.collection.count(query, null, function (err, count) {

          //Pagination
          //Have to do this here, swig template doesn't allow any calculations :(
          var prev;
          var prev2;
          var here;
          var next2;
          var next;
          var last;
          var pagination;

          prev = {
            page: Math.round((skip - limit) / limit) + 1,
            skip: skip - limit,
          };
          prev2 = {
            page: Math.round((skip - limit * 2) / limit) + 1,
            skip: skip - limit * 2,
          };
          next2 = {
            page: Math.round((skip + limit * 2) / limit) + 1,
            skip: skip + limit * 2,
          };
          next = {
            page: Math.round((skip + limit) / limit) + 1,
            skip: skip + limit,
          };
          here = Math.round(skip / limit) + 1;
          last = (Math.ceil(count / limit) - 1) * limit;
          pagination = count > limit;

          var docs    = [];
          var columns = [];

          for (var i in items) {

            // Prep items with stubs so as not to send large info down the wire
            for (let prop in items[i]) {
              if (utils.roughSizeOfObject(items[i][prop]) > config.options.maxPropSize) {
                items[i][prop] = {
                  attribu: prop,
                  display: '*** LARGE PROPERTY ***',
                  humanSz: utils.bytesToSize(utils.roughSizeOfObject(items[i][prop])),
                  maxSize: utils.bytesToSize(config.options.maxPropSize),
                  preview: JSON.stringify(items[i][prop]).substr(0, 25),
                  roughSz: utils.roughSizeOfObject(items[i][prop]),
                  _id: items[i]._id,
                };
              }
            }

            // If after prepping the row is still too big
            if (utils.roughSizeOfObject(items[i]) > config.options.maxRowSize) {
              for (let prop in items[i]) {
                if (prop !== '_id' && utils.roughSizeOfObject(items[i][prop]) > 200) {
                  items[i][prop] = {
                    attribu: prop,
                    display: '*** LARGE ROW ***',
                    humanSz: utils.bytesToSize(utils.roughSizeOfObject(items[i][prop])),
                    maxSize: utils.bytesToSize(config.options.maxRowSize),
                    preview: JSON.stringify(items[i][prop]).substr(0, 25),
                    roughSz: utils.roughSizeOfObject(items[i][prop]),
                    _id: items[i]._id,
                  };
                }
              }
            }

            docs[i] = items[i];
            columns.push(Object.keys(items[i]));
            items[i] = bson.toString(items[i]);
          }

          // Generate an array of columns used by all documents visible on this page
          columns = _.uniq(_.flatten(columns));

          var ctx = {
            title: 'Viewing Collection: ' + req.collectionName,
            documents: items, // Docs converted to strings
            docs: docs,       // Original docs
            columns: columns, // All used columns
            stats: stats,
            editorTheme: config.options.editorTheme,
            limit: limit,
            skip: skip,
            sort: sort,
            prev: prev,
            prev2: prev2,
            next2: next2,
            next: next,
            here: here,
            last: last,
            pagination: pagination,
            key: key,
            value: value,
            type: type,
            query: jsonQuery,
            projection: jsonProjection,
            defaultKey: defaultKey,
            edKey: edKey,
            collapsibleJSON: config.options.collapsibleJSON,
            collapsibleJSONDefaultUnfold: config.options.collapsibleJSONDefaultUnfold,
          };

          res.render('collection', ctx);
        });
      });
    });
  };

  exp.compactCollection = function (req, res) {
    req.db.command({ compact: req.collectionName }, function (err) {
      if (err) {
        req.session.error = 'Error: ' + err;
        return res.redirect('back');
      }

      req.session.success = 'Collection compacted!';
      return res.redirect('back');
    });
  };

  exp.exportCollection = function (req, res) {
    req.collection.find().toArray(function (err, items) {
      res.setHeader('Content-disposition', 'attachment; filename=' + req.collectionName + '.json');
      res.setHeader('Content-type', 'application/json');
      var aItems = [];
      for (var i in items) {
        var docStr = bson.toJsonString(items[i]);
        aItems.push(docStr);
      }

      res.write(aItems.join(os.EOL));
      res.end();
    });
  };

  exp.exportColArray = function (req, res) {
    req.collection.find().toArray(function (err, items) {
      res.setHeader('Content-disposition', 'attachment; filename=' + req.collectionName + '.json');
      res.setHeader('Content-type', 'application/json');
      res.write(bson.toJsonString(items));
      res.end();
    });
  };

  exp.addCollection = function (req, res) {
    var name = req.body.collection;

    if (name === undefined || name.length === 0) {
      req.session.error = 'You forgot to enter a collection name!';
      return res.redirect('back');
    }

    //Collection names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
    if (!name.match(/^[a-zA-Z_][a-zA-Z0-9\._]*$/)) {
      req.session.error = 'That collection name is invalid.';
      return res.redirect('back');
    }

    req.db.createCollection(name, function (err) {
      if (err) {
        req.session.error = 'Something went wrong: ' + err;
        console.error(err);
        return res.redirect('back');
      }

      req.updateCollections(req.db, req.dbName, function () {
        req.session.success = 'Collection created!';
        res.redirect(res.locals.baseHref + 'db/' + req.dbName + '/' + name);
      });
    });
  };

  exp.deleteCollection = function (req, res) {
    req.collection.drop(function (err) {
      if (err) {
        req.session.error = 'Something went wrong: ' + err;
        console.error(err);
        return res.redirect('back');
      }

      //If delete was successful, result === true

      req.updateCollections(req.db, req.dbName, function (err) {
        if (err) {
          req.session.error = 'Something went wrong: ' + err;
          console.error(err);
          return res.redirect('back');
        }

        req.session.success = 'Collection  "' + req.collectionName + '" deleted!';
        res.redirect(res.locals.baseHref + 'db/' + req.dbName);
      });
    });
  };

  exp.renameCollection = function (req, res) {
    var name = req.body.collection;

    if (name === undefined || name.length === 0) {
      req.session.error = 'You forgot to enter a collection name!';
      return res.redirect('back');
    }

    //Collection names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
    if (!name.match(/^[a-zA-Z_][a-zA-Z0-9\._]*$/)) {
      req.session.error = 'That collection name is invalid.';
      return res.redirect('back');
    }

    req.collection.rename(name, function (err) {
      if (err) {
        req.session.error = 'Something went wrong: ' + err;
        console.error(err);
        return res.redirect('back');
      }

      req.updateCollections(req.db, req.dbName, function (err) {
        if (err) {
          req.session.error = 'Something went wrong: ' + err;
          return res.redirect('back');
        }

        req.session.success = 'Collection renamed!';
        res.redirect(res.locals.baseHref + 'db/' + req.dbName + '/' + name);
      });
    });
  };

  exp.updateCollections = function (req, res) {
    req.updateCollections(req.db, req.dbName, function (err) {
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
