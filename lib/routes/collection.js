import { Binary, BSON } from 'mongodb';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as bson from '../bson.js';
import * as utils from '../utils.js';
import csv from '../csv.js';

const { EJSON } = BSON;

/**
 * A type attached to an upload is whatever the browser decided to send, so it is a hint rather
 * than a control: any client can set it to anything, and what actually decides the outcome is
 * whether the content parses. Gating on an allow-list only ever turned away real files — a
 * .json offered as text/plain or application/octet-stream, which several browsers do send.
 * These are named only so a CSV can be answered with something better than a parse failure.
 */
const CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/comma-separated-values',
]);

/**
 * Split a run of JSON values that sit next to each other, whether separated by newlines, as
 * mongoexport writes them, or by nothing at all, which is what this app's own export wrote
 * before #1225. Brackets are counted outside of strings, so punctuation inside a value never
 * splits it. Anything between two values other than whitespace means the file is not a run of
 * documents, and it is rejected rather than silently skipped.
 */
const splitAdjacentJsonValues = function (text) {
  const values = [];
  let depth = 0;
  let start = -1;
  let lastEnd = 0;
  let inString = false;
  let escaped = false;

  for (const [index, char] of [...text].entries()) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"' && depth > 0) {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      if (depth === 0) {
        if (text.slice(lastEnd, index).trim() !== '') {
          throw new SyntaxError('Unexpected content between documents');
        }
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === '}' || char === ']') {
      depth -= 1;

      if (depth < 0) {
        throw new SyntaxError('Unbalanced brackets');
      }

      if (depth === 0) {
        values.push(text.slice(start, index + 1));
        lastEnd = index + 1;
      }
    }
  }

  if (depth !== 0) {
    throw new SyntaxError('Unbalanced brackets');
  }

  if (text.slice(lastEnd).trim() !== '') {
    throw new SyntaxError('Unexpected trailing content');
  }

  return values;
};

/**
 * Import files arrive in more shapes than one document per line: an array from this app's own
 * array export, one document per line from mongoexport, a single document, an array
 * pretty-printed across many lines by Compass, and documents written back to back. Throws when
 * the content is not readable as documents, which the caller turns into a 400.
 */
const parseImportedDocuments = function (text) {
  const trimmed = text.trim();

  if (trimmed === '') {
    return [];
  }

  // Parsing the whole file first covers an array and a single document, and is the only thing
  // that reads a pretty-printed one, whose lines are fragments on their own.
  try {
    const parsed = EJSON.parse(trimmed);

    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Not a single JSON value, so read it as a run of adjacent ones below.
  }

  const docs = [];

  for (const value of splitAdjacentJsonValues(trimmed)) {
    const parsed = EJSON.parse(value);

    // Use push rather than spread: a large array would overflow the stack.
    if (Array.isArray(parsed)) {
      for (const doc of parsed) {
        docs.push(doc);
      }
    } else {
      docs.push(parsed);
    }
  }

  if (docs.length === 0) {
    throw new SyntaxError('No documents found');
  }

  return docs;
};

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
  // except when value looks like an ObjectId (24 hex chars) or a UUID:
  // match both the raw string and the typed BSON value so the user doesn't have to pick the type
  S(value) {
    // The 'extended' query parser turns ?value[a]=b into an object, so this is not
    // guaranteed to be a string; fall back to the previous pass-through behaviour.
    if (typeof value !== 'string') {
      return value;
    }
    if (/^[\da-f]{24}$/i.test(value)) {
      return { $in: [value, bson.parseObjectId(value)] };
    }
    if (/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)) {
      return { $in: [value, converters.U(value)] };
    }
    if (value.toLowerCase() === 'true') {
      return { $in: [value, true] };
    }
    if (value.toLowerCase() === 'false') {
      return { $in: [value, false] };
    }
    return value;
  },
};

/*
 * The Raw tab drives a collection method by name. Only the methods below can be reached:
 * anything else — including properties that are not methods, and inherited members — is
 * rejected, so a crafted command cannot walk into the driver's internals.
 *
 * The split matters because the Raw form submits over GET, which the readOnly/noDelete
 * middleware in router.js does not intercept. Without checking here, a raw deleteMany()
 * would sail straight past a readOnly instance.
 */
