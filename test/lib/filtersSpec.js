'use strict';

const { expect } = require('chai');
const filters = require('../../lib/filters');

describe('filters', function () {
  describe('to_display', function () {
    it('should escape properly a string', () => {
      const result = filters.to_display('<script>window.alert(\'alert 1!\')</script>');
      expect(result).to.equal('&lt;script&gt;window.alert(&apos;alert 1!&apos;)&lt;/script&gt;');
    });

    it('should escape properly an object', () => {
      const result = filters.to_display({ subkey: '<script>window.alert(\'alert 2!\')</script>' });
      expect(result).to.equal('<pre>{\n  &quot;subkey&quot;: &quot;&lt;script&gt;window.alert(&apos;alert 2!&apos;)&lt;/script&gt;&quot;\n}</pre>');
    });
  });
});
