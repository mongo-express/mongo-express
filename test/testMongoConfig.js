'use strict';

module.exports = {
  host: 'localhost',
  port: 27017,
  dbName: 'mongo-express-test-db',
  makeConnectionUrl: () => `${module.exports.uri}${module.exports.dbName}`,
};
