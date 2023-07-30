import { expect } from 'chai';
import { BSON } from 'mongodb';
import { addHyphensToUUID, isValidDatabaseName } from '../../lib/utils.js';

const { UUID } = BSON;

describe('utils', function () {
  describe('addHyphensToUUID', function () {
    it('should be valid', () => {
      const uuid = new UUID().toString();
      const hex = uuid.split('-').join('');
      expect(addHyphensToUUID(hex)).to.equal(uuid);
    });
  });
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
