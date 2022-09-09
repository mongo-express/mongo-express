import supertest from 'supertest';

import defaultConf from './testDefaultConfig.js';
import middleware from '../lib/middleware.js';

export const createServer = async () => {
  const app = await middleware(defaultConf());
  const httpServer = app.listen();
  const request = supertest.agent(httpServer);

  return ({ request, close: () => httpServer.close() });
};

export const getDocumentUrl = (db, collection, documentId) => `/db/${db}/${collection}/${JSON.stringify(documentId)}`;
