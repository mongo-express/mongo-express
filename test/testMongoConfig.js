let uri;
const dbName = 'mongo-express-test-db';

export default {
  host: 'localhost',
  port: 27017,
  dbName,
  makeConnectionUrl: () => `${uri}${dbName}`,
  setUri: (newUri) => {
    uri = newUri;
  },
};
