exports.viewDocument = function(req, res, next) {
  console.log(req.document);
  var ctx = {
    title: 'Viewing Document: ' + req.document._id,
  };

  res.render('document', ctx);
};
