'use strict';

const Bluebird = require('bluebird');

exports.asPromise = function (fct) {
  return Bluebird.fromCallback(fct);
};

exports.timeoutPromise = function (delay) {
  return Bluebird.delay(delay);
};
