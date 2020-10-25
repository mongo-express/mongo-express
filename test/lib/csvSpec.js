'use strict';

let { expect } = require('chai');
let mongo = require('mongodb');
let csv = require('../../lib/csv');

let test = function (data, result) {
  expect(csv(data)).to.eql(result);
};

describe('CSV', function () {
  it('should handle nested objects', function () {
    let data = [{ a: { b: 2 } }];
    let result = '"a.b"\n2';
    test(data, result);
  });

  it('should handle schema difference between objects', function () {
    let data = [{ b: 2, a: 2 }, { c: 3, a: 4 }];
    let result = '"b","a","c"\n2,2,\n,4,3';
    test(data, result);
  });

  it('should handle mongo ObjectID', function () {
    let data = [{ a: { a: mongo.ObjectID('111111111111111111111111') } }];
    let result = '"a.a"\n"ObjectId(""111111111111111111111111"")"';
    test(data, result);
  });

  it('should handle simple array', function () {
    let data = [{ a: { b: [1, 2, 3] } }];
    let result = '"a.b"\n"[1,2,3]"';
    test(data, result);
  });

  it('should handle complex array', function () {
    let data = [{ a: { b: [{ a: 2 }, 3] } }];
    let result = '"a.b"\n"[{""a"":2},3]"';
    test(data, result);
  });
});
