'use strict';

const { expect } = require('chai');
const utils = require('../../lib/utils');

describe('utils', function () {
  describe('isValidDatabaseName', function () {
    it('should be valid', () => {
      const validNames = [
        'somedb_123123',
        'somedb-123123',
        'SOME_DB-1231',
        'SOMEDB&1231',
      ];
      validNames.forEach((n) => {
        expect(utils.isValidDatabaseName(n)).to.equal(true, `Expected "${n}" to be a valid name`);
      });
    });

    it('should be invalid', () => {
      const invalidNames = [
        '',
        'somedb 123123',
        'SOME$DB1231',
        'SOMEDB<1231',
        'SOMEDB>1231',
        '1234567890123456789012345678901234567890123456789012345678901234',
        'SOMEDB"123',
      ];
      invalidNames.forEach((n) => {
        expect(utils.isValidDatabaseName(n)).to.equal(false, `Expected "${n}" to be an invalid name`);
      });
    });
  });
});
