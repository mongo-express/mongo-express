import { expect } from 'chai';

import { maskConnectionString } from '../../lib/db.js';

describe('lib/db', () => {
  describe('maskConnectionString', () => {
    it('hides the password', () => {
      expect(maskConnectionString('mongodb://user:secret@localhost:27017/db'))
        .to.equal('mongodb://user:****@localhost:27017/db');
    });

    it('hides the password on mongodb+srv', () => {
      expect(maskConnectionString('mongodb+srv://user:secret@cluster.example.com/db'))
        .to.equal('mongodb+srv://user:****@cluster.example.com/db');
    });

    it('leaves a credential-less URI untouched', () => {
      expect(maskConnectionString('mongodb://localhost:27017')).to.equal('mongodb://localhost:27017');
    });

    it('leaves a user-only URI untouched', () => {
      expect(maskConnectionString('mongodb://user@localhost:27017')).to.equal('mongodb://user@localhost:27017');
    });

    // Regression: this used to throw a TypeError and hide the actual connection error.
    for (const value of [undefined, null, '']) {
      it(`reports ${JSON.stringify(value)} as <none> instead of throwing`, () => {
        expect(maskConnectionString(value)).to.equal('<none>');
      });
    }

    // Regression: the previous regex chained lazy quantifiers and backtracked polynomially.
    it('stays linear on adversarial input', () => {
      const evil = 'mongo'.repeat(50_000) + '://' + ':'.repeat(50_000);
      const started = process.hrtime.bigint();
      maskConnectionString(evil);
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

      expect(elapsedMs).to.be.lessThan(100);
    });
  });
});
