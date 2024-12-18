import { expect } from 'chai';
import { Binary, BSON, ObjectId } from 'mongodb';
// eslint-disable-next-line camelcase
import { stringDocIDs, to_display } from '../../lib/filters.js';

const { UUID } = BSON;

describe('filters', function () {
  describe('stringDocIDs', function () {
    describe('should test a Binary BSON type', () => {
      it('not v4');
      it('v4', () => {
        const uuid = new UUID().toString();
        const hex = uuid.split('-').join('');
        const buffer = new Buffer.from(hex, 'hex');
        const input = new Binary(buffer, Binary.SUBTYPE_UUID);
        expect(stringDocIDs(input)).to.equal(uuid);
      });
    });
    it('should test an ObjectId BSON type', () => {
      const input = new ObjectId();
      expect(stringDocIDs(input)).to.equal(input.toString());
    });
    it('should test a not BSON type', () => {
      const input = {};
      expect(stringDocIDs(input)).to.equal(input);
    });
  });
  describe('to_display', function () {
    it('should escape properly a string', () => {
      const result = to_display('<script>globalThis.alert(\'alert 1!\')</script>');
      expect(result).to.equal('&lt;script&gt;globalThis.alert(&apos;alert 1!&apos;)&lt;/script&gt;');
    });

    it('should escape properly an object', () => {
      const result = to_display({ subkey: '<script>globalThis.alert(\'alert 2!\')</script>' });
      expect(result).to.equal('<pre>{\n  &quot;subkey&quot;: &quot;&lt;script&gt;globalThis.alert(&apos;alert 2!&apos;)&lt;/script&gt;&quot;\n}</pre>');
    });
  });
});
