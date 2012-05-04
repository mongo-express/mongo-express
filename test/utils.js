var utils = require('../utils');
var expect = require('chai').expect;

describe('Utils', function() {
  describe('parseCollectionName', function() {
    it('should return the collection and database of a full collection namespace', function() {
      var result = utils.parseCollectionName('databaseName.collection.x.y');

      expect(result).to.have.property('name', 'collection.x.y').to.be.a('string');
      expect(result).to.have.property('database', 'databaseName').to.be.a('string');
    });
  });
});
