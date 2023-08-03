import querystring from 'node:querystring';
import _ from 'lodash-es';

// Given some size in bytes, returns it in a converted, friendly size
// credits: http://stackoverflow.com/users/1596799/aliceljm
export const bytesToSize = function bytesToSize(bytes) {
  if (bytes === 0) return '0 Byte';
  const k = 1000;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // eslint-disable-next-line no-restricted-properties
  return (bytes / (k ** i)).toPrecision(3) + ' ' + sizes[i];
};

export const colsToGrid = function (cols) {
  // Generate list of GridFS buckets
  // takes databases, filters by having suffix of '.files' and also a corresponding '.chunks' in the DB list, then returns just the prefix name.

  // cols comes in an object of all databases and all their collections
  // return an object of all databases and all potential GridFS x.files & x.chunks

  const rets = _.clone(cols);

  _.each(rets, (val, key) => {
    rets[key] = _.map(
      _.filter(rets[key], (col) => col.toString().slice(-6) === '.files' && _.intersection(rets[key], [col.toString().slice(0, -6) + '.chunks'])),
      (col) => col.toString().slice(0, -6),
    ).sort();
  });

  return rets;
};

export const deepmerge = function (target, src) {
  if (Array.isArray(src)) {
    target = target || [];
    const dst = [...target];
    for (const [i, e] of src.entries()) {
      if (dst[i] === undefined) {
        dst[i] = e;
      } else if (typeof e === 'object') {
        dst[i] = deepmerge(target[i], e);
      } else if (!target.includes(e)) {
        dst.push(e);
      }
    }
    return dst;
  }

  const dst = {};
  if (target && typeof target === 'object') {
    for (const key of Object.keys(target)) {
      dst[key] = target[key];
    }
  }
  for (const key of Object.keys(src)) {
    if (typeof src[key] !== 'object' || !src[key]) {
      dst[key] = src[key];
    } else if (target[key]) {
      dst[key] = deepmerge(target[key], src[key]);
    } else {
      dst[key] = src[key];
    }
  }
  return dst;
};

export const roughSizeOfObject = function (object) {
  const objectList = [];
  const recurse = function (value) {
    let bytes = 0;

    if (typeof value === 'boolean') {
      bytes = 4;
    } else if (typeof value === 'string') {
      bytes = value.length * 2;
    } else if (typeof value === 'number') {
      bytes = 8;
    } else if (typeof value === 'object' && !objectList.includes(value)) {
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

export const buildDatabaseURL = function (base, dbName) {
  return base + 'db/' + encodeURIComponent(dbName);
};

export const buildCollectionURL = function (base, dbName, collectionName, queryOptions = {}) {
  let url = buildDatabaseURL(base, dbName) + '/' + encodeURIComponent(collectionName);

  if (Object.keys(queryOptions).length > 0) {
    url += '?' + querystring.encode(queryOptions);
  }
  return url;
};

export const buildDocumentURL = function (base, dbName, collectionName, documentId, queryOptions = {}) {
  let url = buildCollectionURL(base, dbName, collectionName) + '/' + encodeURIComponent(JSON.stringify(documentId));

  if (Object.keys(queryOptions).length > 0) {
    url += '?' + querystring.encode(queryOptions);
  }

  return url;
};

export const addHyphensToUUID = function (hex) {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

export const isValidDatabaseName = function (name) {
  if (!name || name.length > 63) {
    return false;
  }

  // https://docs.mongodb.com/manual/reference/limits/#naming-restrictions
  if (/[ "$*./:<>?|]/.test(name)) {
    return false;
  }

  return true;
};

export const validateCollectionName = function (name) {
  if (name === undefined || name.length === 0) {
    return { error: true, message: 'You forgot to enter a collection name!' };
  }

  // Collection names must begin with a letter, underscore, hyphen or slash, (tested v3.2.4)
  // and can contain only letters, underscores, hyphens, numbers, dots or slashes
  if (!/^[/A-Z_a-z-][\w./-]*$/.test(name)) {
    return { error: true, message: 'That collection name is invalid.' };
  }
  return { error: false };
};
