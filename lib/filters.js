import { BSON, Binary } from 'mongodb';

import { addHyphensToUUID } from './utils.js';

export const json = function (input) {
  return JSON.stringify(input, null, '    ');
};

export const convertBytes = function (input) {
  input = Number.parseInt(input, 10);
  if (Number.isNaN(input)) {
    return '0 Bytes';
  }
  if (input < 1024) {
    return input.toString() + ' Bytes';
  }
  if (input < 1024 * 1024) {
    // Convert to KB and keep 2 decimal values
    input = Math.round((input / 1024) * 100) / 100;
    return input.toString() + ' KB';
  }
  if (input < 1024 * 1024 * 1024) {
    input = Math.round((input / (1024 * 1024)) * 100) / 100;
    return input.toString() + ' MB';
  }
  if (input < 1024 * 1024 * 1024 * 1024) {
    input = Math.round((input / (1024 * 1024 * 1024)) * 100) / 100;
    return input.toString() + ' GB';
  }
  if (input < 1024 * 1024 * 1024 * 1024 * 1024) {
    input = Math.round((input / (1024 * 1024 * 1024 * 1024)) * 100) / 100;
    return input.toString() + ' TB';
  }
  return input.toString() + ' Bytes';
};


export const to_string = function (input) {
  return (input !== null && input !== undefined) ? input.toString() : '';
};

const entifyGTLTAmp = function (text) {
  // Turn < ? > into HTML entities, so data doesn't get interpreted by the browser
  return text.replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;');
};


const DEFAULT_LIST_STRING_LIMIT = 50;

// The collection and GridFS lists render whole values in a table. A single
// long string (a URL, a base64 payload) widens its column and pushes the rest
// of the table out of view. Values are shortened for the lists only; document
// pages still show them in full.
const normalizeListStringLimit = function (limit) {
  return Number.isSafeInteger(limit) && limit >= 0 ? limit : DEFAULT_LIST_STRING_LIMIT;
};

const shortenString = function (value, limit) {
  if (limit === 0 || value.length <= limit) {
    return value;
  }
  return value.slice(0, limit - 1) + '…';
};

const isPlainObject = function (value) {
  return value !== null
    && typeof value === 'object'
    && (value.constructor === Object || value.constructor === undefined);
};

const isJsonOmitted = function (value) {
  return value === undefined || typeof value === 'function' || typeof value === 'symbol';
};

const escapeJsonString = function (value) {
  return entifyGTLTAmp(JSON.stringify(value));
};

// Plain text cells get the full value in a native tooltip when it is shortened.
const renderTextValue = function (value, limit) {
  const short = shortenString(value, limit);
  if (short === value) {
    return entifyGTLTAmp(value);
  }
  return '<span class="truncated-value" title="' + entifyGTLTAmp(value) + '">'
    + entifyGTLTAmp(short) + '</span>';
};

// JSON cells are rendered as HTML with one span per shortened string, so the
// full value is available as a tooltip. The text content stays valid JSON for
// the collapsible view in collection.js.
const renderJsonValue = function (value, limit, indent) {
  if (isJsonOmitted(value)) {
    return 'null';
  }
  if (typeof value === 'string') {
    const short = shortenString(value, limit);
    const text = escapeJsonString(short);
    if (short === value) {
      return text;
    }
    return '<span class="truncated-value" title="' + entifyGTLTAmp(value) + '">' + text + '</span>';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'null';
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const childIndent = indent + '  ';
    const items = value.map((item) => childIndent + renderJsonValue(item, limit, childIndent));
    return '[\n' + items.join(',\n') + '\n' + indent + ']';
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([, item]) => !isJsonOmitted(item));
    if (entries.length === 0) {
      return '{}';
    }
    const childIndent = indent + '  ';
    const items = entries.map(([key, item]) => childIndent + escapeJsonString(key) + ': '
      + renderJsonValue(item, limit, childIndent));
    return '{\n' + items.join(',\n') + '\n' + indent + '}';
  }
  if (typeof value.toJSON === 'function') {
    const jsonValue = value.toJSON();
    if (jsonValue !== value) {
      return renderJsonValue(jsonValue, limit, indent);
    }
  }
  return entifyGTLTAmp(JSON.stringify(value));
};

const containsLongString = function (value, limit) {
  if (limit === 0 || value === null || isJsonOmitted(value)) {
    return false;
  }
  if (typeof value === 'string') {
    return value.length > limit;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsLongString(item, limit));
  }
  if (isPlainObject(value)) {
    return Object.values(value).some((item) => containsLongString(item, limit));
  }
  if (typeof value.toJSON === 'function') {
    const jsonValue = value.toJSON();
    return jsonValue !== value && containsLongString(jsonValue, limit);
  }
  return false;
};

// URL columns bypass to_display and are rendered as links, so their text is
// shortened separately while the href keeps the full value.
export const truncate = function (input, limit = DEFAULT_LIST_STRING_LIMIT) {
  if (typeof input !== 'string') {
    return input;
  }
  return shortenString(input, normalizeListStringLimit(limit));
};

