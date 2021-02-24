'use strict';

const bson = require('../bson');
const filters = require('../filters');
const { buildCollectionURL } = require('../utils');

const routes = function (config) {
  const exp = {};

  exp.getProperty = function (req, res) {
    // Get a single property
    // URI like database/collection/document/prop
    res.send(req.prop);
  };

  exp.viewDocument = function (req, res) {
    const ctx = {
      title: (config.options.readOnly ? 'Viewing' : 'Editing') + ' Document: ' + filters.stringDocIDs(req.document._id),
      editorTheme: config.options.editorTheme,
      docLength: bson.toString(req.document).split(/\r\n|\r|\n/).length,
      docString: bson.toString(req.document),
    };

    res.render('document', ctx);
  };

  exp.checkValid = function (req, res) {
    const doc = req.body.document;
    try {
      bson.toBSON(doc);
    } catch (err) {
      console.error(err);
      return res.send('Invalid');
    }

    res.send('Valid');
  };

  exp.addDocument = function (req, res) {
    const doc = req.body.document;

    if (doc === undefined || doc.length === 0) {
      req.session.error = 'You forgot to enter a document!';
      return res.redirect('back');
    }

    let docBSON;

    try {
      docBSON = bson.toBSON(doc);
    } catch (err) {
      req.session.error = 'That document is not valid!';
      console.error(err);
      return res.redirect('back');
    }

    req.collection.insert(docBSON, { safe: true }, function (err) {
      if (err) {
        req.session.error = 'Something went wrong: ' + err;
        console.error(err);
        return res.redirect('back');
      }

      req.session.success = 'Document added!';
      res.redirect(buildCollectionURL(res.locals.baseHref, req.dbName, req.collectionName));
    });
  };

  exp.updateDocument = function (req, res) {
    const doc = req.body.document;

    if (doc === undefined || doc.length === 0) {
      req.session.error = 'You forgot to enter a document!';
      return res.redirect('back');
    }

    let docBSON;
    try {
      docBSON = bson.toBSON(doc);
    } catch (err) {
      req.session.error = 'That document is not valid!';
      console.error(err);
      return res.redirect('back');
    }

    docBSON._id = req.document._id;

    req.collection.update(req.document, docBSON, { safe: true }, function (err) {
      if (err) {
        // document was not saved
        req.session.error = 'Something went wrong: ' + err;
        console.error(err);
        return res.redirect('back');
      }

      req.session.success = 'Document updated!';
      res.redirect(buildCollectionURL(res.locals.baseHref, req.dbName, req.collectionName));
    });
  };

  exp.deleteDocument = function (req, res) {
    const skip            = req.query.skip        || '';
    const key             = req.query.key         || '';
    const value           = req.query.value       || '';
    const type            = req.query.type        || '';
    const jsonQuery       = req.query.query       || '';
    const jsonProjection  = req.query.projection  || '';

    req.collection.remove(req.document, { safe: true }, function (err) {
      if (err) {
        req.session.error = 'Something went wrong! ' + err;
        console.error(err);
        return res.redirect('back');
      }

      req.session.success = 'Document deleted! _id: ' + filters.stringDocIDs(req.document._id);
      res.redirect(
        buildCollectionURL(res.locals.baseHref, req.dbName, req.collectionName)
        + `?skip=${skip}&key=${key}&value=${value}&type=${type}&query=${jsonQuery}&projection=${jsonProjection}`,
      );
    });
  };

  return exp;
};

module.exports = routes;
