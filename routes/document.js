var config = require('../config');
var mongodb = require('mongodb');

exports.viewDocument = function(req, res, next) {
  var ctx = {
    title: 'Viewing Document: ' + req.document._id,
    editorTheme: config.options.editorTheme
  };

  res.render('document', ctx);
};


exports.addDocument = function(req, res, next) {
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
    console.error(err)
    return res.redirect('back');
  }

  req.collection.insert(docJSON, {safe: true}, function(err, result) {
    if (err) {
      //TODO: handle error
      console.error(err);
      return res.redirect('back');
    }

    res.redirect('/db/' + req.dbName + '/' + req.collectionName);
  });
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

  docJSON._id = req.document._id;

  req.collection.update(req.document, docJSON, {safe: true}, function(err, result) {
    if (err) {
      //TODO: handle error
      //document was not saved
      console.error(err);
      return res.redirect('back');
    }

    return res.redirect('/db/' + req.dbName + '/' + req.collectionName);
  });
};


exports.deleteDocument = function(req, res, next) {
  req.collection.remove(req.document, {safe: true}, function(err, result) {
    if (err) {
      //TODO: handle error
      console.error(err);
    }

    return res.redirect('/db/' + req.dbName + '/' + req.collectionName);
  });
};
