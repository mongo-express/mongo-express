'use strict';

exports.json = function(input) {
  return JSON.stringify(input, null, '    ');
};

exports.convertBytes = function(input) {
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

exports.to_string = function(input) {
  return (input !== null && input !== undefined) ? input.toString() : '';
};

exports.to_display = function(input) {

  if (typeof input === 'string' && (input.substr(0, 22) === 'data:image/png;base64,' || input.substr(0, 22) === 'data:image/gif;base64,'))  {
    return '<img src="' + input + '"/>';
  }

  if (input !== null && input !== undefined) {
    return input.toString();
  }

  return '';
};

exports.is_embeddedDocumentNotation = function(input) {
  return /^(?:[a-zA-Z0-9_]+\.)+[a-zA-Z0-9_]+/.test(input);
};
