//Given a full collection namescpace, returns the database and collection
exports.parseCollectionName = function parseCollectionName(full_name) {
  var coll_parts = full_name.split('.');

  if (coll_parts.length <= 1) {
    console.error('Cannot parse collection name!');
  }

  var database = coll_parts.splice(0,1);
  return { name: coll_parts.join('.'), database: database.toString() };
};
