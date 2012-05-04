var db = require('./setupDatabase');
var expect = require('chai').expect;
var Browser = require('zombie');
var browser = new Browser();
var collection;

describe('Collections', function() {
  before(function(done) {
    db.open(function(err, conn) {
      db = conn;

      db.createCollection('mongoExpressTest', function(err, coll) {
        collection = coll;
        done();
      });
    });
  });

  after(function() {
    db.dropCollection('mongoExpressTest');
  });

  describe('Home', function() {
    it('should show the collection home page', function(done) {

      browser.visit('http://localhost:8081/db/test/test', function() {
        expect(browser).to.have.property('success').to.be.true;

        expect(browser.text('#pageTitle')).to.be.string('Viewing Collection: test');
        done();
      });

    });
  });

  describe('Stats', function() {
    it('should show number of documents in collection', function(done) {

      collection.stats(function(err, stats) {
        browser.visit('http://localhost:8081/db/test/test', function() {
          expect(browser.text('#collStatsCount')).to.be.string(stats.count);
          done();
        });
      });

    });
  });
});
