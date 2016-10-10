'use strict';

exports.json = function (input) {
  return JSON.stringify(input, null, '    ');
};

exports.convertBytes = function (input) {
  input = parseInt(input, 10);
  if (input < 1024) {
    return input.toString() + ' Bytes';
  } else if (input < 1024 * 1024) {
    //Convert to KB and keep 2 decimal values
    input = Math.round((input / 1024) * 100) / 100;
    return input.toString() + ' KB';
  } else if (input < 1024 * 1024 * 1024) {
    input = Math.round((input / (1024 * 1024)) * 100) / 100;
    return input.toString() + ' MB';
  } else if (input < 1024 * 1024 * 1024 * 1024) {
    input = Math.round((input / (1024 * 1024 * 1024)) * 100) / 100;
    return input.toString() + ' GB';
  } else if (input < 1024 * 1024 * 1024 * 1024 * 1024) {
    input = Math.round((input / (1024 * 1024 * 1024 * 1024)) * 100) / 100;
    return input.toString() + ' TB';
  } else {
    return input.toString() + ' Bytes';
  }
};

exports.to_string = function (input) {
  return (input !== null && input !== undefined) ? input.toString() : '';
};

exports.to_display = function (input) {

  var entifyGTLTAmp = function (text) {
    // Turn < ? > into HTML entities, so data doesn't get interpreted by the browser
    return text.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  var retHTML = '';

  // Get nulls out of the way
  if (input === null || input === undefined) {
    return '';
  }

  // Large property
  if (
    typeof input === 'object' &&
    input.display &&
    input.display === '*** LARGE PROPERTY ***' &&
    input.preview &&
    input.roughSz &&
    input.humanSz &&
    input.attribu &&
    input.maxSize &&
    input._id
  ) {
    retHTML += '<div class="tooDamnBig" doc_id="' + encodeURIComponent(JSON.stringify(input._id)) + '" ' +
      'doc_prop="' + input.attribu + '" title="Max prop size: ' + input.maxSize + '">';
    retHTML += input.display + '<br>~' + input.humanSz;
    retHTML += '<br>Preview:' + input.preview;
    retHTML += '<br>Click to fetch this property';
    retHTML += '</div>';
    return retHTML;
  }

  // Large row
  if (
    typeof input === 'object' &&
    input.display &&
    input.display === '*** LARGE ROW ***' &&
    input.preview &&
    input.roughSz &&
    input.humanSz &&
    input.attribu &&
    input.maxSize &&
    input._id
  ) {
    retHTML += '<div class="tooDamnBig" doc_id="' + encodeURIComponent(JSON.stringify(input._id)) + '" ' +
      'doc_prop="' + input.attribu + '" title="Max row size: ' + input.maxSize + '">';
    retHTML += input.display + '<br>' + input.attribu + ': ~' + input.humanSz;
    retHTML += '<br>Preview:' + input.preview;
    retHTML += '<br>Click to fetch this property';
    retHTML += '</div>';
    return retHTML;
  }

  // Images inline
  if (
    typeof input === 'string' &&
    (
      input.substr(0, 22) === 'data:image/png;base64,' ||
      input.substr(0, 22) === 'data:image/gif;base64,' ||
      input.substr(0, 22) === 'data:image/jpg;base64,' ||
      input.substr(0, 23) === 'data:image/jpeg;base64,'
    )
  )  {
    return '<img src="' + input + '" style="max-height:100%; max-width:100%; "/>';
  }

  // Audio inline
  if (
    typeof input === 'string' &&
    (
      input.substr(0, 22) === 'data:audio/ogg;base64,' ||
      input.substr(0, 22) === 'data:audio/mp3;base64,'
    )
  )  {
    return '<audio controls style="width:45px;" src="' + input + '">Your browser does not support the audio element.</audio>';
  }

  // Video inline
  if (
    typeof input === 'string' &&
    (
      input.substr(0, 23) === 'data:video/webm;base64,' ||
      input.substr(0, 22) === 'data:video/mp4;base64,'  ||
      input.substr(0, 22) === 'data:video/ogv;base64,'
    )
  )  {
    return '<video controls><source type="' + input.substring(input.indexOf(':') + 1, input.indexOf(';')) + '" src="' + input + '"/>' +
      'Your browser does not support the video element.</video>';
  }

  if (typeof input === 'object' && input.toString().substr(0, 15) === '[object Object]') {
    return '<pre>' + JSON.stringify(input, null, 2) + '</pre>';
  }

  // Concatenate long strings
  if (typeof input === 'string' && input.length > 50) {
    return entifyGTLTAmp(input.substr(0, 49) + '…');
  }

  // Return basic .toString() since we've tried all other cases
  return entifyGTLTAmp(input.toString());
};

exports.stringDocIDs = function (input) {

  // Turns {_bsontype: ' ObjectID', id:12345... } into a plain string
  if (input && typeof input === 'object' && input._bsontype === 'ObjectID') {
    return input.toString();
  }

  return input;
};

exports.is_embeddedDocumentNotation = function (input) {
  return /^(?:[a-zA-Z0-9_]+\.)+[a-zA-Z0-9_]+/.test(input);
};
