import { PassThrough } from 'node:stream';
import { expect } from 'chai';

import { isValidConnectionString, promptForConnectionString } from '../../lib/prompt.js';

// A writable that keeps everything written to it, so tests can assert on what the user saw.
const collectingOutput = () => {
  const output = new PassThrough();
  output.setEncoding('utf8');
  const chunks = [];
  output.on('data', (c) => chunks.push(c));
  output.text = () => chunks.join('');
  return output;
};

// Feed the given lines, then end the stream so nothing can block forever.
const scriptedInput = (...lines) => {
  const input = new PassThrough();
  for (const line of lines) input.write(`${line}\n`);
  input.end();
  return input;
};

describe('lib/prompt', () => {
  describe('isValidConnectionString', () => {
    for (const uri of [
      'mongodb://localhost:27017',
      'mongodb://user:pass@localhost:27017/db',
      'mongodb+srv://user:pass@cluster.example.com/db?retryWrites=true',
      'mongodb://host1:27017,host2:27017/db',
    ]) {
      it(`accepts ${uri}`, () => {
        expect(isValidConnectionString(uri)).to.equal(true);
      });
    }

    // The original pattern was unanchored, so anything merely containing a URI passed.
    for (const value of [
      'garbage mongodb://host',
      'mongodb://host; rm -rf /',
      'not-a-uri',
      'http://localhost:27017',
      '',
      undefined,
    ]) {
      it(`rejects ${JSON.stringify(value)}`, () => {
        expect(isValidConnectionString(value)).to.equal(false);
      });
    }
  });

  describe('promptForConnectionString', () => {
    it('returns the URI the user typed', async () => {
      const result = await promptForConnectionString({
        input: scriptedInput('mongodb://localhost:27017'),
        output: collectingOutput(),
      });

      expect(result).to.equal('mongodb://localhost:27017');
    });

    it('trims surrounding whitespace', async () => {
      const result = await promptForConnectionString({
        input: scriptedInput('   mongodb://localhost:27017   '),
        output: collectingOutput(),
      });

      expect(result).to.equal('mongodb://localhost:27017');
    });

    it('re-asks after an invalid answer', async () => {
      const output = collectingOutput();
      const result = await promptForConnectionString({
        input: scriptedInput('nope', 'mongodb://localhost:27017'),
        output,
      });

      expect(result).to.equal('mongodb://localhost:27017');
      expect(output.text()).to.contain('Not a valid MongoDB URI');
    });

    it('gives up after the configured number of attempts', async () => {
      try {
        await promptForConnectionString({
          input: scriptedInput('a', 'b', 'c'),
          output: collectingOutput(),
          attempts: 3,
        });
        expect.fail('should have thrown');
      } catch (error) {
        expect(error.message).to.contain('after 3 attempts');
      }
    });

    // Regression: rl.question() never settles once the stream ends, which surfaced as
    // 'Detected unsettled top-level await' and a silent exit 13 instead of an error.
    it('throws instead of hanging when the input ends', async () => {
      const input = new PassThrough();
      input.end();

      try {
        await promptForConnectionString({ input, output: collectingOutput() });
        expect.fail('should have thrown');
      } catch (error) {
        expect(error.message).to.contain('Input stream closed');
      }
    });
  });
});
