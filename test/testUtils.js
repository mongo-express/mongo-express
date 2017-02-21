'use strict';

exports.asPromise = function (fct) {
  return new Promise((resolve, reject) =>
    fct((err, result) => {
      if (err) reject(err);
      else resolve(result);
    })
  );
};

exports.timeoutPromise = function (delay) {
  return new Promise(resolve => setTimeout(resolve, delay));
};
