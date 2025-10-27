const assert = require('assert');
const request = require('supertest');
const express = require('express');

describe('Health route', function () {
  const app = express();

  app.get('/health', (_, res) => {
    res.status(200).json({ status: 'ok' });
  });

  it('GET /health returns 200', async function () {
    const res = await request(app).get('/health');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, { status: 'ok' });
  });
});
