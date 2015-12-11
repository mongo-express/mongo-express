'use strict';

var _               = require('underscore');
var basicAuth       = require('basic-auth-connect');
var bodyParser      = require('body-parser');
var cookieParser    = require('cookie-parser');
var db              = require('./db');
var errorHandler    = require('errorhandler');
var express         = require('express');
var favicon         = require('serve-favicon');
var logger          = require('morgan');
var methodOverride  = require('method-override');
var mongodb         = require('mongodb');
var routes          = require('./routes');
var session         = require('express-session');

var router = function(config) {
  // appRouter configuration
  var appRouter = express.Router();
  var mongo = db(config);

  if(config.useBasicAuth){
    appRouter.use(basicAuth(config.basicAuth.username, config.basicAuth.password));
  }
  appRouter.use(favicon(__dirname + '/public/images/favicon.ico'));
  appRouter.use(logger('dev'));
  appRouter.use('/', express.static(__dirname + '/public'));
  appRouter.use(bodyParser.urlencoded({
    extended: true,
    limit:    config.site.requestSizeLimit
  }));
  appRouter.use(cookieParser(config.site.cookieSecret));
  appRouter.use(session({
    key:                config.site.cookieKeyName,
    resave:             true,
    saveUninitialized:  true,
    secret:             config.site.sessionSecret
  }));
  appRouter.use(methodOverride(function(req) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      var method = req.body._method;
      delete req.body._method;
      return method;
    }
  }));

  if (process.env.NODE_ENV === 'development') {
    appRouter.use(errorHandler());
  }


  // view helper, sets local variables used in templates
  appRouter.all('*', function(req, res, next) {
    // ensure a trailing slash on the baseHref (used as a prefix in routes and views)
    res.locals.baseHref = req.app.mountpath + (req.app.mountpath[req.app.mountpath.length-1] === '/' ? '' : '/');
    res.locals.databases = mongo.databases;
    res.locals.collections = mongo.collections;

    //Flash messages
    if (req.session.success) {
      res.locals.messageSuccess = req.session.success;
      delete req.session.success;
    }

    if (req.session.error) {
      res.locals.messageError = req.session.error;
      delete req.session.error;
    }

    mongo.updateDatabases(mongo.adminDb, function(databases){
        mongo.databases = databases;
        res.locals.databases = mongo.databases;
        return next();
    });
  });


  // route param pre-conditions
  appRouter.param('database', function(req, res, next, id) {
    //Make sure database exists
    if (!_.include(mongo.databases, id)) {
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
  appRouter.param('collection', function(req, res, next, id) {
    //Make sure collection exists
    if (!_.include(mongo.collections[req.dbName], id)) {
      req.session.error = 'Collection not found!';
      return res.redirect(res.locals.baseHref + 'db/' + req.dbName); // XXX
    }

    req.collectionName = id;
    res.locals.collectionName = id;

    mongo.connections[req.dbName].collection(id, function(err, coll) {
      if (err || coll === null) {
        req.session.error = 'Collection not found!';
        return res.redirect(res.locals.baseHref + 'db/' + req.dbName);
      }

      req.collection = coll;

      next();
    });
  });

  // :document param MUST be preceded by a :collection param
  appRouter.param('document', function(req, res, next, id) {
    if (id.length === 24) {
      //Convert id string to mongodb object ID
      try {
        id = new mongodb.ObjectID.createFromHexString(id);
      } catch (err) {
      }
    } else{
      id = /^[1-9]+[0-9]*$/.test(id) ? +id : id;
    }

    req.collection.findOne({_id: id}, function(err, doc) {
      if (err || doc === null) {
        req.session.error = 'Document not found!';
        return res.redirect(res.locals.baseHref + 'db/' + req.dbName + '/' + req.collectionName);
      }

      req.document = doc;
      res.locals.document = doc;

      next();
    });
  });


  // mongodb mongoMiddleware
  var mongoMiddleware = function(req, res, next) {
    req.adminDb     = mongo.adminDb;
    req.databases   = mongo.databases; //List of database names
    req.collections = mongo.collections; //List of collection names in all databases

    //Allow page handlers to request an update for collection list
    req.updateCollections = mongo.updateCollections;

    next();
  };


  // routes
  appRouter.get('/', mongoMiddleware, routes(config).index);

  appRouter.post('/checkValid', mongoMiddleware, routes(config).checkValid);

  appRouter.get('/db/:database/expArr/:collection', mongoMiddleware, routes(config).exportColArray);
  appRouter.get('/db/:database/export/:collection', mongoMiddleware, routes(config).exportCollection);
  appRouter.get('/db/:database/updateCollections', mongoMiddleware, routes(config).updateCollections);

  appRouter.get('/db/:database/:collection/:document', mongoMiddleware, routes(config).viewDocument);
  appRouter.put('/db/:database/:collection/:document', mongoMiddleware, routes(config).updateDocument);
  appRouter.delete('/db/:database/:collection/:document', mongoMiddleware, routes(config).deleteDocument);
  appRouter.post('/db/:database/:collection', mongoMiddleware, routes(config).addDocument);

  appRouter.get('/db/:database/:collection', mongoMiddleware, routes(config).viewCollection);
  appRouter.put('/db/:database/:collection', mongoMiddleware, routes(config).renameCollection);
  appRouter.delete('/db/:database/:collection', mongoMiddleware, routes(config).deleteCollection);
  appRouter.post('/db/:database', mongoMiddleware, routes(config).addCollection);

  appRouter.get('/db/:database', mongoMiddleware, routes(config).viewDatabase);

  return appRouter;
};


module.exports = router;
