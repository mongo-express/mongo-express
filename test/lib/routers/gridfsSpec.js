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
  const stream = bucket.openUploadStream(name, { contentType: type });
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
    expect(stored.contentType).to.equal('text/plain');
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
