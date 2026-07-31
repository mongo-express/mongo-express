import * as bson from '../bson.js';
import * as filters from '../filters.js';
import { buildCollectionURL, buildDocumentURL } from '../utils.js';

// Params that define the collection view the user came from (filter, projection, sort, page).
// They have to travel with every redirect back to that view, otherwise the view is rebuilt
// from scratch and the user loses their sort order and filter.
const collectionViewParams = (req) => ({
  skip: req.query.skip || 0,
  key: req.query.key || '',
  value: req.query.value || '',
  type: req.query.type || '',
  query: req.query.query || '',
  projection: req.query.projection || '',
  sort: req.query.sort || {},
});

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
      docLength: bson.toString(req.document).split(/\r\n|\r|\n/).length,
      docString: bson.toString(req.document),
      skip: req.query.skip || 0,
      csrfToken: req.csrfToken(),
    };

    res.render('document', ctx);
  };

  exp.checkValid = function (req, res) {
    const doc = req.body.document;
    try {
      bson.toBSON(doc);
    } catch (error) {
      console.error(error);
      return res.send('Invalid');
    }

    res.send('Valid');
  };

  exp.addDocument = async function (req, res) {
    const doc = req.body.document;

    if (doc === undefined || doc.length === 0) {
      req.session.error = 'You forgot to enter a document!';
      return res.redirect(req.get('Referrer') || '/');
    }

    let docBSON;

    try {
      docBSON = bson.toBSON(doc);
    } catch (error) {
      req.session.error = 'That document is not valid!';
      console.error(error);
      return res.redirect(req.get('Referrer') || '/');
    }

    await req.collection.insertOne(docBSON).then(() => {
      req.session.success = 'Document added!';
      res.redirect(buildCollectionURL(res.locals.baseHref, req.dbName, req.collectionName));
    }).catch((error) => {
      req.session.error = 'Something went wrong: ' + error;
      console.error(error);
      res.redirect(req.get('Referrer') || '/');
    });
  };

  exp.updateDocument = async function (req, res) {
    const doc = req.body.document;
    const viewParams = collectionViewParams(req);

    if (doc === undefined || doc.length === 0) {
      req.session.error = 'You forgot to enter a document!';
      return res.redirect(req.get('Referrer') || '/');
    }

    let docBSON;
    try {
      docBSON = bson.toBSON(doc);
    } catch (error) {
      req.session.error = 'That document is not valid!';
      console.error(error);
      return res.redirect(req.get('Referrer') || '/');
    }

    docBSON._id = req.document._id;

    await req.collection.replaceOne(req.document, docBSON).then(() => {
      req.session.success = 'Document updated!';

      if (config.options.persistEditMode === true) {
        res.redirect(buildDocumentURL(res.locals.baseHref, req.dbName, req.collectionName, req.document._id, viewParams));
      } else {
        res.redirect(buildCollectionURL(res.locals.baseHref, req.dbName, req.collectionName, viewParams));
      }
    }).catch((error) => {
      // document was not saved
      req.session.error = 'Something went wrong: ' + error;
      console.error(error);
      res.redirect(req.get('Referrer') || '/');
    });
  };

  exp.deleteDocument = async function (req, res) {
    const viewParams = collectionViewParams(req);

    await req.collection.deleteOne(req.document).then(() => {
      req.session.success = 'Document deleted! _id: ' + filters.stringDocIDs(req.document._id);
      res.redirect(buildCollectionURL(res.locals.baseHref, req.dbName, req.collectionName, viewParams));
    }).catch((error) => {
      req.session.error = 'Something went wrong! ' + error;
      console.error(error);
      res.redirect(req.get('Referrer') || '/');
    });
  };

  return exp;
};

export default routes;
