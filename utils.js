var mongodb = require('mongodb');
var vm = require('vm');

//Given a full collection namescpace, returns the database and collection
exports.parseCollectionName = function parseCollectionName(full_name) {
  var coll_parts = full_name.split('.');

  if (coll_parts.length <= 1) {
    console.error('Cannot parse collection name!');
  }

  var database = coll_parts.splice(0,1);
  return { name: coll_parts.join('.'), database: database.toString() };
};

//Create sandbox with BSON data types
exports.getSandbox = function() {
  return {
    Long: mongodb.Long,
    NumberLong: mongodb.Long,
    Double: mongodb.Double,
    NumberDouble: mongodb.Double,
    ObjectId: mongodb.ObjectID,
    ObjectID: mongodb.ObjectID,
    Timestamp: mongodb.Timestamp,
    DBRef: mongodb.DBRef,
    Dbref: mongodb.DBRef,
    Binary: mongodb.Binary,
    BinData: mongodb.Binary,
    Code: mongodb.Code,
    Symbol: mongodb.Symbol,
    MinKey: mongodb.MinKey,
    MaxKey: mongodb.MaxKey,
    ISODate: Date
  };
};

//JSON.parse doesn't support BSON data types
//Document is evaluated in a vm in order to support BSON data types
//Sandbox contains BSON data type functions from node-mongodb-native
exports.stringToBSON = function(string) {
  var sandbox = exports.getSandbox();

  string = string.replace(/ISODate\(/g, "new ISODate(");

  vm.runInNewContext('doc = eval((' + string + '));', sandbox);

  return sandbox.doc;
};

//Function for converting BSON docs to string representation
exports.docToString = function(doc) {
  //Let JSON.stringify do most of the hard work
  //Then use replacer function to replace the BSON data

  var replacer = function(key, value) {
    if (doc[key] instanceof mongodb.ObjectID) {
      return '""ObjectId($$replace$$' + value + '$$replace$$)""';
    } else if (doc[key] instanceof mongodb.Long) {
      return '""Long($$replace$$' + value + '$$replace$$)""';
    } else if (doc[key] instanceof mongodb.Double) {
      return '""Double($$replace$$' + value + '$$replace$$)""';
    } else if (doc[key] instanceof mongodb.Timestamp) {
      return '""Timestamp($$replace$$' + value + '$$replace$$)""';
    } else if (doc[key] instanceof Date) {
      return '""ISODate($$replace$$' + value + '$$replace$$)""';
    } else {
      return value;
    }
  };

  var newDoc = JSON.stringify(doc, replacer, '    ');

  newDoc = newDoc.replace(/"\\"\\"/gi, "");
  newDoc = newDoc.replace(/\\"\\""/gi, "");
  newDoc = newDoc.replace(/\$\$replace\$\$/gi, "\"");

  return newDoc;
};
