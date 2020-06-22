'use strict';

const _     = require('lodash');
const Bluebird = require('bluebird');
const bson  = require('../bson');
const os    = require('os');
const utils = require('../utils');
const csv   = require('../csv');

const buildCollectionURL = utils.buildCollectionURL;

var routes = function (config) {
  var exp = {};

  function validateCollectionName(name) {
    if (name === undefined || name.length === 0) {
      return { error: true, message: 'You forgot to enter a collection name!' };
    }

    // Collection names must begin with a letter, underscore, hyphen or slash, (tested v3.2.4)
    // and can contain only letters, underscores, hyphens, numbers, dots or slashes
    if (!name.match(/^[a-zA-Z_/-][a-zA-Z0-9._/-]*$/)) {
      return { error: true, message: 'That collection name is invalid.' };
    }
    return { error: false };
  }

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
          return bson.parseObjectId(value);
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

  exp._getSort = function (req) {
    var sort = req.query.sort || {};

    for (var i in sort) {
      sort[i] = parseInt(sort[i], 10);
    }

    return sort;
  };

  exp._getQueryOptions = function (req) {
    var limit = config.options.documentsPerPage;
    var skip = parseInt(req.query.skip, 10) || 0;
    var sort = exp._getSort(req);

    var query_options = {
      sort:   sort,
      limit:  limit,
      skip:   skip,
    };
    return query_options;
  };

  exp._getProjection = function (req) {
    var projection      = {};
    var jsonProjection  = req.query.projection  || '';
    if (jsonProjection) {
      projection = bson.toSafeBSON(jsonProjection) || {};
    }
    return projection;
  };

  exp._getQuery = function (req, res) {
    return exp._buildMongoQuery(req, res) || {};
  };

  //view all entries in a collection
  exp.viewCollection = function (req, res) {
    req.query = req.query || {}; // might not be present in Express5

    var query;
    var query_options;
    var projection;
    try {
      query = exp._getQuery(req, res);
      query_options = exp._getQueryOptions(req);
      projection = exp._getProjection(req, res);
    } catch (err) {
      req.session.error = err.message;
      return res.redirect('back');
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

    var skip = query_options.skip;
    var limit = query_options.limit;
    var sort = query_options.sort;

    req.collection.find(query, projection, query_options).toArray(function (err, items) {
      req.collection.stats(function (err, stats) {
        if (stats === undefined) {
          req.session.error = 'Collection not found!';
          return res.redirect('back');
        }
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
              projection: req.query.projection,
              defaultKey: defaultKey,
              edKey: edKey,
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
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="' + encodeURI(req.collectionName) + '"; filename*=UTF-8\'\'' + encodeURI(req.collectionName)
    );
    res.setHeader('Content-Type', 'application/json');

    var query;
    var query_options;
    var projection;

    try {
      query_options = {
        sort: exp._getSort(req),
      };
      query = exp._getQuery(req, res);
      projection = exp._getProjection(req, res);
    } catch (err) {
      req.session.error = err.message;
      return res.redirect('back');
    }

    req.collection.find(query, projection, query_options).stream({
      transform: function (item) {
        return bson.toJsonString(item) + os.EOL;
      },
    }).pipe(res);
  };

  exp.exportColArray = function (req, res) {
    var query;
    var query_options;
    var projection;

    try {
      query_options = {
        sort: exp._getSort(req),
      };
      query = exp._getQuery(req, res);
      projection = exp._getProjection(req, res);
    } catch (err) {
      req.session.error = err.message;
      return res.redirect('back');
    }

    req.collection.find(query, projection, query_options).toArray(function (err, items) {
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="' + encodeURI(req.collectionName) + '"; filename*=UTF-8\'\'' + encodeURI(req.collectionName)
      );
      res.setHeader('Content-Type', 'application/json');
      res.write(bson.toJsonString(items));
      res.end();
    });
  };

  exp.exportCsv = function (req, res) {
    var query;
    var query_options;
    var projection;

    try {
      query_options = {
        sort: exp._getSort(req),
      };
      query = exp._getQuery(req, res);
      projection = exp._getProjection(req, res);
    } catch (err) {
      req.session.error = err.message;
      return res.redirect('back');
    }

    req.collection.find(query, projection, query_options).toArray(function (err, items) {
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="' + encodeURI(req.collectionName) + '.csv"; filename*=UTF-8\'\'' + encodeURI(req.collectionName)
        + '.csv'
      );
      res.setHeader('Content-Type', 'text/csv');
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

  exp.addIndex = function (req, res) {
    var doc = req.body.index;

    if (doc === undefined || doc.length === 0) {
      req.session.error = 'You forgot to enter a index!';
      return res.redirect('back');
    }

    var docBSON;

    try {
      docBSON = bson.toBSON(doc);
    } catch (err) {
      req.session.error = 'JSON is not valid!';
      console.error(err);
      return res.redirect('back');
    }

    req.collection.createIndex(docBSON, function (err) {
      if (err) {
        req.session.error = 'Something went wrong: ' + err;
        console.error(err);
        return res.redirect('back');
      }

      req.session.success = 'Index created!';
      res.redirect(buildCollectionURL(res.locals.baseHref, req.dbName, req.collectionName));
    });
  };

  exp.addCollection = function (req, res) {
    var name = req.body.collection;

    const validation = validateCollectionName(name);
    if (validation.error) {
      req.session.error = validation.message;
      return res.redirect('back');
    }

    req.db.createCollection(name, function (err) {
      if (err) {
        req.session.error = 'Something went wrong: ' + err;
        console.error(err);
        return res.redirect('back');
      }

      Bluebird.resolve(req.updateCollections(req.dbConnection)).asCallback(function () {
        req.session.success = 'Collection created!';
        res.redirect(buildCollectionURL(res.locals.baseHref, req.dbName, name));
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
        Bluebird.resolve(req.updateCollections(req.dbConnection)).asCallback(function (err) {
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

    const validation = validateCollectionName(name);
    if (validation.error) {
      req.session.error = validation.message;
      return res.redirect('back');
    }

    req.collection.rename(name, function (err) {
      if (err) {
        req.session.error = 'Something went wrong: ' + err;
        console.error(err);
        return res.redirect('back');
      }

      Bluebird.resolve(req.updateCollections(req.dbConnection)).asCallback(function (err) {
        if (err) {
          req.session.error = 'Something went wrong: ' + err;
          return res.redirect('back');
        }

        req.session.success = 'Collection renamed!';
        res.redirect(buildCollectionURL(res.locals.baseHref, req.dbName, name));
      });
    });
  };

  exp.updateCollections = function (req, res) {
    Bluebird.resolve(req.updateCollections(req.dbConnection)).asCallback(function (err) {
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

  exp.importCollection = function (req, res) {
    if (!req.files) {
      return res.status(400).send('Missing file');
    }

    const keys = Object.keys(req.files);

    if (keys.some(key => req.files[key].mimetype !== 'application/octet-stream' ||
      !req.files[key].data || !req.files[key].data.toString)) {
      return res.status(400).send('Bad file');
    }

    let docs = [];

    for (const key of keys) {
      const fileContent = req.files[key].data.toString('utf8');
      const str = `[${fileContent.replace(/}\s*\n\s*\{/gm, '},{').replace(/\{"\$oid":"(.+?)"}/gm, '"$1"')}]`;

      try {
        const arr = JSON.parse(str);
        docs = docs.concat(arr);
      } catch (err) {
        console.error(err);

        res.status(400).send('Bad file content');
        return;
      }
    }

    req.collection.insert(docs).then((stats) => {
      res.status(200).send(`${stats.result.n} document(s) inserted`);
    }).catch((err) => {
      console.error(err);

      res.status(500).send('Server error');
    });
  };

  return exp;
};

module.exports = routes;
