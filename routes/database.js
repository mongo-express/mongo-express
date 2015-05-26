var utils = require('../utils');

var routes = function(config) {
  var exp = {};

  exp.viewDatabase = function(req, res) {

    req.db.stats(function(err, data){
      var ctx = {
      title: 'Viewing Database: ' + req.dbName,
      colls: req.collections[req.dbName],
      stats: {
        collections: data.collections,
        dataSize: utils.bytesToSize(data.dataSize),
        storageSize: utils.bytesToSize(data.storageSize),
        fileSize: utils.bytesToSize(data.fileSize)
      }
      };
      res.render('database', ctx);
    });
  }

  return exp;
};

module.exports = routes;
