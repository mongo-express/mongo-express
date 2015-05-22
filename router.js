var
    express = require('express')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , methodOverride = require('method-override')
  , errorHandler = require('errorhandler')
  , session = require('express-session')
  , favicon = require('serve-favicon')
  , basicAuth = require('basic-auth-connect')
  , logger = require('morgan')
  , _ = require('underscore')
  , mongodb = require('mongodb')
  ;

var
    routes = require('./routes')
  , db = require('./db')
  ;




var router = function(config) {
  var appRouter = express.Router();
  var mongo = db(config);


  // appRouter configuration
  if(config.useBasicAuth){
    appRouter.use(basicAuth(config.basicAuth.username, config.basicAuth.password));
  }
  appRouter.use(favicon(__dirname + '/public/favicon.ico'));
  appRouter.use(logger('dev'));
  appRouter.use(config.site.baseUrl,express.static(__dirname + '/public'));
  appRouter.use(bodyParser());
  appRouter.use(cookieParser(config.site.cookieSecret));
  appRouter.use(session({
    secret: config.site.sessionSecret,
    key: config.site.cookieKeyName
  }));
  appRouter.use(methodOverride());

  if (process.env.NODE_ENV === 'development') {
    appRouter.use(errorHandler());
  }


  // view helper, sets local variables used in templates
  appRouter.all('*', function(req, res, next) {
    res.locals.baseHref = config.site.baseUrl;
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

    return next();
  });


  // route param pre-conditions
  appRouter.param('database', function(req, res, next, id) {
    //Make sure database exists
    if (!_.include(mongo.databases, id)) {
      req.session.error = "Database not found!";
      return res.redirect(config.site.baseUrl);
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
      req.session.error = "Collection not found!";
      return res.redirect(config.site.baseUrl+'db/' + req.dbName);
    }

    req.collectionName = id;
    res.locals.collectionName = id;

    mongo.connections[req.dbName].collection(id, function(err, coll) {
      if (err || coll == null) {
        req.session.error = "Collection not found!";
        return res.redirect(config.site.baseUrl+'db/' + req.dbName);
      }

      req.collection = coll;

      next();
    });
  });

  // :document param MUST be preceded by a :collection param
  appRouter.param('document', function(req, res, next, id) {
    if (id.length == 24) {
      //Convert id string to mongodb object ID
      try {
        id = new mongodb.ObjectID.createFromHexString(id);
      } catch (err) {
      }
    }

    req.collection.findOne({_id: id}, function(err, doc) {
      if (err || doc == null) {
        req.session.error = "Document not found!";
        return res.redirect(config.site.baseUrl+'db/' + req.dbName + '/' + req.collectionName);
      }

      req.document = doc;
      res.locals.document = doc;

      next();
    });
  });


  // mongodb mongoMiddleware
  var mongoMiddleware = function(req, res, next) {
    req.adminDb = mongo.adminDb;
    req.databases = mongo.databases; //List of database names
    req.collections = mongo.collections; //List of collection names in all databases

    //Allow page handlers to request an update for collection list
    req.updateCollections = mongo.updateCollections;

    next();
  };


  // routes
  appRouter.get(config.site.baseUrl, mongoMiddleware, routes(config).index);

  appRouter.get(config.site.baseUrl+'db/:database/export/:collection', mongoMiddleware, routes(config).exportCollection);

  appRouter.get(config.site.baseUrl+'db/:database/:collection/:document', mongoMiddleware, routes(config).viewDocument);
  appRouter.put(config.site.baseUrl+'db/:database/:collection/:document', mongoMiddleware, routes(config).updateDocument);
  appRouter.delete(config.site.baseUrl+'db/:database/:collection/:document', mongoMiddleware, routes(config).deleteDocument);
  appRouter.post(config.site.baseUrl+'db/:database/:collection', mongoMiddleware, routes(config).addDocument);

  appRouter.get(config.site.baseUrl+'db/:database/:collection', mongoMiddleware, routes(config).viewCollection);
  appRouter.put(config.site.baseUrl+'db/:database/:collection', mongoMiddleware, routes(config).renameCollection);
  appRouter.delete(config.site.baseUrl+'db/:database/:collection', mongoMiddleware, routes(config).deleteCollection);
  appRouter.post(config.site.baseUrl+'db/:database', mongoMiddleware, routes(config).addCollection);

  appRouter.get(config.site.baseUrl+'db/:database', mongoMiddleware, routes(config).viewDatabase);

  return appRouter;
};


module.exports = router;
