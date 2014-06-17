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
  } else {
    return input.toString() + ' Bytes';
  }
};

exports.to_string = function (input) {
    return input != null ? input.toString() : "";
};
