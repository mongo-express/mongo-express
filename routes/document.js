var config = require('../config');
var utils = require('../utils');
var vm = require('vm');


exports.viewDocument = function(req, res, next) {
  var ctx = {
    title: 'Viewing Document: ' + req.document._id,
    editorTheme: config.options.editorTheme
  };

  res.render('document', ctx);
};


exports.addDocument = function(req, res, next) {
  var doc = req.body.document;

  if (doc == undefined || doc.length == 0) {
    req.session.error = "You forgot to enter a document!";
    return res.redirect('back');
  }

  var docJSON;
  var sandbox = utils.getSandbox();

  //JSON.parse doesn't support BSON data types
  //Document is evaluated in a vm in order to support BSON data types
  //Sandbox contains BSON data type functions from node-mongodb-native
  try {
    vm.runInNewContext('doc = eval((' + doc + '));', sandbox);
  } catch (err) {
    req.session.error = "That document is not valid!";
    console.error(err);
    return res.redirect('back');
  }
  var docJSON = sandbox.doc;

  req.collection.insert(docJSON, {safe: true}, function(err, result) {
    if (err) {
      req.session.error = "Something went wrong: " + err;
      console.error(err);
      return res.redirect('back');
    }

    req.session.success = "Document added!";
    res.redirect('/db/' + req.dbName + '/' + req.collectionName);
  });
};


exports.updateDocument = function(req, res, next) {
  var doc = req.body.document;

  if (doc == undefined || doc.length == 0) {
    req.session.error = "You forgot to enter a document!";
    return res.redirect('back');
  }

  var sandbox = utils.getSandbox();
  try {
    vm.runInNewContext('doc = eval((' + doc + '));', sandbox);
  } catch (err) {
    req.session.error = "That document is not valid!";
    console.error(err);
    return res.redirect('back');
  }
  var docJSON = sandbox.doc;

  docJSON._id = req.document._id;

  req.collection.update(req.document, docJSON, {safe: true}, function(err, result) {
    if (err) {
      //document was not saved
      req.session.error = "Something went wrong: " + err;
      console.error(err);
      return res.redirect('back');
    }

    req.session.success = "Document updated!";
    res.redirect('/db/' + req.dbName + '/' + req.collectionName);
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
    res.redirect('/db/' + req.dbName + '/' + req.collectionName);
  });
};
