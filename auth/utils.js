var hash = require('pwd').hash;


module.exports = {
    generateSalt: function () {
        var config = require('../config');
        return (config.site.cookieSecret + config.site.sessionSecret).toString('base64');
    },
    hashPassword: function (password, salt, next) {
        hash(password, salt, function (err, hashed) {
            if ( err ) {
                next(err);
            }
            else {
                next(null, hashed);
            }
        });
    }
};
