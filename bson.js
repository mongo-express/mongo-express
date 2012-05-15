var mongodb = require('mongodb');
var vm = require('vm');

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
exports.toBSON = function(string) {
  var sandbox = exports.getSandbox();

  string = string.replace(/ISODate\(/g, "new ISODate(");

  vm.runInNewContext('doc = eval((' + string + '));', sandbox);

  return sandbox.doc;
};

//Function for converting BSON docs to string representation
exports.toString = function(doc) {
  //Let JSON.stringify do most of the hard work
  //Then use replacer function to replace the BSON data

  var replacer = function(key, value) {
    if (doc[key] instanceof mongodb.ObjectID) {
      return '""ObjectId($$replace$$' + value + '$$replace$$)""';
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