export const to_display = function (input, limit = DEFAULT_LIST_STRING_LIMIT, includeFullJson = true) {
  // Get nulls out of the way
  if (input === null || input === undefined) {
    return '';
  }

  const stringLimit = normalizeListStringLimit(limit);
  let retHTML = '';

  // Large property
  if (
    typeof input === 'object'
    && input.display
    && input.display === '*** LARGE PROPERTY ***'
    && input.preview
    && input.roughSz
    && input.humanSz
    && input.attribu
    && input.maxSize
    && input._id
  ) {
    retHTML += '<div class="tooDamnBig" doc_id="' + encodeURIComponent(JSON.stringify(input._id)) + '" '
      + 'doc_prop="' + entifyGTLTAmp(input.attribu) + '" title="Max prop size: ' + input.maxSize + '">';
    retHTML += input.display + '<br>~' + input.humanSz;
    retHTML += '<br>Preview:' + entifyGTLTAmp(input.preview);
    retHTML += '<br>Click to fetch this property';
    retHTML += '</div>';
    return retHTML;
  }

  // Large row
  if (
    typeof input === 'object'
    && input.display
    && input.display === '*** LARGE ROW ***'
    && input.preview
    && input.roughSz
    && input.humanSz
    && input.attribu
    && input.maxSize
    && input._id
  ) {
    retHTML += '<div class="tooDamnBig" doc_id="' + encodeURIComponent(JSON.stringify(input._id)) + '" '
      + 'doc_prop="' + entifyGTLTAmp(input.attribu) + '" title="Max row size: ' + input.maxSize + '">';
    retHTML += input.display + '<br>' + entifyGTLTAmp(input.attribu) + ': ~' + input.humanSz;
    retHTML += '<br>Preview:' +  entifyGTLTAmp(input.preview);
    retHTML += '<br>Click to fetch this property';
    retHTML += '</div>';
    return retHTML;
  }

  // Images inline
  if (
    typeof input === 'string'
    && (
      input.slice(0, 22) === 'data:image/png;base64,'
      || input.slice(0, 22) === 'data:image/gif;base64,'
      || input.slice(0, 22) === 'data:image/jpg;base64,'
      || input.slice(0, 23) === 'data:image/jpeg;base64,'
    )
  )  {
    return '<img src="' + entifyGTLTAmp(input) + '" style="max-height:100%; max-width:100%; "/>';
  }

  // Audio inline
  if (
    typeof input === 'string'
    && (
      input.slice(0, 22) === 'data:audio/ogg;base64,'
      || input.slice(0, 22) === 'data:audio/mp3;base64,'
    )
  )  {
    return '<audio controls style="width:45px;" src="' + entifyGTLTAmp(input) + '">Your browser does not support the audio element.</audio>';
  }

  // Video inline
  if (
    typeof input === 'string'
    && (
      input.slice(0, 23) === 'data:video/webm;base64,'
      || input.slice(0, 22) === 'data:video/mp4;base64,'
      || input.slice(0, 22) === 'data:video/ogv;base64,'
    )
  )  {
    const videoFormat = input.match(/^data:(.*);base64/)[1];
    return '<video controls><source type="' + videoFormat + '" src="' + entifyGTLTAmp(input) + '"/>'
      + 'Your browser does not support the video element.</video>';
  }

  if (typeof input === 'object' && input.toString().slice(0, 15) === '[object Object]') {
    if (!containsLongString(input, stringLimit)) {
      return '<pre>' + entifyGTLTAmp(JSON.stringify(input, null, 2)) + '</pre>';
    }
    const body = renderJsonValue(input, stringLimit, '');
    if (!includeFullJson) {
      return '<pre>' + body + '</pre>';
    }
    const fullJson = JSON.stringify(input);
    return '<pre data-string-limit="' + stringLimit + '" data-full-json="' + entifyGTLTAmp(fullJson) + '">'
      + body + '</pre>';
  }

  // Strings and other values keep the full text in a tooltip when shortened
  if (typeof input === 'string') {
    return renderTextValue(input, stringLimit);
  }

  // Return basic .toString() since we've tried all other cases
  return renderTextValue(input.toString(), stringLimit);
};

export const longToString = function (input) {
  return new BSON.Long(input.low, input.high, input.unsigned).toString();
};

function uuid4ToString(input) {
  const hex = input.toString('hex'); // same of input.buffer.toString('hex')
  return addHyphensToUUID(hex);
}

/**
 * @typedef {import('mongodb').Binary} Binary
 * @typedef {import('mongodb').ObjectId} ObjectId
 */

/**
 * Convert BSON into a plain string:
 * - { _bsontype: 'ObjectId', id: <Buffer> } => <ObjectId>
 * - { _bsontype: 'Binary', __id: undefined, sub_type: 4, position: 16, buffer: <Buffer> } => <UUID>
 * - { _bsontype: 'Binary', __id: undefined, sub_type: <number_not_4>, position: 16, buffer: <Buffer> } => <Binary>
 * @param {ObjectId|Binary|*} input
 * @returns {string}
 */
export const stringDocIDs = function (input) {
  if (input && typeof input === 'object') {
    switch (input._bsontype) {
      case 'ObjectId':
      case 'Long': {
        return input.toString();
      }
      case 'Binary': {
        if (input.sub_type === Binary.SUBTYPE_UUID) {
          return uuid4ToString(input);
        }
        return input.toJSON();
      }
      default: {
        return input;
      }
    }
  }

  return input;
};


export const is_URL = function (input) {
  return /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)[\da-z]+([.-][\da-z]+)*\.[a-z]{2,5}(:\d{1,5})?(\/.*)?$/.test(input);
};
