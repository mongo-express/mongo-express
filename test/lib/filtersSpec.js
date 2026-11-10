import { expect } from 'chai';
import { Binary, BSON, ObjectId } from 'mongodb';

import { stringDocIDs, to_display, truncate } from '../../lib/filters.js';

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

    it('should shorten long strings and keep the full value in a tooltip', () => {
      expect(to_display('0123456789abcdef', 10))
        .to.equal('<span class="truncated-value" title="0123456789abcdef">012345678…</span>');
      expect(to_display('short', 10)).to.equal('short');
      expect(to_display(['0123456789abcdef', '0123456789abcdef'], 10))
        .to.equal('<span class="truncated-value" title="0123456789abcdef,0123456789abcdef">012345678…</span>');
    });

    it('should shorten long strings inside objects and arrays', () => {
      const input = { long: '0123456789abcdef', nested: ['0123456789abcdef', 'short'] };
      const expected = '<pre data-string-limit="10" data-full-json="{&quot;long&quot;:&quot;0123456789abcdef&quot;,'
        + '&quot;nested&quot;:[&quot;0123456789abcdef&quot;,&quot;short&quot;]}">{'
        + '\n  &quot;long&quot;: <span class="truncated-value" title="0123456789abcdef">&quot;012345678…&quot;</span>,'
        + '\n  &quot;nested&quot;: ['
        + '\n    <span class="truncated-value" title="0123456789abcdef">&quot;012345678…&quot;</span>,'
        + '\n    &quot;short&quot;'
        + '\n  ]'
        + '\n}</pre>';
      expect(to_display(input, 10)).to.equal(expected);
    });

    it('should omit the full JSON when it is not needed', () => {
      const input = { long: '0123456789abcdef', nested: ['0123456789abcdef', 'short'] };
      const result = to_display(input, 10, false);
      expect(result).to.not.contain('data-full-json');
      expect(result).to.not.contain('data-string-limit');
      expect(result).to.contain('<span class="truncated-value" title="0123456789abcdef">');
    });

    it('should escape the full value in a tooltip', () => {
      const result = to_display('a&b"c' + 'x'.repeat(60), 10);
      expect(result).to.contain('title="a&amp;b&quot;c');
    });

    it('should not shorten strings when the limit is 0', () => {
      expect(to_display('0123456789abcdef', 0)).to.equal('0123456789abcdef');
      expect(to_display({ long: '0123456789abcdef' }, 0))
        .to.equal('<pre>{\n  &quot;long&quot;: &quot;0123456789abcdef&quot;\n}</pre>');
    });
  });

  describe('truncate', function () {
    it('should shorten a long string', () => {
      expect(truncate('0123456789abcdef', 10)).to.equal('012345678…');
    });

    it('should leave a short string unchanged', () => {
      expect(truncate('short', 10)).to.equal('short');
    });

    it('should not shorten a string when the limit is 0', () => {
      expect(truncate('0123456789abcdef', 0)).to.equal('0123456789abcdef');
    });
  });
});
