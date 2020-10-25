'use strict';

let flat = require('flat');
let csv = require('json2csv');
let { isPlainObject } = require('lodash');

const handleObject = function (data) {
  for (let x in data) {
    if (data[x] && data[x].constructor.name === 'ObjectID') {
      data[x] = ['ObjectId("', data[x], '")'].join('');
    } else if (isPlainObject(data[x])) {
      handleObject(data[x]);
    }
  }
};

module.exports = function (data) {
  for (let i = 0, ii = data.length; i < ii; i++) {
    let current = data[i];
    handleObject(current);
    data[i] = flat(current, { safe: true });
  }
  return csv({ data: data });
};
