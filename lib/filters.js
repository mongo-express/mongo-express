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

// eslint-disable-next-line camelcase
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

// eslint-disable-next-line camelcase
export const to_display = function (input) {
  let retHTML = '';

  // Get nulls out of the way
  if (input === null || input === undefined) {
    return '';
  }

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
    return '<pre>' + entifyGTLTAmp(JSON.stringify(input, null, 2)) + '</pre>';
  }

  // Concatenate long strings
  if (typeof input === 'string' && input.length > 50) {
    return entifyGTLTAmp(input.slice(0, 49) + '…');
  }

  // Return basic .toString() since we've tried all other cases
  return entifyGTLTAmp(input.toString());
};

function uuid4ToString(input) {
  const hex = input.toString('hex'); // same of input.buffer.toString('hex')
  return addHyphensToUUID(hex);
}

/**
 * @typedef {import('bson').Binary} Binary
 * @typedef {import('bson').ObjectId} ObjectId
 */

/**
 * Convert BSON into a plain string:
 * - { _bsontype: 'ObjectID', id: <Buffer> } => <ObjectId>
 * - { _bsontype: 'Binary', __id: undefined, sub_type: 4, position: 16, buffer: <Buffer> } => <UUID>
 * - { _bsontype: 'Binary', __id: undefined, sub_type: <number_not_4>, position: 16, buffer: <Buffer> } => <Binary>
 * @param {ObjectId|Binary|*} input
 * @returns {string}
 */
export const stringDocIDs = function (input) {
  if (input && typeof input === 'object') {
    switch (input._bsontype) {
      case 'Binary': {
        if (input.sub_type === 4) {
          return uuid4ToString(input);
        }
        return input.toJSON();
      }
      case 'ObjectID': {
        return input.toString();
      }
      default: {
        return input;
      }
    }
  }

  return input;
};

// eslint-disable-next-line camelcase
export const is_URL = function (input) {
  return /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)[\da-z]+([.-][\da-z]+)*\.[a-z]{2,5}(:\d{1,5})?(\/.*)?$/.test(input);
};
