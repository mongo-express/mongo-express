import { expect } from 'chai';

import { createServer } from '../../testHttpUtils.js';
import {
  cleanAndCloseDb, initializeDb, testCollection,
  testDbName as dbName, testURLCollectionName as urlColName,
} from '../../testMongoUtils.js';

// Issue #1225, open since 2023: mongo-express could not import its own export. Three separate
// defects met there. The export wrote documents glued together with no separator, so the file
// was neither JSON nor the newline-delimited format the menu entry offers. The import read one
// line at a time, which fails on anything pretty-printed, and iterated each parsed line as an
// array, which throws on a plain document. Between them, the only shape that ever imported was
// a single-line array — this app's own array export, and nothing else.
const importFile = (request, body) => request
  .post(`/db/${dbName}/import/${urlColName}`)
  .attach('file', Buffer.from(body), { filename: 'import.json', contentType: 'application/json' });

const accepted = {
  'an array on one line': ['[{"imported":1},{"imported":2}]', 2],
  'one document per line, as mongoexport writes': ['{"imported":1}\n{"imported":2}\n', 2],
  'a single document': ['{"imported":1}', 1],
  'an array pretty-printed across lines, as Compass writes': ['[\n  {\n    "imported": 1\n  }\n]', 1],
  'documents written back to back, as this app used to export': ['{"imported":1}{"imported":2}', 2],
  // The split has to respect strings, or a document containing a brace tears in half.
  'documents holding braces and escaped quotes in their values': ['{"imported":"}{ \\" here"}\n{"imported":2}', 2],
};

// Nothing here is a run of documents, and a partial import would be worse than a refusal.
const rejected = {
  'content between documents': '{"imported":1} junk {"imported":2}',
  'a truncated document': '{"imported":1',
  'plain text': 'not json at all',
  'unbalanced brackets': '{"imported":1}}',
};

describe('Router import', () => {
  let request;
  let close;
  let client;

  before(async () => {
    client = await initializeDb();
    const server = await createServer();
    request = server.request;
    close = server.close;
  });

  after(async () => {
    await Promise.all([cleanAndCloseDb(client), close()]);
  });

  beforeEach(() => testCollection(client).deleteMany({ imported: { $exists: true } }));

  describe('accepts the shapes people actually have', () => {
    for (const [label, [body, expected]] of Object.entries(accepted)) {
      it(`imports ${label}`, async () => {
        const res = await importFile(request, body).expect(200);

        expect(res.text).to.contain(`${expected} document(s) inserted`);
        expect(await testCollection(client).countDocuments({ imported: { $exists: true } }))
          .to.equal(expected);
      });
    }
  });

  describe('refuses what it cannot read', () => {
    for (const [label, body] of Object.entries(rejected)) {
      it(`rejects ${label}`, async () => {
        const res = await importFile(request, body).expect(400);

        // The old message named nothing, which is why the issue thread filled with guesses.
        expect(res.text).to.contain('Expected JSON documents');

        // A rejected file must leave nothing behind.
        expect(await testCollection(client).countDocuments({ imported: { $exists: true } }))
          .to.equal(0);
      });
    }
  });

  // The type on an upload is set by the browser and can be anything a client cares to send, so
  // it never decided whether a file was safe — only whether a real one got turned away. Several
  // browsers label a .json as text/plain or application/octet-stream, and those uploads used to
  // come back as a bare 'Bad file'.
  describe('does not turn away files over the type the browser attached', () => {
    for (const mimetype of [
      'application/json',
      'text/json',
      'text/plain',
      'application/octet-stream',
      'application/x-json',
    ]) {
      it(`imports a JSON file sent as ${mimetype}`, async () => {
        await request.post(`/db/${dbName}/import/${urlColName}`)
          .attach('file', Buffer.from('{"imported":1}'), { filename: 'import.json', contentType: mimetype })
          .expect(200);

        expect(await testCollection(client).countDocuments({ imported: { $exists: true } }))
          .to.equal(1);
      });
    }
  });

  // CSV is offered on the way out, so people reasonably try to bring one back. It cannot work:
  // the export renders ObjectIds as text, flattens nested documents into dotted columns and
  // leaves every value a string. Better to say so than to fail as unparseable JSON.
  describe('explains that CSV cannot be imported', () => {
    for (const [label, filename, mimetype] of [
      ['by its type', 'export.csv', 'text/csv'],
      ['by its extension', 'export.csv', 'text/plain'],
    ]) {
      it(`recognises a CSV ${label}`, async () => {
        const res = await request.post(`/db/${dbName}/import/${urlColName}`)
          .attach('file', Buffer.from('_id,name\n1,alice'), { filename, contentType: mimetype })
          .expect(400);

        expect(res.text).to.contain('CSV import is not supported');
        expect(res.text, 'should say what to do instead').to.contain('JSON');
        expect(await testCollection(client).countDocuments({ imported: { $exists: true } }))
          .to.equal(0);
      });
    }
  });

  // The heart of the issue: whatever the export writes, the import has to read back.
  describe('round-trips its own exports', () => {
    for (const route of ['export', 'expArr']) {
      it(`imports what /${route} produced`, async () => {
        const exported = await request.get(`/db/${dbName}/${route}/${urlColName}`)
          .expect(200).responseType('blob');
        const body = exported.body.toString();

        // Re-importing into the same collection would collide on _id, so it is dropped and
        // Mongo assigns fresh ones. The shape under test is the file itself, not the ids.
        const reshaped = body.replaceAll(/"_id":\{"\$oid":"[^"]+"\},/g, '')
          .replaceAll('"testItem"', '"imported"');

        const res = await importFile(request, reshaped).expect(200);

        expect(res.text).to.contain('document(s) inserted');
      });
    }
  });

  it('separates exported documents with newlines, so the file is readable elsewhere', async () => {
    const res = await request.get(`/db/${dbName}/export/${urlColName}`)
      .expect(200).responseType('blob');
    const lines = res.body.toString().split('\n').filter(Boolean);

    expect(lines.length).to.be.greaterThan(1);

    for (const line of lines) {
      expect(() => JSON.parse(line), `each line should stand alone as JSON: ${line}`).to.not.throw();
    }
  });
});
