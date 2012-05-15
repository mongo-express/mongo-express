var mongodb = require('mongodb');
var vm = require('vm');


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

//Function for converting BSON docs to string representation
exports.toString = function(doc) {
  //Let JSON.stringify do most of the hard work
  //Then use replacer function to replace the BSON data

  var replacer = function(obj) {
    var stack = new Array();

    return function(key, value) {
      if (key == '') {
        return value;
      }

      //Use a stack to recursively replace BSON values with BSON functions
      //Needed to parse documents with >1 depth
      var o = stack.pop();
      if (o == undefined) {
        o = obj[key];
      } else {
        o = o[key];
      }

      //Replace data types with associated functions
      //JSON automatically converts values to strings
      //$$rep$$ placeholder is used to remove extra quotation marks at the end
      //$$replace$$ is placeholder to add unescaped quotation marks
      if (o instanceof mongodb.ObjectID) {
        return '$$rep$$ObjectId($$replace$$' + value + '$$replace$$)$$rep$$';
      } else if (o instanceof mongodb.Timestamp) {
        return '$$rep$$Timestamp(' + o.high_ + ', ' + o.low_ + ')$$rep$$';
      } else if (o instanceof Date) {
        return '$$rep$$ISODate($$replace$$' + value + '$$replace$$)$$rep$$';
      } else if (o instanceof mongodb.DBRef) {
        if (o.db == '') {
          return '$$rep$$DBRef($$replace$$' + o.namespace + '$$replace$$, $$replace$$' + o.oid + '$$replace$$)$$rep$$';
        } else {
          return '$$rep$$DBRef($$replace$$' + o.namespace + '$$replace$$, $$replace$$' + o.oid + '$$replace$$, $$replace$$' + o.db + '$$replace$$)$$rep$$';
        }
      } else if (o instanceof mongodb.Code) {
        return '$$rep$$Code($$replace$$' + o.code + '$$replace$$)$$rep$$';
      } else if (o instanceof mongodb.MinKey) {
        return '$$rep$$MinKey()$$rep$$';
      } else if (o instanceof mongodb.MaxKey) {
        return '$$rep$$MaxKey()$$rep$$';
      } else if (o instanceof mongodb.Symbol) {
        return '$$rep$$Symbol($$replace$$' + value + '$$replace$$)$$rep$$';
      } else if (typeof o == 'object') {
        //Add current depth object to stack
        for (var i in o) {
          stack.push(o);
        }
        return value;
      } else {
        return value;
      }
    };
  };

  var newDoc = JSON.stringify(doc, replacer(doc), '    ');

  newDoc = newDoc.replace(/"\$\$rep\$\$/gi, "");
  newDoc = newDoc.replace(/\$\$rep\$\$"/gi, "");
  newDoc = newDoc.replace(/\$\$replace\$\$/gi, "\"");

  return newDoc;
};
