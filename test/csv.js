'use strict';

/*globals describe, it*/

var expect = require('chai').expect;
var mongo = require('mongodb');
var csv = require('../lib/csv');

var test = function (data, result) {
  expect(csv(data)).to.eql(result);
};

describe('CSV', function () {
  it('should handle nested objects', function () {
    var data = [{ a: { b: 2 } }];
    var result = '"a.b"\n2';
    test(data, result);
  });

  it('should handle schema difference between objects', function () {
    var data = [{ b: 2, a: 2 }, { c: 3, a: 4 }];
    var result = '"b","a","c"\n2,2,\n,4,3';
    test(data, result);
  });

  it('should handle mongo ObjectID', function () {
    var data = [{ a: { a: mongo.ObjectID('111111111111111111111111') } }];
    var result = '"a.a"\n"ObjectId(""111111111111111111111111"")"';
    test(data, result);
  });

  it('should handle simple array', function () {
    var data = [{ a: { b: [1, 2, 3] } }];
    var result = '"a.b"\n"[1,2,3]"';
    test(data, result);
  });

  it('should handle complex array', function () {
    var data = [{ a: { b: [{ a: 2 }, 3] } }];
    var result = '"a.b"\n"[{""a"":2},3]"';
    test(data, result);
  });
});
