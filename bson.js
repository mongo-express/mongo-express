var mongodb = require('mongodb');
var vm = require('vm');
var json = require('./json');


//Adaptors for BSON types

var DBRef = function(namespace, oid, db) {
  //Allow empty/undefined db value
  if (db == undefined || db == null) {
    db = '';
  }
  return mongodb.DBRef(namespace, oid, db);
}

var Timestamp = function(high, low) {
  //Switch low/high bits to Timestamp constructor
  return mongodb.Timestamp(low, high);
}

//Create sandbox with BSON data types
exports.getSandbox = function() {
  return {
    Long: mongodb.Long,
    NumberLong: mongodb.Long,
    Double: mongodb.Double,
    NumberDouble: mongodb.Double,
    ObjectId: mongodb.ObjectID,
    ObjectID: mongodb.ObjectID,
    Timestamp: Timestamp,
    DBRef: DBRef,
    Dbref: DBRef,
    Binary: mongodb.Binary,
    BinData: mongodb.Binary,
    Code: mongodb.Code,
    Symbol: mongodb.Symbol,
    MinKey: mongodb.MinKey,
    MaxKey: mongodb.MaxKey,
    ISODate: Date,
    Date: Date
  };
};

//JSON.parse doesn't support BSON data types
//Document is evaluated in a vm in order to support BSON data types
//Sandbox contains BSON data type functions from node-mongodb-native
exports.toBSON = function(string) {
  var sandbox = exports.getSandbox();

  string = string.replace(/ISODate\(/g, "new ISODate(");

  vm.runInNewContext('doc = eval((' + string + '));', sandbox);

  return sandbox.doc;
};

//Convert BSON documents to string
exports.toString = function(doc) {
  //Use custom json stringify function from json.js
  return json.stringify(doc, null, '    ');
};
