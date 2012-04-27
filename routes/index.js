//Collection routes
var coll = require('./collection');
exports.collection = coll.collection;


//Homepage route
exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};