const RAW_READ_COMMANDS = new Set([
  'aggregate', 'countDocuments', 'distinct', 'estimatedDocumentCount', 'find', 'findOne',
]);
const RAW_WRITE_COMMANDS = new Set([
  'insertOne', 'insertMany', 'replaceOne', 'updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace',
]);
const RAW_DELETE_COMMANDS = new Set([
  'deleteOne', 'deleteMany', 'findOneAndDelete',
]);

const RAW_COMMAND_EXAMPLE = 'Example: updateOne({name: "a"}, {$set: {name: "b"}})';

// `name(arg, arg, ...)`. The argument list is captured whole and handed to the BSON parser,
// rather than split on commas — a naive split breaks any argument containing one.
const RAW_COMMAND_PATTERN = /^\s*([A-Za-z][A-Za-z\d]*)\s*\(([\S\s]*)\)\s*$/;

const routes = function (config) {
  // Redirect targets come from configuration, not from res.locals.baseHref: that is derived
  // from req.originalUrl, so feeding it to res.redirect hands the caller influence over
  // where other people get sent. CodeQL reports it as js/server-side-unvalidated-url-redirection.
  const baseHref = config.site.baseUrl || '/';

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
  /*
   * Run one allow-listed collection method from the Raw tab.
   *
   * Arguments are parsed with the same safe BSON parser the query box uses. The previous
   * implementation ran `eval()` over them, which made the command query parameter arbitrary
   * remote code execution.
   */
  exp._runRawCommand = async function (req, res) {
    const match = RAW_COMMAND_PATTERN.exec(req.query.command);

    if (!match) {
      req.session.error = 'Invalid command. ' + RAW_COMMAND_EXAMPLE;
      return res.redirect(req.get('Referrer') || '/');
    }

    const [, name, rawArguments] = match;

    if (!RAW_READ_COMMANDS.has(name) && !RAW_WRITE_COMMANDS.has(name) && !RAW_DELETE_COMMANDS.has(name)) {
      req.session.error = `Command not allowed: ${name}`;
      return res.redirect(req.get('Referrer') || '/');
    }

    if (config.options.readOnly === true && !RAW_READ_COMMANDS.has(name)) {
      req.session.error = 'Error: config.options.readOnly is set to true';
      return res.redirect(req.get('Referrer') || '/');
    }

    if (config.options.noDelete === true && RAW_DELETE_COMMANDS.has(name)) {
      req.session.error = 'Error: config.options.noDelete is set to true';
      return res.redirect(req.get('Referrer') || '/');
    }

    // Wrapping in brackets parses the whole argument list as one array, so nested documents
    // and commas inside them survive.
    const args = bson.toSafeBSON(`[${rawArguments}]`);

    if (args === null || !Array.isArray(args)) {
      req.session.error = 'Invalid command arguments. ' + RAW_COMMAND_EXAMPLE;
      return res.redirect(req.get('Referrer') || '/');
    }

    try {
      let result = await req.collection[name](...args);

      // find() and aggregate() hand back a cursor rather than documents.
      if (result && typeof result.toArray === 'function') {
        result = await result.toArray();
      }

      req.session.success = JSON.stringify(result, null, 2);
    } catch (error) {
      console.error(error);
      req.session.error = error.message;
    }

    return res.redirect(req.get('Referrer') || '/');
  };

  exp.viewCollection = async function (req, res) {
    if (req.query.command) {
      return exp._runRawCommand(req, res);
    }

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
        for (const index of indexes) {
          index.size = indexSizes[index.name];
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
        command: req.query.command,
        indexes,
      };

      res.render('collection', ctx);
    } catch (error) {
      req.session.error = error.message;
      console.error(error);
      res.redirect(req.get('Referrer') || '/');
    }
  };

  exp.compactCollection = async function (req, res) {
    await req.db.command({ compact: req.collectionName }).then(() => {
      req.session.success = 'Collection compacted!';
    }).catch((error) => {
      req.session.error = 'Error: ' + error;
      console.error(error);
    });
    res.redirect(req.get('Referrer') || '/');
  };

  /**
   * Cursor over whatever the collection view is currently showing.
   *
   * The exports used to hand _getQuery()'s result straight to find(). With the Aggregate
   * checkbox ticked that result is a pipeline array, and find() rejects it with
   * "Query filter must be a plain object or ObjectId" — thrown inside the cursor stream,
   * so the surrounding try/catch never saw it.
   */
  exp._getExportCursor = function (req) {
    const query = exp._getQuery(req);
    const queryOptions = {
      sort: exp._getSort(req),
      projection: exp._getProjection(req),
    };

    if (req.query.runAggregate === 'on' && Array.isArray(query)) {
      const pipeline = [
        ...query,
        ...(Object.keys(queryOptions.sort).length > 0 ? [{ $sort: queryOptions.sort }] : []),
        ...(Object.keys(queryOptions.projection).length > 0 ? [{ $project: queryOptions.projection }] : []),
      ];

      return req.collection.aggregate(pipeline, { allowDiskUse: config.mongodb.allowDiskUse });
    }

    return req.collection.find(query, queryOptions);
  };

  exp.exportCollection = async function (req, res) {
    try {
      const cursor = exp._getExportCursor(req);
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="' + encodeURI(req.collectionName) + '.json"; filename*=UTF-8\'\'' + encodeURI(req.collectionName)
        + '.json',
      );
      res.setHeader('Content-Type', 'application/json');

      // cursor.stream() took a transform option until driver 7 dropped it. Passing one now is
      // accepted and ignored, so raw documents reach the response and Node rejects the object
      // chunk, hence serialising in an explicit Transform.
      //
      // Each document ends with a newline. Without one they arrive glued together as
      // {..}{..}{..}, which is neither JSON nor the newline-delimited format the menu entry
      // promises, so nothing could read it back — not mongoimport, not Compass, not this
      // app's own import. That is issue #1225.
      await pipeline(
        cursor.stream(),
        new Transform({
          objectMode: true,
          transform(item, encoding, callback) {
            callback(null, bson.toJsonString(item) + '\n');
          },
        }),
        res,
      );
    } catch (error) {
      req.session.error = error.message;
      console.error(error);

      // Once a chunk is out the headers are gone and redirecting throws on top of the original
      // failure. All that is left is to cut the response short.
      if (res.headersSent) {
        return res.end();
      }

      return res.redirect(req.get('Referrer') || '/');
    }
  };

  exp.exportColArray = async function (req, res) {
    try {
      const cursor = exp._getExportCursor(req);
      await cursor.toArray().then((items) => {
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
      return res.redirect(req.get('Referrer') || '/');
    }
  };

  exp.exportCsv = async function (req, res) {
    try {
      const cursor = exp._getExportCursor(req);
      await cursor.toArray().then((items) => {
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
      return res.redirect(req.get('Referrer') || '/');
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

    res.redirect(req.get('Referrer') || '/');
  };

  exp.addIndex = async function (req, res) {
    const doc = req.body.index;

    if (doc === undefined || doc.length === 0) {
      req.session.error = 'You forgot to enter a index!';
      return res.redirect(req.get('Referrer') || '/');
    }

    let docBSON;

    try {
      docBSON = bson.toBSON(doc);
    } catch (error) {
      req.session.error = 'JSON is not valid!';
      console.error(error);
      return res.redirect(req.get('Referrer') || '/');
    }

    await req.collection.createIndex(docBSON).then(() => {
      req.session.success = 'Index created!';
      res.redirect(utils.buildCollectionURL(res.locals.baseHref, req.dbName, req.collectionName));
    }).catch((error) => {
      req.session.error = 'Something went wrong: ' + error;
      console.error(error);
      res.redirect(req.get('Referrer') || '/');
    });
  };

  exp.addCollection = async function (req, res) {
    const name = req.body.collection;

    const validation = utils.validateCollectionName(name);
    if (validation.error) {
      req.session.error = validation.message;
      return res.redirect(req.get('Referrer') || '/');
    }

    await req.db.createCollection(name).then(async () => {
      await req.updateCollections(req.dbConnection);
      req.session.success = 'Collection created!';
      res.redirect(utils.buildCollectionURL(res.locals.baseHref, req.dbName, name));
    }).catch((error) => {
      req.session.error = 'Something went wrong: ' + error;
      console.error(error);
      res.redirect(req.get('Referrer') || '/');
    });
  };

  exp.deleteCollection = async function (req, res) {
    if (config.options.readOnly === true) {
      req.session.error = 'Error: config.options.readOnly is set to true';
      return res.redirect(req.get('Referrer') || '/');
    }
    if (config.options.noDelete === true) {
      req.session.error = 'Error: config.options.noDelete is set to true';
      return res.redirect(req.get('Referrer') || '/');
    }
    try {
      if (req.query.query) {
        const query = exp._getQuery(req);
        // we're just deleting some of the documents
        await req.collection.deleteMany(query).then((opRes) => {
          req.session.success = opRes.deletedCount + ' documents deleted from "' + req.collectionName + '"';
          res.redirect(baseHref + 'db/' + req.dbName + '/' + req.collectionName);
        });
      } else {
        // no query means we're dropping the whole collection
        await req.collection.drop();
        await req.updateCollections(req.dbConnection);
        req.session.success = 'Collection  "' + req.collectionName + '" deleted!';
        res.redirect(baseHref + 'db/' + req.dbName);
      }
    } catch (error) {
      req.session.error = 'Something went wrong: ' + error;
      console.error(error);
      res.redirect(req.get('Referrer') || '/');
    }
  };

  exp.renameCollection = async function (req, res) {
    const name = req.body.collection;

    const validation = utils.validateCollectionName(name);
    if (validation.error) {
      req.session.error = validation.message;
      return res.redirect(req.get('Referrer') || '/');
    }

    try {
      await req.collection.rename(name);
      await req.updateCollections(req.dbConnection);
      req.session.success = 'Collection renamed!';
      res.redirect(utils.buildCollectionURL(res.locals.baseHref, req.dbName, name));
    } catch (error) {
      req.session.error = 'Something went wrong: ' + error;
      console.error(error);
      res.redirect(req.get('Referrer') || '/');
    }
  };

  exp.updateCollections = async function (req, res) {
    await req.updateCollections(req.dbConnection).then(() => {
      req.session.success = 'Collections Updated!';
      res.redirect(baseHref + 'db/' + req.dbName);
    }).catch((error) => {
      req.session.error = 'Something went wrong: ' + error;
      console.error(error);
      res.redirect(req.get('Referrer') || '/');
    });
  };

  exp.dropIndex = async function (req, res) {
    if (!req.query.name) {
      req.session.error = 'Error: missing name parameter';
      return res.redirect(req.get('Referrer') || '/');
    }
    if (config.options.readOnly === true) {
      req.session.error = 'Error: config.options.readOnly is set to true';
      return res.redirect(req.get('Referrer') || '/');
    }
    if (config.options.noDelete === true) {
      req.session.error = 'Error: config.options.noDelete is set to true';
      return res.redirect(req.get('Referrer') || '/');
    }
    await req.collection.dropIndex(req.query.name).then(() => {
      req.session.success = 'Index deleted!';
    }).catch((error) => {
      req.session.error = 'Error: ' + error;
      console.error(error);
    });

    res.redirect(req.get('Referrer') || '/');
  };

  exp.importCollection = async function (req, res) {
    if (!req.files) {
      return res.status(400).send('Missing file');
    }

    const files = Object.values(req.files);

    const unreadableFiles = files.some((file) => !file.data || !file.data.toString);

    if (unreadableFiles) {
      return res.status(400).send('Bad file');
    }

    // CSV goes out but cannot come back: the export renders ObjectIds as the text
    // ObjectId("..."), flattens nested documents into dotted columns and leaves every value a
    // string, so reading one back would quietly build a collection that no longer matches what
    // was exported. Refusing it by name beats letting it fail later as unparseable JSON.
    const csvFile = files.find((file) => CSV_MIME_TYPES.has(file.mimetype)
      || file.name?.toLowerCase().endsWith('.csv'));

    if (csvFile) {
      return res.status(400).send(
        'CSV import is not supported, because the CSV export cannot be read back without losing '
        + 'types. Export the collection as JSON and import that instead.',
      );
    }

    const docs = [];

    for (const file of files) {
      try {
        const parsed = parseImportedDocuments(file.data.toString('utf8'));

        // Use push rather than spread: a large file would overflow the stack.
        for (const doc of parsed) {
          docs.push(doc);
        }
      } catch (error) {
        console.error(error);

        // Name the shapes that do work. The old message said only that something was wrong,
        // which is why the issue thread filled up with people guessing at the format.
        return res.status(400).send(
          `Bad file content: ${error.message}. Expected JSON documents, as an array, one per `
          + 'line, or a single document.',
        );
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
