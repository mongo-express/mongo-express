'use strict';

module.exports = {
  host: 'localhost',
  port: 27017,
  dbName: 'mongo-express-test-db',
  makeConnectionUrl: () => {
    const m = module.exports;
    return `mongodb://${m.host}:${m.port}/${m.dbName}`;
  },
};
