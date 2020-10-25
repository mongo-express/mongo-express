'use strict';

const parser = require('mongodb-query-parser');
const bson = require('bson');

const { EJSON } = bson;

exports.toBSON = function (string) {
  return parser(string);
};

// This function as the name suggests attempts to parse
// the free form string in to BSON, since the possibilities of failure
// are higher, this function uses a try..catch
exports.toSafeBSON = function (string) {
  try {
    return exports.toBSON(string);
  } catch (err) {
    return null;
  }
};

exports.parseObjectId = function (string) {
  if (/^[0-9a-f]{24}$/i.test(string)) {
    return new bson.ObjectId(string);
  }
  return exports.toBSON(string);
};

// Convert BSON documents to string
exports.toString = function (doc) {
  return parser.toJSString(doc, '    ');
};

exports.toJsonString = function (doc) {
  return EJSON.stringify(EJSON.serialize(doc));
};
