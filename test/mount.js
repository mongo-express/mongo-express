var request = require('supertest');
var express = require('express');

var app = require('../')();
var image = '/images/glyphicons-halflings-white.png';

describe('Mount on root', function () {
  var parent = express();
  parent.use('/', app);
  it('should serve static files', function (done) {
    request(parent)
      .get(image)
      .expect(200, done);
  });
});

describe('Mount on path: ', function () {
  var parent = express();
  var path = '/me';
  parent.use(path, app);
  describe('static files should be served', function () {
    it('on path', function (done) {
      request(parent)
        .get(path + image)
        .expect(200, done);
    });
    it('not on root', function (done) {
      request(parent)
        .get(image)
        .expect(404, done);
    });
  });
});
