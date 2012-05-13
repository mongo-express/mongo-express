var mongodb = require('mongodb');

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
    Binary: mongodb.Binary,
    BinData: mongodb.Binary,
    Code: mongodb.Code,
    Symbol: mongodb.Symbol,
    MinKey: mongodb.MinKey,
    MaxKey: mongodb.MaxKey,
    ISODate: Date
  };
};
