'use strict';

var flat = require('flat');
var csv = require('json2csv');
var isPlainObject = require('lodash.isplainobject');

var handleObject = function (data) {
  for (var x in data) {
    if (data[x] && data[x].constructor.name === 'ObjectID') {
      data[x] = ['ObjectId("', data[x], '")'].join('');
    } else if (isPlainObject(data[x])) {
      handleObject(data[x]);
    }
  }
};

module.exports = function (data) {
  for (var i = 0, ii = data.length; i < ii; i++) {
    var current = data[i];
    handleObject(current);
    data[i] = flat(current, { safe: true });
  }
  return csv({ data: data });
};
