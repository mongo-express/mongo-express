//Add routes from other files
var coll = require('./collection');
exports.collection = coll.collection;
exports.deleteCollection = coll.deleteCollection;


//Homepage route
exports.index = function(req, res){
  //TODO: add possibility to add admin credentials to config and authenticate as admin
  req.adminDb.serverStatus(function(err, info) {
    if (err) {
      //TODO: handle error
      console.error(err);
    }

    var ctx = {
      title: 'Mongo Express',
      info: info
    };
    res.render('index', ctx);
  });
};

//Handle form submission when creating new collection
//TODO: Move this handler to /db/ URL when implementing REST api, to handle PUT requests
exports.createCollection = function(req, res) {
  var db = req.db;
  var name = req.body.collection_name;

  if (name === undefined) {
    //TODO: handle error
    return res.redirect('back');
  }

  //Collection names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
  if (!name.match(/^[a-zA-Z_][a-zA-Z0-9\._]*$/)) {
    //TODO: handle error
    return res.redirect('back');
  }

  db.createCollection(name, function(err, collection) {
    if (err) {
      //TODO: handle error
      console.error(err);
    }

    //TODO: use session flash to show success or error message
    res.redirect('/db/' + req.database + '.' + name);
  });
};
