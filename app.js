/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http');

var _ = require('underscore');
var utils = require('./utils');

var mongodb = require('mongodb');
//var cons = require('consolidate');
var swig = require('swig');
var swigFilters = require('./filters');
var app = express();

//Set up swig
swig.init({
  root: __dirname + '/views',
  allowErrors: false,
  filters: swigFilters
});

/*
* Monkey-patching swig until swig supports express
*/
swig.__express = function(path, options, fn) {
  options = options || {};
  try {
    options.filename = path;
    var tmpl = swig.compileFile(_.last(path.split('/')));
    fn(null, tmpl.render(options));
  } catch (err) {
    fn(err);
  }
};


//App configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.engine('.html', swig.__express);
  app.set('view engine', 'html');
  app.set('view options', {layout: false});
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


//Set up database stuff
var config = require('./config');
var host = config.mongodb.host || 'localhost';
var port = config.mongodb.port || mongodb.Connection.DEFAULT_PORT;
var dbOptions = {
  auto_reconnect: config.mongodb.autoReconnect,
  poolSize: config.mongodb.poolSize
};
var db = new mongodb.Db('local', new mongodb.Server(host, port, dbOptions));


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
  if (!err) {
    console.log('Database connected!');

    mainConn = db;

    //get admin instance
    db.admin(function(err, a) {
      adminDb = a;

      if (config.mongodb.username.length == 0) {
        console.log('Admin DB connected');
        updateDatabases(adminDb);
      } else {
        //auth details were supplied, authenticate admin account with them
        adminDb.authenticate(config.mongodb.username, config.mongodb.password, function(err, result) {
          if (err) {
            //TODO: handle error
            console.error(err);
          }

          console.log('Admin DB connected');
          updateDatabases(adminDb);
        });
      }
    });
  } else {
    throw err;
  }
});

//View helper, sets local variables used in templates
app.locals.use(function(req, res) {
  res.locals.baseHref = config.site.baseUrl;
  res.locals.databases = databases;
  res.locals.collections = collections;
});


//route param pre-conditions
app.param('database', function(req, res, next, id) {
  //Make sure database exists
  if (!_.include(databases, id)) {
    //TODO: handle error
    return next('Error! Database not found!');
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
    //TODO: handle error
    return next('Error!');
  }

  req.collectionName = id;
  res.locals.collectionName = id;

  connections[req.dbName].collection(id, function(err, coll) {
    if (err) {
      //TODO: handle error
      return next('Error! Collection not found!');
    }

    req.collection = coll;

    next();
  });
});

//:document param MUST be preceded by a :collection param
app.param('document', function(req, res, next, id) {
  //Convert id string to mongodb object ID
  var id = new mongodb.ObjectID.createFromHexString(id);

  req.collection.findOne({_id: id}, function(err, doc) {
    if (err) {
      //TODO: handle error
      return next('Error! Document not found!');
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
app.get('/', middleware,  routes.index);

app.get('/db/:database/:collection/:document', middleware, routes.viewDocument);
app.put('/db/:database/:collection/:document', middleware, routes.updateDocument);
app.del('/db/:database/:collection/:document', middleware, routes.deleteDocument);

app.get('/db/:database/:collection', middleware, routes.viewCollection);
app.put('/db/:database/:collection', middleware, routes.renameCollection);
app.del('/db/:database/:collection', middleware, routes.deleteCollection);
app.post('/db/:database', middleware, routes.addCollection);

app.get('/db/:database', middleware, routes.viewDatabase);

app.listen(config.site.port || 80);

console.log("Mongo Express server listening on port " + (config.site.port || 80));
