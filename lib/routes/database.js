import { bytesToSize, isValidDatabaseName } from '../utils.js';

const routes = function () {
  const exp = {};

  exp.viewDatabase = async function (req, res) {
    await req.updateCollections(req.dbConnection).then(async () => {
      await req.db.stats().then((data) => {
        const ctx = {
          title: 'Viewing Database: ' + req.dbName,
          databases: req.databases,
          colls: req.collections[req.dbName],
          grids: req.gridFSBuckets[req.dbName],
          stats: {
            avgObjSize: bytesToSize(data.avgObjSize || 0),
            collections: data.collections,
            dataFileVersion: (data.dataFileVersion && data.dataFileVersion.major && data.dataFileVersion.minor
              ? data.dataFileVersion.major + '.' + data.dataFileVersion.minor
              : null),
            dataSize: bytesToSize(data.dataSize),
            extentFreeListNum: (data.extentFreeList && data.extentFreeList.num ? data.extentFreeList.num : null),
            fileSize: (typeof data.fileSize !== 'undefined' ? bytesToSize(data.fileSize) : null),
            indexes: data.indexes,
            indexSize: bytesToSize(data.indexSize),
            numExtents: (data.numExtents ? data.numExtents.toString() : null),
            objects: data.objects,
            storageSize: bytesToSize(data.storageSize),
          },
        };
        res.render('database', ctx);
      }).catch((error) => {
        req.session.error = 'Could not get stats. ' + JSON.stringify(error);
        console.error(error);
        res.redirect('back');
      });
    }).catch((error) => {
      req.session.error = 'Could not refresh collections. ' + JSON.stringify(error);
      console.error(error);
      res.redirect('back');
    });
  };

  exp.addDatabase = async function (req, res) {
    const name = req.body.database;
    if (!isValidDatabaseName(name)) {
      // TODO: handle error
      console.error('That database name is invalid.');
      req.session.error = 'That database name is invalid.';
      return res.redirect('back');
    }
    const ndb = req.mainClient.client.db(name);

    await ndb.createCollection('delete_me').then(async () => {
      await req.updateDatabases().then(() => {
        res.redirect(res.locals.baseHref);
      });

      // await ndb.dropCollection('delete_me').then(() => {
      //   res.redirect(res.locals.baseHref + 'db/' + name);
      // }).catch((err) => {
      //   //TODO: handle error
      //   console.error('Could not delete collection.');
      //   req.session.error = 'Could not delete collection. Err:' + err;
      //   res.redirect('back');
      // });
    }).catch((err) => {
      // TODO: handle error
      console.error('Could not create collection. Err:' + err);
      req.session.error = 'Could not create collection. Err:' + err;
      res.redirect('back');
    });
  };

  exp.deleteDatabase = async function (req, res) {
    await req.db.dropDatabase().then(async () => {
      await req.updateDatabases().then(() => res.redirect(res.locals.baseHref));
    }).catch((err) => {
      // TODO: handle error
      console.error('Could not to delete database. Err:' + err);
      req.session.error = 'Failed to delete database. Err:' + err;
      res.redirect('back');
    });
  };

  return exp;
};

export default routes;
