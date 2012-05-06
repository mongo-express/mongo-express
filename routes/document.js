var config = require('../config');
var mongodb = require('mongodb');

exports.viewDocument = function(req, res, next) {
  var ctx = {
    title: 'Viewing Document: ' + req.document._id,
    editorTheme: config.options.editorTheme
  };

  res.render('document', ctx);
};


exports.updateDocument = function(req, res, next) {
  var doc = req.body.document;

  if (doc == undefined) {
    //TODO: handle error
    return res.redirect('back');
  }

  var docJSON;
  try {
    docJSON = JSON.parse(doc);
  } catch (err) {
    //TODO: handle error
    console.error(err);
    return res.redirect('back');
  }

  var id = new mongodb.ObjectID.createFromHexString(docJSON._id);
  docJSON._id = id;

  //TODO: change collection.save to collection.update, figure out how to use ObjectID
  req.collection.save(docJSON, {safe: true}, function(err, result) {
    if (err) {
      //TODO: handle error
      //document was not saved
      console.error(err);
      return res.redirect('back');
    }

    return res.redirect('/db/' + req.dbName + '/' + req.collectionName);
  });
};
