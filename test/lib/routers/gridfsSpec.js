import { GridFSBucket } from 'mongodb';
import { Readable } from 'node:stream';
import { expect } from 'chai';

import { createServer } from '../../testHttpUtils.js';
import { cleanAndCloseDb, initializeDb, testDbName as dbName } from '../../testMongoUtils.js';

// GridFS had no coverage at all, which is how it came to be entirely broken on master:
// opening any bucket returned 500 because router.js called connections[db].collection()
// instead of connections[db].db.collection(). Underneath that, the handlers were built on
// gridfs-stream (sunset 2015) and mongo.GridStore, removed from the driver in v4.
const bucketName = 'fs';
const seededFile = { name: 'seeded.txt', body: 'seeded gridfs content', type: 'text/plain' };

const fileUrl = (id) => `/db/${dbName}/gridFS/${bucketName}/${encodeURIComponent(JSON.stringify(id.toString()))}`;

const uploadThroughDriver = (client, { name, body, type }) => new Promise((resolve, reject) => {
  const bucket = new GridFSBucket(client.db(), { bucketName });
  // Driver 7 stopped writing a top-level contentType, so the type has to go under metadata.
  const stream = bucket.openUploadStream(name, { metadata: { contentType: type } });
  Readable.from([Buffer.from(body)]).pipe(stream)
    .on('finish', () => resolve(stream.id))
    .on('error', reject);
});

const bucketFiles = (client) => client.db().collection(`${bucketName}.files`).find().toArray();

describe('Router gridfs', () => {
  let request;
  let close;
  let client;
  let seededId;

  // The bucket has to exist before createServer(), because the app caches the collection
  // list when it connects and colsToGrid() reads it to build res.locals.gridFSBuckets.
  before(async () => {
    client = await initializeDb();
    seededId = await uploadThroughDriver(client, seededFile);
    const server = await createServer();
    request = server.request;
    close = server.close;
  });

  after(async () => {
    await client.db().collection(`${bucketName}.files`).drop().catch(() => {});
    await client.db().collection(`${bucketName}.chunks`).drop().catch(() => {});
    await Promise.all([cleanAndCloseDb(client), close()]);
  });

  // Regression: this returned 500 on master.
  it('GET /db/<dbName>/gridFS/<bucket> lists the bucket', () => request
    .get(`/db/${dbName}/gridFS/${bucketName}`).expect(200)
    .then((res) => {
      expect(res.text).to.contain(seededFile.name);

      // The type keeps its own column rather than appearing as a nested metadata object,
      // which is where driver 7 now stores it.
      expect(res.text).to.contain('<th>contentType</th>');
      expect(res.text).to.contain(seededFile.type);
      expect(res.text).to.not.contain('<th>metadata</th>');
    }));

  it('GET /db/<dbName>/gridFS/<bucket>/<file> downloads it with its name and type', () => request
    .get(fileUrl(seededId)).expect(200)
    .then((res) => {
      expect(res.headers['content-type']).to.contain(seededFile.type);
      expect(res.headers['content-disposition']).to.contain(seededFile.name);
      expect(res.text).to.equal(seededFile.body);
    }));

  it('POST /db/<dbName>/gridFS/<bucket> stores an upload, keeping its content type', async () => {
    await request.post(`/db/${dbName}/gridFS/${bucketName}`)
      .attach('filefield', Buffer.from('uploaded body'), { filename: 'uploaded.txt', contentType: 'text/plain' })
      .expect(302);

    const [stored] = await bucketFiles(client).then((files) => files.filter((f) => f.filename === 'uploaded.txt'));
    expect(stored, 'uploaded file should be in the bucket').to.not.equal(undefined);
    expect(stored.metadata?.contentType).to.equal('text/plain');
  });

  // Buckets filled by an earlier mongo-express carry the type at the top level, where driver 6
  // put it. The upgrade must not turn every one of those downloads into octet-stream, so the
  // shape is written directly here — driver 7 has no way to produce it.
  it('still reads the content type off files written before the driver 7 upgrade', async () => {
    const legacyId = await uploadThroughDriver(client, { name: 'legacy.txt', body: 'older upload', type: undefined });
    await client.db().collection(`${bucketName}.files`)
      .updateOne({ _id: legacyId }, { $set: { contentType: 'text/plain' }, $unset: { metadata: '' } });

    const res = await request.get(fileUrl(legacyId)).expect(200);

    expect(res.headers['content-type']).to.contain('text/plain');
  });

  it('DELETE /db/<dbName>/gridFS/<bucket>/<file> removes the file and its chunks', async () => {
    const doomedId = await uploadThroughDriver(client, { name: 'doomed.txt', body: 'goodbye', type: 'text/plain' });

    await request.delete(fileUrl(doomedId)).expect(302);

    const remaining = await bucketFiles(client);
    expect(remaining.map((f) => f.filename)).to.not.include('doomed.txt');
    expect(await client.db().collection(`${bucketName}.chunks`).countDocuments({ files_id: doomedId }))
      .to.equal(0);
  });
});
