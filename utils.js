//Given a full collection namespace, returns the database and collection
exports.parseCollectionName = function parseCollectionName(full_name) {
  var coll_parts = full_name.split('.');

  if (coll_parts.length <= 1) {
    console.error('Cannot parse collection name!');
  }

  var database = coll_parts.splice(0,1);
  return { name: coll_parts.join('.'), database: database.toString() };
};

// Given some size in bytes, returns it in a converted, friendly size
// credits: http://stackoverflow.com/users/1596799/aliceljm
exports.bytesToSize = function bytesToSize(bytes) {
   if(bytes == 0) return '0 Byte';
   var k = 1000;
   var sizes = [' bytes', 'kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb'];
   var i = Math.floor(Math.log(bytes) / Math.log(k));
   return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
}
