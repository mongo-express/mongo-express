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
var swig_filters = require('./filters');
var app = express();

//Set up swig
swig.init({
  root: __dirname + '/views',
  allowErrors: false,
  filters: swig_filters
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
var db = new mongodb.Db('local', new mongodb.Server(host, port, {auto_reconnect: true}));


var connections = {};
var databases = [];
var collections = {};
var adminDb;
var mainConn; //main db connection



//Update the collections list
var updateCollections = function(db, db_name) {
  db.collectionNames(function (err, result) {
    var names = [];

    for (var r in result) {
      names.push(utils.parseCollectionName(result[r].name));
    }

    collections[db_name] = names.sort();
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
      var db_name = dbs.databases[key]['name'];

      //'local' is special database, ignore it
      if (db_name == 'local') {
        continue;
      }

      connections[db_name] = mainConn.db(db_name);
      databases.push(db_name);

      updateCollections(connections[db_name], db_name);
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

    db.collectionNames(function(err, names) {
      app.set('collections', _.sortBy(names, 'name'));
    });
  } else {
    throw err;
  }
});

//View helper, sets local variables used in templates
app.locals.use(function(req, res) {
  res.locals.base_href = config.site.base_url;
  res.locals.databases = databases;
  res.locals.collections = collections;
});


//route param pre-conditions
app.param('database', function(req, res, next, id) {
  //Make sure database exists
  var exists = false;
  if (!_.include(databases, id)) {
    return next('Error!');
  }

  if (connections[id] !== undefined) {
    req.db = connections[id];
  } else {
    connections[id] = mainConn.db(id);
    req.db = connections[id];
  }

  next();
});


//mongodb middleware
var middleware = function(req, res, next) {
  req.adminDb = adminDb;
  req.databases = databases;
  req.collections = collections;
  //req.database = config.mongodb.database;

  //req.updateCollections = function(collections) {
  //  app.set('collections', _.sortBy(collections, 'name'));
  //};
  next();
};

//Routes
app.get('/', middleware,  routes.index);
//app.post('/', middleware, routes.createCollection);
//app.get('/db/:collection', middleware, routes.collection);
//app.del('/db/:collection', middleware, routes.deleteCollection);


app.listen(config.site.port || 80);

console.log("Mongo Express server listening on port " + (config.site.port || 80));
