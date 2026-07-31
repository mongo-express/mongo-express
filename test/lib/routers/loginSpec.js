import { expect } from 'chai';

import { createServer } from '../../testHttpUtils.js';
import { initializeDbWithWrongAuth } from '../../testMongoUtils.js';

describe('Router login', () => {
  let request;
  let close;
  before(() => initializeDbWithWrongAuth()
    .then(() => createServer()).then((server) => {
      request = server.request;
      close = server.close;
    }));

  it('GET / should return html', () => request.get('/').expect(200)
    .then((res) => {
      expect(res.text).to.match(/<title>Home - Mongo Express<\/title>/);
      expect(res.text).to.match(/<h3 class="card-title text-center">Auth<\/h3>/);
    }));

  after(() => close());
});
