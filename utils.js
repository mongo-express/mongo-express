exports.parseCollectionName = function parseCollectionName(full_name) {
  var coll_parts = full_name.split('.');
  coll_parts.splice(0,1);
  return coll_parts.join('.');
};
