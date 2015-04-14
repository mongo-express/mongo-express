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

// This function as the name suggests attempts to parse
// the free form string in to BSON, since the possibilities of failure
// are higher, this function uses a try..catch
exports.toSafeBSON = function(string) {
	try{
		var bsonObject = exports.toBSON(string);
		return bsonObject;
	}
	catch(err){
		return null;
	}
};

// Converts string to ObjectID.  TODO: Add validation.
exports.toObjectId = function(string){
  var sandbox = exports.getSandbox();
  // Strip quotes
  string = string.replace('"', '').replace('"', '');
  // Convert ObjectId("526ddf5a9f610ffd26000001") to 526ddf5a9f610ffd26000001
  string = string.replace(/ObjectID\(/i, '').replace(')', '');
  // Make sure it's a 24-character string to prevent errors.
  if (string.length == 24) {
    return sandbox.ObjectID(string);
  } else {
    return false;
  }
}

//Convert BSON documents to string
exports.toString = function(doc) {
  //Use custom json stringify function from json.js
  return json.stringify(doc, null, '    ');
};

exports.toJsonString = function(doc) {
  var sJson = json.stringify(doc, null);
  sJson = sJson.replace(/ObjectID\(/g, '{ "$oid": ');
  sJson = sJson.replace(/\)/g, ' }');
  return sJson;
};
