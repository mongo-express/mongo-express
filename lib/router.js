'use strict';

const _ = require('lodash');
const basicAuth = require('basic-auth-connect');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const db = require('./db');
const errorHandler = require('errorhandler');
const express = require('express');
const favicon = require('serve-favicon');
const logger = require('morgan');
const methodOverride = require('method-override');
const mongodb = require('mongodb');
const routes = require('./routes');
const session = require('express-session');
const utils = require('./utils');

const router = function (config) {
  // appRouter configuration
  const appRouter = express.Router();
  const mongo = db(config);

  if (config.useBasicAuth) {
    appRouter.use(basicAuth(config.basicAuth.username, config.basicAuth.password));
  }

  appRouter.use(favicon(__dirname + '/../public/images/favicon.ico'));

  appRouter.use(logger('dev', config.options.logger));

  appRouter.use('/public', express.static(__dirname + '/../build/'));

  // Set request size limit
  appRouter.use(bodyParser.urlencoded({
    extended: true,
    limit: config.site.requestSizeLimit,
  }));

  appRouter.use(cookieParser(config.site.cookieSecret));

  appRouter.use(session({
    key: config.site.cookieKeyName,
    resave: true,
    saveUninitialized: true,
    secret: config.site.sessionSecret,
  }));

  appRouter.use(methodOverride(function (req) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      const method = req.body._method;
      delete req.body._method;
      return method;
    }
  }));

  if (process.env.NODE_ENV === 'development') {
    appRouter.use(errorHandler());
  }

  const addTrailingSlash = function (s) {
    return s + (s[s.length - 1] === '/' ? '' : '/');
  };
  const buildBaseHref = function (originalUrl, reqUrl) {
    if (reqUrl === '/') {
      return addTrailingSlash(originalUrl);
    }
    const idx = originalUrl.lastIndexOf(reqUrl);
    const rootPath = originalUrl.substring(0, idx);
    return addTrailingSlash(rootPath);
  };

  // View helper, sets local variables used in templates
  appRouter.all('*', function (req, res, next) {
    res.locals.baseHref       = buildBaseHref(req.originalUrl, req.url);
    res.locals.databases      = mongo.databases;
    res.locals.collections    = mongo.collections;
    res.locals.gridFSBuckets  = utils.colsToGrid(mongo.collections);

    // Flash messages
    if (req.session.success) {
      res.locals.messageSuccess = req.session.success;
      delete req.session.success;
    }

    if (req.session.error) {
      res.locals.messageError = req.session.error;
      delete req.session.error;
    }

    //user in admin databases normally have the read and write access to all databases
    if (config.mongodb.admin !== true && mongo.databases[0] !== 'admin') return next();

    mongo.updateDatabases(mongo.adminDb, function (databases) {
      mongo.databases = databases;
      res.locals.databases = mongo.databases;
      return next();
    });
  });

  // route param pre-conditions
  appRouter.param('database', function (req, res, next, id) {
    //Make sure database exists
    if (!_.includes(mongo.databases, id)) {
      req.session.error = 'Database not found!';
      return res.redirect(res.locals.baseHref);
    }

    req.dbName = id;
    res.locals.dbName = id;

    if (mongo.connections[id] !== undefined) {
      req.db = mongo.connections[id];
    } else {
      mongo.connections[id] = mongo.mainConn.db(id);
      req.db = mongo.connections[id];
    }

    next();
  });

  // :collection param MUST be preceded by a :database param
  appRouter.param('collection', function (req, res, next, id) {
    //Make sure collection exists

    if (!_.includes(mongo.collections[req.dbName], id)) {
      req.session.error = 'Collection not found!';
      return res.redirect(res.locals.baseHref + 'db/' + req.dbName);
    }

    req.collectionName = id;
    res.locals.collectionName = id;
    res.locals.collections = mongo.collections[req.dbName];
    res.locals.gridFSBuckets = utils.colsToGrid(mongo.collections[req.dbName]);

    mongo.connections[req.dbName].collection(id, function (err, coll) {
      if (err || coll === null) {
        req.session.error = 'Collection not found!';
        return res.redirect(res.locals.baseHref + 'db/' + req.dbName);
      }

      req.collection = coll;

      next();
    });
  });

  // :document param MUST be preceded by a :collection param
  appRouter.param('document', function (req, res, next, id) {
    if (id === 'undefined' || id === undefined) {
      req.session.error = 'Document lacks an _id!';
      return res.redirect(res.locals.baseHref + 'db/' + req.dbName + '/' + req.collectionName);
    }

    id = JSON.parse(decodeURIComponent(id));
    let obj_id;

    // Attempt to create ObjectID from passed 'id'
    try {
      obj_id = new mongodb.ObjectID.createFromHexString(id);
    } catch (err) {
      try {
        // Is it a GUID?
        obj_id = new mongodb.Binary(new Buffer(id, 'base64'), 3);
      } catch (err) {
        // Silence GUID error as well
      }
      // Silence the error
    }

    // If an ObjectID was correctly created from passed id param, try getting the ObjID first else falling back to try getting the string id
    // If not valid ObjectID created, try getting string id

    if (obj_id) {
      // passed id has successfully been turned into a valid ObjectID
      req.collection.findOne({ _id: obj_id }, function (err, doc) {
        if (err) {
          req.session.error = 'Error: ' + err;
          return res.redirect(res.locals.baseHref + 'db/' + req.dbName + '/' + req.collectionName);
        }

        if (doc === null) {
          // No document found with obj_id, try again with straight id
          req.collection.findOne({ _id: id }, function (err, doc) {
            if (err) {
              req.session.error = 'Error: ' + err;
              return res.redirect(res.locals.baseHref + 'db/' + req.dbName + '/' + req.collectionName);
            }

            if (doc === null) {
              req.session.error = 'Document not found!';
              return res.redirect(res.locals.baseHref + 'db/' + req.dbName + '/' + req.collectionName);
            }

            // Document found - send it back
            req.document = doc;
            res.locals.document = doc;

            next();
          });
        } else {
          // Document found - send it back
          req.document = doc;
          res.locals.document = doc;

          next();
        }

      });
    } else {
      // Passed id was NOT a valid ObjectID
      req.collection.findOne({ _id: id }, function (err, doc) {
        if (err) {
          req.session.error = 'Error: ' + err;
          return res.redirect(res.locals.baseHref + 'db/' + req.dbName + '/' + req.collectionName);
        }

        if (doc === null) {
          req.session.error = 'Document not found!';
          return res.redirect(res.locals.baseHref + 'db/' + req.dbName + '/' + req.collectionName);
        }

        req.document = doc;
        res.locals.document = doc;

        next();
      });
    }
  });

  // get individual property - for async loading of big documents
  // (db)/(collection)/(document)/(prop)
  appRouter.param('prop', function (req, res, next, prop) {
    req.prop = req.document[prop];
    next();
  });

  // GridFS (db)/gridFS/(bucket)
  appRouter.param('bucket', function (req, res, next, id) {

    req.bucketName = id;
    res.locals.bucketName = id;

    mongo.connections[req.dbName].collection(id + '.files', function (err, filesConn) {
      if (err || filesConn === null) {
        req.session.error = id + '.files collection not found! Err:' + err;
        return res.redirect(res.locals.baseHref + 'db/' + req.dbName);
      }

      req.filesConn = filesConn;

      filesConn.find({}).toArray(function (err, files) {
        if (err || files === null) {
          req.session.error = id + '.files collection not found! Error:' + err;
          return res.redirect(res.locals.baseHref + 'db/' + req.dbName);
        }

        req.files = files;

        next();
      });
    });
  });

  // GridFS files
  appRouter.param('file', function (req, res, next, id) {
    req.fileID = JSON.parse(decodeURIComponent(id));
    next();
  });

  // mongodb mongoMiddleware
  const mongoMiddleware = function (req, res, next) {
    req.mainConn = mongo.mainConn;
    req.adminDb = mongo.adminDb;
    req.databases = mongo.databases; //List of database names
    req.collections = mongo.collections; //List of collection names in all databases
    req.gridFSBuckets = utils.colsToGrid(mongo.collections);

    //Allow page handlers to request an update for collection list
    req.updateCollections = mongo.updateCollections;

    next();
  };

  // routes
  const configuredRoutes = routes(config);

  appRouter.get('/', mongoMiddleware, configuredRoutes.index);
  appRouter.post('/', mongoMiddleware, configuredRoutes.addDatabase);
  appRouter.delete('/:database', mongoMiddleware, configuredRoutes.deleteDatabase);
  appRouter.get('/db/:database', mongoMiddleware, configuredRoutes.viewDatabase);

  appRouter.post('/checkValid', mongoMiddleware, configuredRoutes.checkValid);

  // Collection level routes
  appRouter.get('/db/:database/compact/:collection', mongoMiddleware, configuredRoutes.compactCollection);
  appRouter.get('/db/:database/expArr/:collection', mongoMiddleware, configuredRoutes.exportColArray);
  appRouter.get('/db/:database/expCsv/:collection', mongoMiddleware, configuredRoutes.exportCsv);
  appRouter.get('/db/:database/reIndex/:collection', mongoMiddleware, configuredRoutes.reIndex);
  appRouter.post('/db/:database/addIndex/:collection', mongoMiddleware, configuredRoutes.addIndex);
  appRouter.get('/db/:database/export/:collection', mongoMiddleware, configuredRoutes.exportCollection);
  appRouter.get('/db/:database/dropIndex/:collection', mongoMiddleware, configuredRoutes.dropIndex);
  appRouter.get('/db/:database/updateCollections', mongoMiddleware, configuredRoutes.updateCollections);

  // GridFS
  appRouter.post('/db/:database/gridFS', mongoMiddleware, configuredRoutes.addBucket);
  appRouter.delete('/db/:database/gridFS/:bucket', mongoMiddleware, configuredRoutes.deleteBucket);

  appRouter.get('/db/:database/gridFS/:bucket', mongoMiddleware, configuredRoutes.viewBucket);
  appRouter.post('/db/:database/gridFS/:bucket', mongoMiddleware, configuredRoutes.addFile);
  appRouter.get('/db/:database/gridFS/:bucket/:file', mongoMiddleware, configuredRoutes.getFile);
  appRouter.delete('/db/:database/gridFS/:bucket/:file', mongoMiddleware, configuredRoutes.deleteFile);

  appRouter.get('/db/:database/:collection', mongoMiddleware, configuredRoutes.viewCollection);
  appRouter.put('/db/:database/:collection', mongoMiddleware, configuredRoutes.renameCollection);
  appRouter.delete('/db/:database/:collection', mongoMiddleware, configuredRoutes.deleteCollection);
  appRouter.post('/db/:database', mongoMiddleware, configuredRoutes.addCollection);

  // Document routes
  appRouter.post('/db/:database/:collection', mongoMiddleware, configuredRoutes.addDocument);
  appRouter.get('/db/:database/:collection/:document', mongoMiddleware, configuredRoutes.viewDocument);
  appRouter.put('/db/:database/:collection/:document', mongoMiddleware, configuredRoutes.updateDocument);
  appRouter.delete('/db/:database/:collection/:document', mongoMiddleware, configuredRoutes.deleteDocument);

  // Property routes
  appRouter.get('/db/:database/:collection/:document/:prop', mongoMiddleware, configuredRoutes.getProperty);

  return appRouter;
};

module.exports = router;
