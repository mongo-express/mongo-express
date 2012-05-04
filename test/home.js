var app = require('../app');
var db = require('./setupDatabase');
var expect = require('chai').expect;
var Browser = require('zombie');
var browser = new Browser();

describe('Home Page', function() {
  before(function(done) {
    app.listen(3000);
    db.open(function(err, conn) {
      db = conn;
      done();
    });
  });

  describe('Server Status', function() {
    it('should show MongoDB version', function(done) {

      db.admin(function(err, adminDb) {
        adminDb.serverStatus(function(err, info) {
          browser.visit('http://localhost:3000/', function() {
            expect(browser).to.have.property('success').to.be.true;
            expect(browser.html(":contains(" + info.version + ")")).to.have.string(info.version);
            
            done();
          });
        });
      });

    });
  });
});
