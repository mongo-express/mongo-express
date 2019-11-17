'use strict';

const parser = require('mongodb-query-parser');
const ESJON = require('mongodb-extended-json');
const mongodb = require('mongodb');

exports.toBSON = function (string) {
  return parser(string);
};

// This function as the name suggests attempts to parse
// the free form string in to BSON, since the possibilities of failure
// are higher, this function uses a try..catch
exports.toSafeBSON = function (string) {
  try {
    var bsonObject = exports.toBSON(string);
    return bsonObject;
  } catch (err) {
    return null;
  }
};

exports.parseObjectId = function (string) {
  if (/^[0-9a-f]{24}$/i.test(string)) {
    return mongodb.ObjectId(string);
  }
  return exports.toBSON(string);
};

//Convert BSON documents to string
exports.toString = function (doc) {
  return parser.toJSString(doc, '    ');
};

exports.toJsonString = function (doc) {
  return ESJON.stringify(doc);
};
