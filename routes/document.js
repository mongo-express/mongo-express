var config = require('../config');
var bson = require('../bson');


exports.viewDocument = function(req, res, next) {  
  var ctx = {
    title: 'Viewing Document: ' + req.document._id,
    editorTheme: config.options.editorTheme,
    docString: bson.toString(req.document)
  };

  res.render('document', ctx);
};


exports.addDocument = function(req, res, next) {
  var doc = req.body.document;

  if (doc == undefined || doc.length == 0) {
    req.session.error = "You forgot to enter a document!";
    return res.redirect('back');
  }

  var docBSON;

  try {
    docBSON = bson.toBSON(doc);
  } catch (err) {
    req.session.error = "That document is not valid!";
    console.error(err);
    return res.redirect('back');
  }

  req.collection.insert(docBSON, {safe: true}, function(err, result) {
    if (err) {
      req.session.error = "Something went wrong: " + err;
      console.error(err);
      return res.redirect('back');
    }

    req.session.success = "Document added!";
    res.redirect(config.site.baseUrl+'db/' + req.dbName + '/' + req.collectionName);
  });
};


exports.updateDocument = function(req, res, next) {
  var doc = req.body.document;

  if (doc == undefined || doc.length == 0) {
    req.session.error = "You forgot to enter a document!";
    return res.redirect('back');
  }

  var docBSON;
  try {
    docBSON = bson.toBSON(doc);
  } catch (err) {
    req.session.error = "That document is not valid!";
    console.error(err);
    return res.redirect('back');
  }

  docBSON._id = req.document._id;

  req.collection.update(req.document, docBSON, {safe: true}, function(err, result) {
    if (err) {
      //document was not saved
      req.session.error = "Something went wrong: " + err;
      console.error(err);
      return res.redirect('back');
    }

    req.session.success = "Document updated!";
    res.redirect(config.site.baseUrl+'db/' + req.dbName + '/' + req.collectionName);
  });
};


exports.deleteDocument = function(req, res, next) {
  req.collection.remove(req.document, {safe: true}, function(err, result) {
    if (err) {
      req.session.error = "Something went wrong! " + err;
      console.error(err);
      return res.redirect('back');
    }

    req.session.success = "Document deleted!";
    res.redirect(config.site.baseUrl+'db/' + req.dbName + '/' + req.collectionName);
  });
};
