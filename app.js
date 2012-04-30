/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http');

//TODO: remove underscore.js from dependencies or is it more often
_ = require('underscore');

var mongodb = require('mongodb');
//var cons = require('consolidate');
var swig = require('swig');
var swig_filters = require('./filters');
var app = express();

var config = require('./config');
var host = config.mongodb.host || 'localhost';
var port = config.mongodb.port || mongodb.Connection.DEFAULT_PORT;
var db = new mongodb.Db('local', new mongodb.Server(host, port, {auto_reconnect: true}));


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



var connections = {};
var databases = [];
var adminDb;
var mainConn; //main db connection


var updateDatabases = function(admin) {
  admin.listDatabases(function(err, dbs) {
    if (err) {
      //TODO: handle error
      console.error(err);
    }

    for (var key in dbs.databases) {
      //'local' is special database, ignore it
      if (dbs.databases[key]['name'] == 'local') {
        continue;
      }
      connections[dbs.databases[key]['name']] = null;
      databases.push(dbs.databases[key]['name']);
    }
    //Remove duplicates and order the db names
    databases = _.uniq(databases).sort();
  });
};

//Connect to mongodb database
db.open(function(err, db) {
  if (!err) {
    console.log('Database connected!');

    db.admin(function(err, a) {
      adminDb = a;

      if (config.mongodb.username.length == 0) {
        console.log('Admin DB connected');
        updateDatabases(adminDb);
      } else {
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
  res.locals.databases = connections;
  res.locals.collections = app.set('collections');
});

//mongodb middleware
var middleware = function(req, res, next) {
  req.adminDb = adminDb;
  req.getDb = function(db) {
    if (connections[db] !== undefined) {
      return connections[db];
    } else {
      connections[db] = mainConn.db(db);
      return connections[db];
    }
  };
  req.collections = app.set('collections');
  //req.database = config.mongodb.database;

  //req.updateCollections = function(collections) {
  //  app.set('collections', _.sortBy(collections, 'name'));
  //};
  next();
};

//Routes
app.get('/', middleware,  routes.index);
//app.post('/', middleware, routes.createCollection);
//TODO: Use route param pre-conditions to automatically assign collection name variables to request
//app.get('/db/:collection', middleware, routes.collection);
//app.del('/db/:collection', middleware, routes.deleteCollection);


app.listen(config.site.port || 80);

console.log("Mongo Express server listening on port " + (config.site.port || 80));
