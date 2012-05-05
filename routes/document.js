exports.viewDocument = function(req, res, next) {
  var ctx = {
    title: 'Viewing Document: ' + req.document._id,
  };

  res.render('document', ctx);
};
