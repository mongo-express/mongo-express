'use strict';

var _     = require('underscore');
var bson  = require('../bson');
var os    = require('os');
var utils = require('../utils');
var csv   = require('../csv');

var routes = function (config) {
  var exp = {};

  /*
   * Builds the Mongo query corresponding to the
   * Simple/Advanced parameters input.
   * Returns null if no query parameters were passed in request.
   */
  exp._buildMongoQuery = function (req) {
    var result = null;
    var key = req.query.key;
    var value = req.query.value;
    var type = req.query.type && req.query.type.toUpperCase();
    var jsonQuery = req.query.query;

    if (key && value) {
      // if it is a simple query,

      // 1. fist convert value to its actual type
      var converters = {
        // If type == J, convert value as json document
        J: function (value) {
          return JSON.parse(value);
        },
        // If type == N, convert value to number
        N: function (value) {
          return Number(value);
        },
        // If type == O, convert value to ObjectID
        O: function (value) {
          // Hex input
          var result = bson.hexToObjectId(value);

          if (!result) {
            // Basic validation
            // Check we have ObjectID() wrapper
            if (
              value.toUpperCase().indexOf('OBJECTID(') === -1 ||   // missing the opening 'ObjectID('
              value.indexOf(')') === -1                            // missing the closing '('
            ) {
              throw new Error('ObjectID(...) wrapper must be present');
              // req.session.error = 'ObjectID(...) wrapper must be present';
              // return res.redirect('back');
            }

            result = bson.toObjectId(value);
            if (!value) {
              throw new Error('ObjectID is invalid');
            }
          }
          return result;
        },
        // If type == R, convert to RegExp
        R: function (value) {
          return new RegExp(value, 'i');
        },
        // if type == S, no conversion done
        S: function (value) {
          return value;
        },
      };
      if (!converters[type]) {
        throw new Error('Invalid query type: ' + type);
      }
      value = converters[type](value);

      // 2. then set query to it
      result = {};
      result[key] = value;
    } else if (jsonQuery) {
      // if it is a complex query, take it as is;
      result = bson.toSafeBSON(jsonQuery);
      if (result === null) {
        throw new Error('Query entered is not valid');
      }
    }
    // otherwise leave as null;
    return result;
  };

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

    var query;
    try {
      // if no criteria were passed, return whole list
      query = exp._buildMongoQuery(req, res) || {};
    } catch (err) {
      req.session.error = err.message;
      return res.redirect('back');
    }

    var projection      = {};
    var jsonProjection  = req.query.projection  || '';
    if (jsonProjection) {
      projection = bson.toSafeBSON(jsonProjection) || {};
    }

    // determine default key
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

    req.collection.find(query, projection, query_options).toArray(function (err, items) {
      req.collection.stats(function (err, stats) {
        req.collection.indexes(function (err, indexes) {
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

            var indexSizes = stats.indexSizes;
            for (var n = 0, nn = indexes.length; n < nn; n++) {
              indexes[n].size = indexSizes[indexes[n].name];
            }


            // Generate an array of columns used by all documents visible on this page
            columns = _.uniq(_.flatten(columns));

            var ctx = {
              title: 'Viewing Collection: ' + req.collectionName,
              documents: items, // Docs converted to strings
              docs: docs,       // Original docs
              columns: columns, // All used columns
              count: count, // total number of docs returned by the query
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
              key: req.query.key,
              value: req.query.value,
              // value: type === 'O' ? ['ObjectID("', value, '")'].join('') : value,
              type: req.query.type,
              query: req.query.query,
              projection: jsonProjection,
              defaultKey: defaultKey,
              edKey: edKey,
              collapsibleJSON: config.options.collapsibleJSON,
              collapsibleJSONDefaultUnfold: config.options.collapsibleJSONDefaultUnfold,
              indexes: indexes,
            };

            res.render('collection', ctx);
          });
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

  exp.exportCsv = function (req, res) {
    req.collection.find().toArray(function (err, items) {
      res.setHeader('Content-disposition', 'attachment; filename=' + req.collectionName + '.csv');
      res.setHeader('Content-type', 'application/json');
      res.write(csv(items));
      res.end();
    });
  };

  exp.reIndex = function (req, res) {
    req.collection.reIndex(function (err) {
      if (err) {
        req.session.error = 'Error: ' + err;
        return res.redirect('back');
      }

      req.session.success = 'Index regenerated!';
      return res.redirect('back');
    });
  };

  exp.addCollection = function (req, res) {
    var name = req.body.collection;

    if (name === undefined || name.length === 0) {
      req.session.error = 'You forgot to enter a collection name!';
      return res.redirect('back');
    }

    // Collection names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
    if (!name.match(/^[a-zA-Z_][a-zA-Z0-9._]*$/)) {
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
    if (config.options.readOnly === true) {
      req.session.error = 'Error: config.options.readOnly is set to true';
      return res.redirect('back');
    }
    var query = exp._buildMongoQuery(req);
    if (query) {
      // we're just deleting some of the documents
      var deleteOptions = null;
      req.collection.deleteMany(query, deleteOptions, function (err, opRes) {
        if (err) {
          req.session.error = 'Something went wrong: ' + err;
          console.error(err);
          return res.redirect('back');
        }
        req.session.success = opRes.result.n + ' documents deleted from "' + req.collectionName + '"';
        res.redirect(res.locals.baseHref + 'db/' + req.dbName + '/' + req.collectionName);
      });
    } else {
      // no query means we're dropping the whole collection
      req.collection.drop(function (err) {
        if (err) {
          req.session.error = 'Something went wrong: ' + err;
          console.error(err);
          return res.redirect('back');
        }
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
    }
  };

  exp.renameCollection = function (req, res) {
    var name = req.body.collection;

    if (name === undefined || name.length === 0) {
      req.session.error = 'You forgot to enter a collection name!';
      return res.redirect('back');
    }

    //Collection names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
    if (!name.match(/^[a-zA-Z_][a-zA-Z0-9._]*$/)) {
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

  exp.dropIndex = function (req, res) {
    if (!req.query.name) {
      req.session.error = 'Error: missing name parameter';
      return res.redirect('back');
    }
    if (config.options.readOnly === true) {
      req.session.error = 'Error: config.options.readOnly is set to true';
      return res.redirect('back');
    }
    req.collection.dropIndex(req.query.name, function (err) {
      if (err) {
        req.session.error = 'Error: ' + err;
        return res.redirect('back');
      }

      req.session.success = 'Index deleted!';
      return res.redirect('back');
    });
  };

  return exp;
};

module.exports = routes;
