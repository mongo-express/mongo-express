var
    express = require('express')
  , http = require('http')
  ;

var
    config = require('./config')
  , middleware = require('./middleware')
  ;

var app = express();
app.use('/', middleware(config));
app.listen(config.site.port, function() {
  console.log("Mongo Express server listening on port " + (config.site.port || 80));
});
