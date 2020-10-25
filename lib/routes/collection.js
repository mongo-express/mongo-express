'use strict';

const _     = require('lodash');
const Bluebird = require('bluebird');
const os    = require('os');
const bson  = require('../bson');
const utils = require('../utils');
const csv   = require('../csv');

const { buildCollectionURL } = utils;

const routes = function (config) {
  const exp = {};

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
    let result = null;
    const { key } = req.query;
    let { value } = req.query;
    const type = req.query.type && req.query.type.toUpperCase();
    const jsonQuery = req.query.query;

    if (key && value) {
      // if it is a simple query,

      // 1. fist convert value to its actual type
      const converters = {
        // If type == J, convert value as json document
        J(value) {
          return JSON.parse(value);
        },
        // If type == N, convert value to number
        N(value) {
          return Number(value);
        },
        // If type == O, convert value to ObjectID
        O(value) {
          return bson.parseObjectId(value);
        },
        // If type == R, convert to RegExp
        R(value) {
          return new RegExp(value, 'i');
        },
        // if type == S, no conversion done
        S(value) {
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
    const sort = req.query.sort || {};

    for (const i in sort) {
      sort[i] = parseInt(sort[i], 10);
    }

    return sort;
  };

  exp._getQueryOptions = function (req) {
    return {
      sort: exp._getSort(req),
      limit: config.options.documentsPerPage,
      skip: parseInt(req.query.skip, 10) || 0,
      projection: exp._getProjection(req),
    };
  };

  exp._getProjection = function (req) {
    let projection      = {};
    const jsonProjection  = req.query.projection  || '';
    if (jsonProjection) {
      projection = bson.toSafeBSON(jsonProjection) || {};
    }
    return projection;
  };

  exp._getQuery = function (req, res) {
    return exp._buildMongoQuery(req, res) || {};
  };

  // view all entries in a collection
  exp.viewCollection = function (req, res) {
    req.query = req.query || {}; // might not be present in Express5

    let query;
    let queryOptions;
    try {
      query = exp._getQuery(req, res);
      queryOptions = exp._getQueryOptions(req);
    } catch (err) {
      req.session.error = err.message;
      return res.redirect('back');
    }

    // determine default key
    const dbName          = req.params.database;
    const collectionName  = req.params.collection;
    const defaultKey = (config.defaultKeyNames && config.defaultKeyNames[dbName] && config.defaultKeyNames[dbName][collectionName])
      ? config.defaultKeyNames[dbName][collectionName]
      : '_id';
    const edKey = function (doc, defaultKey) {
      const defaultKeyAsArray = defaultKey.split('.');
      let val = doc;
      for (let i = 0; i < defaultKeyAsArray.length; i++) {
        if (val[defaultKeyAsArray[i]]) {
          val = val[defaultKeyAsArray[i]];
        }
      }
      return val;
    };

    const { skip } = queryOptions;
    const { limit } = queryOptions;
    const { sort } = queryOptions;

    req.collection.find(query, queryOptions).toArray(function (err, items) {
      req.collection.stats(function (err, stats) {
        if (stats === undefined) {
          req.session.error = 'Collection not found!';
          return res.redirect('back');
        }
        req.collection.indexes(function (err, indexes) {
          req.collection.count(query, null, function (err, count) {
            // Pagination
            // Have to do this here, swig template doesn't allow any calculations :(
            const prev = {
              page: Math.round((skip - limit) / limit) + 1,
              skip: skip - limit,
            };
            const prev2 = {
              page: Math.round((skip - limit * 2) / limit) + 1,
              skip: skip - limit * 2,
            };
            const next2 = {
              page: Math.round((skip + limit * 2) / limit) + 1,
              skip: skip + limit * 2,
            };
            const next = {
              page: Math.round((skip + limit) / limit) + 1,
              skip: skip + limit,
            };
            const here = Math.round(skip / limit) + 1;
            const last = (Math.ceil(count / limit) - 1) * limit;
            const pagination = count > limit;

            const docs    = [];
            let columns = [];

            for (const i in items) {
              // Prep items with stubs so as not to send large info down the wire
              for (const prop in items[i]) {
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
                for (const prop in items[i]) {
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

            const { indexSizes } = stats;
            for (let n = 0, nn = indexes.length; n < nn; n++) {
              indexes[n].size = indexSizes[indexes[n].name];
            }

            // Generate an array of columns used by all documents visible on this page
            columns = _.uniq(_.flatten(columns));

            const ctx = {
              title: 'Viewing Collection: ' + req.collectionName,
              documents: items, // Docs converted to strings
              docs,       // Original docs
              columns, // All used columns
              count, // total number of docs returned by the query
              stats,
              editorTheme: config.options.editorTheme,
              limit,
              skip,
              sort,
              prev,
              prev2,
              next2,
              next,
              here,
              last,
              pagination,
              key: req.query.key,
              value: req.query.value,
              // value: type === 'O' ? ['ObjectID("', value, '")'].join('') : value,
              type: req.query.type,
              query: req.query.query,
              projection: req.query.projection,
              defaultKey,
              edKey,
              indexes,
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
      'attachment; filename="' + encodeURI(req.collectionName) + '"; filename*=UTF-8\'\'' + encodeURI(req.collectionName),
    );
    res.setHeader('Content-Type', 'application/json');

    let query;
    let queryOptions;

    try {
      queryOptions = {
        sort: exp._getSort(req),
      };
      query = exp._getQuery(req, res);
    } catch (err) {
      req.session.error = err.message;
      return res.redirect('back');
    }

    req.collection.find(query, queryOptions).stream({
      transform(item) {
        return bson.toJsonString(item) + os.EOL;
      },
    }).pipe(res);
  };

  exp.exportColArray = function (req, res) {
    let query;
    let queryOptions;

    try {
      queryOptions = {
        sort: exp._getSort(req),
      };
      query = exp._getQuery(req, res);
    } catch (err) {
      req.session.error = err.message;
      return res.redirect('back');
    }

    req.collection.find(query, queryOptions).toArray(function (err, items) {
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="' + encodeURI(req.collectionName) + '"; filename*=UTF-8\'\'' + encodeURI(req.collectionName),
      );
      res.setHeader('Content-Type', 'application/json');
      res.write(bson.toJsonString(items));
      res.end();
    });
  };

  exp.exportCsv = function (req, res) {
    let query;
    let queryOptions;

    try {
      queryOptions = {
        sort: exp._getSort(req),
      };
      query = exp._getQuery(req, res);
    } catch (err) {
      req.session.error = err.message;
      return res.redirect('back');
    }

    req.collection.find(query, queryOptions).toArray(function (err, items) {
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="' + encodeURI(req.collectionName) + '.csv"; filename*=UTF-8\'\'' + encodeURI(req.collectionName)
        + '.csv',
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
    const doc = req.body.index;

    if (doc === undefined || doc.length === 0) {
      req.session.error = 'You forgot to enter a index!';
      return res.redirect('back');
    }

    let docBSON;

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
    const name = req.body.collection;

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
    if (config.options.noDelete === true) {
      req.session.error = 'Error: config.options.noDelete is set to true';
      return res.redirect('back');
    }
    const query = exp._buildMongoQuery(req);
    if (query) {
      // we're just deleting some of the documents
      const deleteOptions = null;
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
    const name = req.body.collection;

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
    if (config.options.noDelete === true) {
      req.session.error = 'Error: config.options.noDelete is set to true';
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

    if (keys.some((key) => req.files[key].mimetype !== 'application/octet-stream'
      || !req.files[key].data || !req.files[key].data.toString)) {
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
