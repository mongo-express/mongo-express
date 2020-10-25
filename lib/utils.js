'use strict';

const _ = require('lodash');

// Given some size in bytes, returns it in a converted, friendly size
// credits: http://stackoverflow.com/users/1596799/aliceljm
exports.bytesToSize = function bytesToSize(bytes) {
  if (bytes === 0) return '0 Byte';
  const k = 1000;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // eslint-disable-next-line no-restricted-properties
  return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
};

exports.colsToGrid = function (cols) {
  // Generate list of GridFS buckets
  // takes databases, filters by having suffix of '.files' and also a corresponding '.chunks' in the DB list, then returns just the prefix name.

  // cols comes in an object of all databases and all their collections
  // return an object of all databases and all potential GridFS x.files & x.chunks

  const rets = _.clone(cols);

  _.each(rets, (val, key) => {
    rets[key] = _.map(
      _.filter(rets[key], (col) => col.toString().substr(-6) === '.files' && _.intersection(rets[key], [col.toString().slice(0, -6) + '.chunks'])),
      (col) => col.toString().slice(0, -6),
    ).sort();
  });

  return rets;
};

exports.deepmerge = function (target, src) {
  const array = Array.isArray(src);
  let dst = array ? [] : {};

  if (array) {
    target = target || [];
    dst = dst.concat(target);
    src.forEach(function (e, i) {
      if (typeof dst[i] === 'undefined') {
        dst[i] = e;
      } else if (typeof e === 'object') {
        dst[i] = exports.deepmerge(target[i], e);
      } else if (target.indexOf(e) === -1) {
        dst.push(e);
      }
    });
  } else {
    if (target && typeof target === 'object') {
      Object.keys(target).forEach(function (key) {
        dst[key] = target[key];
      });
    }

    Object.keys(src).forEach(function (key) {
      if (typeof src[key] !== 'object' || !src[key]) {
        dst[key] = src[key];
      } else if (!target[key]) {
        dst[key] = src[key];
      } else {
        dst[key] = exports.deepmerge(target[key], src[key]);
      }
    });
  }

  return dst;
};

exports.roughSizeOfObject = function (object) {
  const objectList = [];
  const recurse = function (value) {
    let bytes = 0;

    if (typeof value === 'boolean') {
      bytes = 4;
    } else if (typeof value === 'string') {
      bytes = value.length * 2;
    } else if (typeof value === 'number') {
      bytes = 8;
    } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
      objectList[objectList.length] = value;

      for (const i in value) {
        bytes += 8; // an assumed existence overhead
        bytes += recurse(value[i]);
      }
    }

    return bytes;
  };

  return recurse(object);
};

exports.buildDatabaseURL = function (base, dbName) {
  return base + 'db/' + encodeURIComponent(dbName);
};

exports.buildCollectionURL = function (base, dbName, collectionName) {
  return exports.buildDatabaseURL(base, dbName) + '/' + encodeURIComponent(collectionName);
};

exports.isValidDatabaseName = function (name) {
  if (!name || name.length > 63) {
    return false;
  }

  // https://docs.mongodb.com/manual/reference/limits/#naming-restrictions
  if (name.match(/[/. "$*<>:|?]/)) {
    return false;
  }

  return true;
};
