import { Binary, BSON } from 'mongodb';
import * as bson from '../bson.js';
import * as utils from '../utils.js';
import csv from '../csv.js';

const { EJSON } = BSON;

const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/json',
]);

const converters = {
  // If type == J, convert value as json document
  J(value) {
    return JSON.parse(value);
  },
  // If type == N, convert value to number
  // eslint-disable-next-line unicorn/prefer-native-coercion-functions
  N(value) {
    return Number(value);
  },
  // If type == O, convert value to ObjectId
  O(value) {
    return bson.parseObjectId(value);
  },
  // If type == R, convert to RegExp
  R(value) {
    return new RegExp(value, 'i');
  },
  U(value) {
    return new Binary(Buffer.from(value.replaceAll('-', ''), 'hex'), Binary.SUBTYPE_UUID);
  },
  // if type == S, no conversion done
  S(value) {
    return value;
  },
};

const routes = function (config) {
  const exp = {};

  /*
   * Builds the Mongo query corresponding to the
   * Simple/Advanced parameters input.
   * Returns {} if no query parameters were passed in request.
   */
  exp._getQuery = function (req) {
    const { key } = req.query;
    let { value } = req.query;
    if (key && value) {
      // if it is a simple query

      // 1. fist convert value to its actual type
      const type = req.query.type?.toUpperCase();
      if (!(type in converters)) {
        throw new Error('Invalid query type: ' + type);
      }
      value = converters[type](value);

      // 2. then set query to it
      return { [key]: value };
    }
    const { query: jsonQuery } = req.query;
    if (jsonQuery) {
      // if it is a complex query, take it as is;
      const result = bson.toSafeBSON(jsonQuery);
      if (result === null) {
        throw new Error('Query entered is not valid');
      }
      return result;
    }
    return {};
  };

  exp._getSort = function (req) {
    const { sort } = req.query;
    if (sort) {
      const outSort = {};
      for (const i in sort) {
        outSort[i] = Number.parseInt(sort[i], 10);
      }
      return outSort;
    }
    return {};
  };

  exp._getProjection = function (req) {
    const { projection } = req.query;
    if (projection) {
      return bson.toSafeBSON(projection) ?? {};
    }
    return {};
  };

  exp._getQueryOptions = function (req) {
    return {
      sort: exp._getSort(req),
      limit: config.options.documentsPerPage,
      skip: Number.parseInt(req.query.skip, 10) || 0,
      projection: exp._getProjection(req),
    };
  };

  exp._getAggregatePipeline = function (pipeline, queryOptions) {
    // https://stackoverflow.com/a/48307554/10413113
    return [
      ...pipeline,
      ...(Object.keys(queryOptions.sort).length > 0) ? [{
        $sort: queryOptions.sort,
      }] : [],
      {
        $facet: {
          count: [{ $count: 'count' }],
          items: [
            { $skip: queryOptions.skip },
            { $limit: queryOptions.limit + queryOptions.skip },
            ...(Object.keys(queryOptions.projection).length > 0) ? [{
              $project: queryOptions.projection,
            }] : [],
          ],
        },
      },
    ];
  };

  exp._getItemsAndCount = async function (req, queryOptions) {
    let query = exp._getQuery(req);
    if (req.query.runAggregate === 'on' && query.constructor.name === 'Array') {
      if (query.length > 0) {
        const queryAggregate = exp._getAggregatePipeline(query, queryOptions);
        const [resultArray] = await req.collection.aggregate(queryAggregate, { allowDiskUse: config.mongodb.allowDiskUse }).toArray();
        const { items, count } = resultArray;
        return {
          items,
          count: count.at(0)?.count,
        };
      }
      query = {};
    }

    if (config.mongodb.allowDiskUse && !config.mongodb.awsDocumentDb) {
      queryOptions.allowDiskUse = true;
    }

    const [items, count] = await Promise.all([
      req.collection.find(query, queryOptions).toArray(),
      req.collection.count(query),
    ]);
    return {
      items,
      count,
    };
  };

  // view all entries in a collection
  exp.viewCollection = async function (req, res) {
    try {
      const queryOptions = exp._getQueryOptions(req);
      const { items, count } = await exp._getItemsAndCount(req, queryOptions);

      let stats;
      let indexes;
      if (config.mongodb.admin === true && !config.mongodb.awsDocumentDb) {
        [stats, indexes] = await Promise.all([
          req.collection.aggregate([{ $collStats: { storageStats: {} } }]).next().then((s) => s.storageStats),
          req.collection.indexes(),
        ]);

        const { indexSizes } = stats;
        for (let n = 0, nn = indexes.length; n < nn; n++) {
          indexes[n].size = indexSizes[indexes[n].name];
        }
      } else {
        stats = false;
      }

      const docs = [];
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
              preview: JSON.stringify(items[i][prop]).slice(0, 25),
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
                preview: JSON.stringify(items[i][prop]).slice(0, 25),
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
      columns = columns.flat()
        .filter((value, index, arr) => arr.indexOf(value) === index);  // Remove duplicates

      // Pagination
      const { limit, skip, sort } = queryOptions;
      const pagination = count > limit;

      const ctx = {
        title: 'Viewing Collection: ' + req.collectionName,
        csrfToken: req.csrfToken(),
        documents: items, // Docs converted to strings
        docs,       // Original docs
        columns, // All used columns
        count, // total number of docs returned by the query
        stats,
        limit,
        skip,
        sort,
        pagination,
        key: req.query.key,
        value: req.query.value,
        // value: type === 'O' ? ['ObjectId("', value, '")'].join('') : value,
        type: req.query.type,
        query: req.query.query,
        projection: req.query.projection,
        runAggregate: req.query.runAggregate === 'on',
        indexes,
      };

      res.render('collection', ctx);
    } catch (error) {
      req.session.error = error.message;
      console.error(error);
      res.redirect('back');
    }
  };

  exp.compactCollection = async function (req, res) {
    await req.db.command({ compact: req.collectionName }).then(() => {
      req.session.success = 'Collection compacted!';
    }).catch((error) => {
      req.session.error = 'Error: ' + error;
      console.error(error);
    });
    res.redirect('back');
  };

  exp.exportCollection = async function (req, res) {
    try {
      const query = exp._getQuery(req);
      const queryOptions = {
        sort: exp._getSort(req),
        projection: exp._getProjection(req),
      };
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="' + encodeURI(req.collectionName) + '.json"; filename*=UTF-8\'\'' + encodeURI(req.collectionName)
        + '.json',
      );
      res.setHeader('Content-Type', 'application/json');
      await req.collection.find(query, queryOptions).stream({
        transform(item) {
          return bson.toJsonString(item);
        },
      }).pipe(res);
    } catch (error) {
      req.session.error = error.message;
      console.error(error);
      return res.redirect('back');
    }
  };

  exp.exportColArray = async function (req, res) {
    try {
      const query = exp._getQuery(req);
      const queryOptions = {
        sort: exp._getSort(req),
        projection: exp._getProjection(req),
      };
      await req.collection.find(query, queryOptions).toArray().then((items) => {
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="' + encodeURI(req.collectionName) + '.json"; filename*=UTF-8\'\'' + encodeURI(req.collectionName)
          + '.json',
        );
        res.setHeader('Content-Type', 'application/json');
        res.write(bson.toJsonString(items));
        res.end();
      });
    } catch (error) {
      req.session.error = error.message;
      console.error(error);
      return res.redirect('back');
    }
  };

  exp.exportCsv = async function (req, res) {
    try {
      const query = exp._getQuery(req);
      const queryOptions = {
        sort: exp._getSort(req),
        projection: exp._getProjection(req),
      };
      await req.collection.find(query, queryOptions).toArray().then((items) => {
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="' + encodeURI(req.collectionName) + '.csv"; filename*=UTF-8\'\'' + encodeURI(req.collectionName)
          + '.csv',
        );
        res.setHeader('Content-Type', 'text/csv');
        res.write(csv(items));
        res.end();
      });
    } catch (error) {
      req.session.error = error.message;
      console.error(error);
      return res.redirect('back');
    }
  };

  exp.reIndex = async function (req, res) {
    if (typeof req.collection.reIndex === 'function') {
      await req.collection.reIndex().then(() => {
        req.session.success = 'Index regenerated!';
      }).catch((error) => {
        req.session.error = 'Error: ' + error;
        console.error(error);
      });
    } else {
      req.session.error = 'Reindex not found!';
    }

    res.redirect('back');
  };

  exp.addIndex = async function (req, res) {
    const doc = req.body.index;

    if (doc === undefined || doc.length === 0) {
      req.session.error = 'You forgot to enter a index!';
      return res.redirect('back');
    }

    let docBSON;

    try {
      docBSON = bson.toBSON(doc);
    } catch (error) {
      req.session.error = 'JSON is not valid!';
      console.error(error);
      return res.redirect('back');
    }

    await req.collection.createIndex(docBSON).then(() => {
      req.session.success = 'Index created!';
      res.redirect(utils.buildCollectionURL(res.locals.baseHref, req.dbName, req.collectionName));
    }).catch((error) => {
      req.session.error = 'Something went wrong: ' + error;
      console.error(error);
      res.redirect('back');
    });
  };

  exp.addCollection = async function (req, res) {
    const name = req.body.collection;

    const validation = utils.validateCollectionName(name);
    if (validation.error) {
      req.session.error = validation.message;
      return res.redirect('back');
    }

    await req.db.createCollection(name).then(async () => {
      await req.updateCollections(req.dbConnection);
      req.session.success = 'Collection created!';
      res.redirect(utils.buildCollectionURL(res.locals.baseHref, req.dbName, name));
    }).catch((error) => {
      req.session.error = 'Something went wrong: ' + error;
      console.error(error);
      res.redirect('back');
    });
  };

  exp.deleteCollection = async function (req, res) {
    if (config.options.readOnly === true) {
      req.session.error = 'Error: config.options.readOnly is set to true';
      return res.redirect('back');
    }
    if (config.options.noDelete === true) {
      req.session.error = 'Error: config.options.noDelete is set to true';
      return res.redirect('back');
    }
    try {
      if (req.query.query) {
        const query = exp._getQuery(req);
        // we're just deleting some of the documents
        await req.collection.deleteMany(query).then((opRes) => {
          req.session.success = opRes.deletedCount + ' documents deleted from "' + req.collectionName + '"';
          res.redirect(res.locals.baseHref + 'db/' + req.dbName + '/' + req.collectionName);
        });
      } else {
        // no query means we're dropping the whole collection
        await req.collection.drop();
        await req.updateCollections(req.dbConnection);
        req.session.success = 'Collection  "' + req.collectionName + '" deleted!';
        res.redirect(res.locals.baseHref + 'db/' + req.dbName);
      }
    } catch (error) {
      req.session.error = 'Something went wrong: ' + error;
      console.error(error);
      res.redirect('back');
    }
  };

  exp.renameCollection = async function (req, res) {
    const name = req.body.collection;

    const validation = utils.validateCollectionName(name);
    if (validation.error) {
      req.session.error = validation.message;
      return res.redirect('back');
    }

    try {
      await req.collection.rename(name);
      await req.updateCollections(req.dbConnection);
      req.session.success = 'Collection renamed!';
      res.redirect(utils.buildCollectionURL(res.locals.baseHref, req.dbName, name));
    } catch (error) {
      req.session.error = 'Something went wrong: ' + error;
      console.error(error);
      res.redirect('back');
    }
  };

  exp.updateCollections = async function (req, res) {
    await req.updateCollections(req.dbConnection).then(() => {
      req.session.success = 'Collections Updated!';
      res.redirect(res.locals.baseHref + 'db/' + req.dbName);
    }).catch((error) => {
      req.session.error = 'Something went wrong: ' + error;
      console.error(error);
      res.redirect('back');
    });
  };

  exp.dropIndex = async function (req, res) {
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
    await req.collection.dropIndex(req.query.name).then(() => {
      req.session.success = 'Index deleted!';
    }).catch((error) => {
      req.session.error = 'Error: ' + error;
      console.error(error);
    });

    res.redirect('back');
  };

  exp.importCollection = async function (req, res) {
    if (!req.files) {
      return res.status(400).send('Missing file');
    }

    const files = Object.values(req.files);

    const areInvalidFiles = files.some((file) => !ALLOWED_MIME_TYPES.has(file.mimetype)
      || !file.data
      || !file.data.toString);
    if (areInvalidFiles) {
      return res.status(400).send('Bad file');
    }

    const docs = [];

    for (const file of files) {
      const fileContent = file.data.toString('utf8');
      const lines = fileContent.split('\n').map((line) => line.trim()).filter(Boolean);
      for (const line of lines) {
        try {
          const parsedData = EJSON.parse(line);
          docs.push(...parsedData);
        } catch (error) {
          console.error(error);
          return res.status(400).send('Bad file content');
        }
      }
    }
    await req.collection.insertMany(docs).then((stats) => {
      res.status(200).send(`${stats.insertedCount} document(s) inserted`);
    }).catch((error) => {
      console.error(error);
      res.status(500).send('Server error');
    });
  };

  return exp;
};

export default routes;
