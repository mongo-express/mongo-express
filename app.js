
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http');

var mongodb = require('mongodb');
var cons = require('consolidate');
var app = express();

var config = require('./config');
var host = config.host || 'localhost';
var port = config.port || mongodb.Connection.DEFAULT_PORT;
var db = new mongodb.Db(config.database, new mongodb.Server(host, port, {auto_reconnect: true}));

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.engine('.html', cons.swig);
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

//Connect to mongodb database
db.open(function(err, db) {
  if (!err) {
    app.set('db', db);
    console.log('Database connected!');
  } else {
    console.error(err);
  }
});

app.get('/', routes.index);

http.createServer(app).listen(3000);

console.log("Mongo Express server listening on port 3000");
