var config = require('../config');
var mongodb = require('mongodb');

var host = config.mongodb.host || 'localhost';
var port = config.mongodb.port || mongodb.Connection.DEFAULT_PORT;
var dbOptions = {
  auto_reconnect: config.mongodb.autoReconnect,
  poolSize: config.mongodb.poolSize
};

var db = new mongodb.Db('test', new mongodb.Server(host, port, dbOptions));

module.exports = db;
