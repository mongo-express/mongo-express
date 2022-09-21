import { Binary, ObjectId } from 'bson';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
// eslint-disable-next-line camelcase
import { stringDocIDs, to_display } from '../../lib/filters.js';

describe('filters', function () {
  describe('stringDocIDs', function () {
    describe('should test a Binary BSON type', () => {
      it('not v4');
      it('v4', () => {
        const UUID = uuidv4();
        const hex = UUID.split('-').join('');
        const buffer = new Buffer.from(hex, 'hex');
        const input = new Binary(buffer, Binary.SUBTYPE_UUID);
        expect(stringDocIDs(input)).to.equal(UUID);
      });
    });
    it('should test an ObjectID BSON type', () => {
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
      const result = to_display('<script>window.alert(\'alert 1!\')</script>');
      expect(result).to.equal('&lt;script&gt;window.alert(&apos;alert 1!&apos;)&lt;/script&gt;');
    });

    it('should escape properly an object', () => {
      const result = to_display({ subkey: '<script>window.alert(\'alert 2!\')</script>' });
      expect(result).to.equal('<pre>{\n  &quot;subkey&quot;: &quot;&lt;script&gt;window.alert(&apos;alert 2!&apos;)&lt;/script&gt;&quot;\n}</pre>');
    });
  });
});
