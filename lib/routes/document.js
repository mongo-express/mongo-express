import * as bson from '../bson.js';
import * as filters from '../filters.js';
import { buildCollectionURL, buildDocumentURL } from '../utils.js';

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

  exp.addDocument = async function (req, res) {
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

    await req.collection.insertOne(docBSON).then(() => {
      req.session.success = 'Document added!';
      res.redirect(buildCollectionURL(res.locals.baseHref, req.dbName, req.collectionName));
    }).catch((err) => {
      req.session.error = 'Something went wrong: ' + err;
      console.error(err);
      res.redirect('back');
    });
  };

  exp.updateDocument = async function (req, res) {
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

    await req.collection.updateOne(req.document, { $set: docBSON }).then(() => {
      req.session.success = 'Document updated!';
      if (config.options.persistEditMode === true) {
        res.redirect(buildDocumentURL(res.locals.baseHref, req.dbName, req.collectionName, req.document._id));
      } else {
        res.redirect(buildCollectionURL(res.locals.baseHref, req.dbName, req.collectionName));
      }
    }).catch((err) => {
      // document was not saved
      req.session.error = 'Something went wrong: ' + err;
      console.error(err);
      res.redirect('back');
    });
  };

  exp.deleteDocument = async function (req, res) {
    const skip            = req.query.skip        || '';
    const key             = req.query.key         || '';
    const value           = req.query.value       || '';
    const type            = req.query.type        || '';
    const jsonQuery       = req.query.query       || '';
    const jsonProjection  = req.query.projection  || '';

    await req.collection.deleteOne(req.document).then(() => {
      req.session.success = 'Document deleted! _id: ' + filters.stringDocIDs(req.document._id);
      res.redirect(
        buildCollectionURL(res.locals.baseHref, req.dbName, req.collectionName)
        + `?skip=${skip}&key=${key}&value=${value}&type=${type}&query=${jsonQuery}&projection=${jsonProjection}`,
      );
    }).catch((err) => {
      req.session.error = 'Something went wrong! ' + err;
      console.error(err);
      res.redirect('back');
    });
  };

  return exp;
};

export default routes;
