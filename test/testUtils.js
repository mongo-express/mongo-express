'use strict';

exports.asPromise = function asPromise(fct) {
  return new Promise((resolve, reject) =>
    fct((err, result) => {
      if (err) reject(err);
      else resolve(result);
    })
  );
};
