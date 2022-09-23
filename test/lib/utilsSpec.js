import { expect } from 'chai';
import { isValidDatabaseName } from '../../lib/utils.js';

describe('utils', function () {
  describe('isValidDatabaseName', function () {
    it('should be valid', () => {
      const validNames = [
        'somedb_123123',
        'somedb-123123',
        'SOME_DB-1231',
        'SOMEDB&1231',
      ];
      for (const validName of validNames) {
        expect(isValidDatabaseName(validName)).to.equal(true, `Expected "${validName}" to be a valid name`);
      }
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
      for (const invalidName of invalidNames) {
        expect(isValidDatabaseName(invalidName)).to.equal(false, `Expected "${invalidName}" to be an invalid name`);
      }
    });
  });
});
