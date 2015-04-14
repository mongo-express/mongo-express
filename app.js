/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http');

var _ = require('underscore');
var async = require('async');
var utils = require('./utils');

var mongodb = require('mongodb');
var cons = require('consolidate');
var swig = require('swig');
var swigFilters = require('./filters');
var app = express();

var config = require('./config');

//Set up swig
app.engine('html', cons.swig);

Object.keys(swigFilters).forEach(function (name) {
    swig.setFilter(name, swigFilters[name]);
});

//App configuration
app.configure(function(){
  if(config.useBasicAuth){
    app.use(express.basicAuth(config.basicAuth.username, config.basicAuth.password));
  }
  app.set('views', __dirname + '/views');
  app.set('view engine', 'html');
  app.set('view options', {layout: false});
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(config.site.baseUrl,express.static(__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.cookieParser(config.site.cookieSecret));
  app.use(express.session({
    secret: config.site.sessionSecret,
    key: config.site.cookieKeyName
  }));
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


//Set up database stuff
var host = config.mongodb.server || 'localhost';
var port = config.mongodb.port || mongodb.Connection.DEFAULT_PORT;
var dbOptions = {
  auto_reconnect: config.mongodb.autoReconnect,
  poolSize: config.mongodb.poolSize
};
var db = new mongodb.Db('local', new mongodb.Server(host, port, dbOptions), {safe:true});


var connections = {};
var databases = [];
var collections = {};
var adminDb;
var mainConn; //main db connection


//Update the collections list
var updateCollections = function(db, dbName, callback) {
  db.collectionNames(function (err, result) {
    var names = [];

    for (var r in result) {
      var coll = utils.parseCollectionName(result[r].name);
      names.push(coll.name);
    }

    collections[dbName] = names.sort();

    if (callback) {
      callback(err);
    }
  });
};

//Update database list
var updateDatabases = function(admin) {
  admin.listDatabases(function(err, dbs) {
    if (err) {
      //TODO: handle error
      console.error(err);
    }

    for (var key in dbs.databases) {
      var dbName = dbs.databases[key]['name'];

      //'local' is special database, ignore it
      if (dbName == 'local') {
        continue;
      }

      if (config.mongodb.whitelist.length != 0) {
        if (!_.include(config.mongodb.whitelist, dbName)) {
          continue;
        }
      }
      if (config.mongodb.blacklist.length != 0) {
        if (_.include(config.mongodb.blacklist, dbName)) {
          continue;
        }
      }

      connections[dbName] = mainConn.db(dbName);
      databases.push(dbName);

      updateCollections(connections[dbName], dbName);
    }

    //Sort database names
    databases = databases.sort();
  });
};


//Connect to mongodb database
db.open(function(err, db) {
  if (err) {
    throw err;
  }

  console.log('Database connected!');

  mainConn = db;

  //Check if admin features are on
  if (config.mongodb.admin === true) {
    //get admin instance
    db.admin(function(err, a) {
      adminDb = a;

      if (config.mongodb.adminUsername.length == 0) {
        console.log('Admin Database connected');
        updateDatabases(adminDb);
      } else {
        //auth details were supplied, authenticate admin account with them
        adminDb.authenticate(config.mongodb.adminUsername, config.mongodb.adminPassword, function(err, result) {
          if (err) {
            //TODO: handle error
            console.error(err);
          }

          console.log('Admin Database connected');
          updateDatabases(adminDb);
        });
      }
    });
  } else {
    //Regular user authentication
    if (typeof config.mongodb.auth == "undefined" || config.mongodb.auth.length == 0) {
      throw new Error('Add auth details to config or turn on admin!');
    }

    async.forEachSeries(config.mongodb.auth, function(auth, callback) {
      console.log("Connecting to " + auth.database + "...");
      connections[auth.database] = mainConn.db(auth.database);
      databases.push(auth.database);

      if (typeof auth.username != "undefined" && auth.username.length != 0) {
        connections[auth.database].authenticate(auth.username, auth.password, function(err, success) {
          if (err) {
            //TODO: handle error
            console.error(err);
          }

          if (!success) {
            console.error('Could not authenticate to database "' + auth.database + '"');
          }

          updateCollections(connections[auth.database], auth.database);
          console.log('Connected!');
          callback();
        });
      } else {
        updateCollections(connections[auth.database], auth.database);
        console.log('Connected!');
        callback();
      }
    });
  }
});

//View helper, sets local variables used in templates
app.all('*', function(req, res, next) {
  res.locals.baseHref = config.site.baseUrl;
  res.locals.databases = databases;
  res.locals.collections = collections;

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


//route param pre-conditions
app.param('database', function(req, res, next, id) {
  //Make sure database exists
  if (!_.include(databases, id)) {
    req.session.error = "Database not found!";
    return res.redirect(config.site.baseUrl);
  }

  req.dbName = id;
  res.locals.dbName = id;

  if (connections[id] !== undefined) {
    req.db = connections[id];
  } else {
    connections[id] = mainConn.db(id);
    req.db = connections[id];
  }

  next();
});

//:collection param MUST be preceded by a :database param
app.param('collection', function(req, res, next, id) {
  //Make sure collection exists
  if (!_.include(collections[req.dbName], id)) {
    req.session.error = "Collection not found!";
    return res.redirect(config.site.baseUrl+'db/' + req.dbName);
  }

  req.collectionName = id;
  res.locals.collectionName = id;

  connections[req.dbName].collection(id, function(err, coll) {
    if (err || coll == null) {
      req.session.error = "Collection not found!";
      return res.redirect(config.site.baseUrl+'db/' + req.dbName);
    }

    req.collection = coll;

    next();
  });
});

//:document param MUST be preceded by a :collection param
app.param('document', function(req, res, next, id) {
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


//mongodb middleware
var middleware = function(req, res, next) {
  req.adminDb = adminDb;
  req.databases = databases; //List of database names
  req.collections = collections; //List of collection names in all databases

  //Allow page handlers to request an update for collection list
  req.updateCollections = updateCollections;

  next();
};

//Routes
app.get(config.site.baseUrl, middleware,  routes.index);

app.get(config.site.baseUrl+'db/:database/export/:collection', middleware, routes.exportCollection);

app.get(config.site.baseUrl+'db/:database/:collection/:document', middleware, routes.viewDocument);
app.put(config.site.baseUrl+'db/:database/:collection/:document', middleware, routes.updateDocument);
app.del(config.site.baseUrl+'db/:database/:collection/:document', middleware, routes.deleteDocument);
app.post(config.site.baseUrl+'db/:database/:collection', middleware, routes.addDocument);

app.get(config.site.baseUrl+'db/:database/:collection', middleware, routes.viewCollection);
app.put(config.site.baseUrl+'db/:database/:collection', middleware, routes.renameCollection);
app.del(config.site.baseUrl+'db/:database/:collection', middleware, routes.deleteCollection);
app.post(config.site.baseUrl+'db/:database', middleware, routes.addCollection);

app.get(config.site.baseUrl+'db/:database', middleware, routes.viewDatabase);

//run as standalone App?
if (require.main === module){
  app.listen(config.site.port);
  console.log("Mongo Express server listening on port " + (config.site.port || 80));
}else{
  //as a module
  console.log('Mongo Express module ready to use on route "'+config.site.baseUrl+'*"');
  server=http.createServer(app);
  module.exports=function(req,res,next){
    server.emit('request', req, res);
  };
}


