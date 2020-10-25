'use strict';

const { expect } = require('chai');
const mongo = require('mongodb');
const csv = require('../../lib/csv');

const test = function (data, result) {
  expect(csv(data)).to.eql(result);
};

describe('CSV', function () {
  it('should handle nested objects', function () {
    const data = [{ a: { b: 2 } }];
    const result = '"a.b"\n2';
    test(data, result);
  });

  it('should handle schema difference between objects', function () {
    const data = [{ b: 2, a: 2 }, { c: 3, a: 4 }];
    const result = '"b","a","c"\n2,2,\n,4,3';
    test(data, result);
  });

  it('should handle mongo ObjectID', function () {
    const data = [{ a: { a: mongo.ObjectID('111111111111111111111111') } }];
    const result = '"a.a"\n"ObjectId(""111111111111111111111111"")"';
    test(data, result);
  });

  it('should handle simple array', function () {
    const data = [{ a: { b: [1, 2, 3] } }];
    const result = '"a.b"\n"[1,2,3]"';
    test(data, result);
  });

  it('should handle complex array', function () {
    const data = [{ a: { b: [{ a: 2 }, 3] } }];
    const result = '"a.b"\n"[{""a"":2},3]"';
    test(data, result);
  });
});
