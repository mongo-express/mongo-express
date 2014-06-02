var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    config = require('../config'),
    admins = config.site.admins,
    hash = require('pwd').hash,
    SALT = require('./utils').generateSalt();


function validPassword(raw, hashed, next) {
    hash(raw, SALT, function(err, salted) {
        if (err) {
            next(err);
        } else {
            next(null, salted == hashed);
        }
    });
}

module.exports = function(app) {
    /**
     * Configure the app to use passport.
     * Make sure these come after `app.use(express.session)`.
     */
    app.use(passport.initialize());
    app.use(passport.session());

    /*
     * configure passport integration with the sessions backend.
     */
    // configuring how passports puts user into session
    passport.serializeUser(function(username, done) {
        done(null, username);
    });

    // configuring how passports extracts the user from session
    passport.deserializeUser(function(username, done) {
        done(null, username);
    });

    // tell passport to use Local strategy and configuring LocalStrategy.
    passport.use(new LocalStrategy(function(username, password, done) {
        if (username in admins) {
            validPassword(password, admins[username], function(err, valid) {
                if (err) {
                    done(err);
                } else if (valid) {
                    return done(null, username);
                } else {
                    return done(null, false, {
                        message: 'Incorrect password.'
                    });
                }
            });
        } else {
            return done(null, false, {
                message: 'Incorrect username.'
            });
        }
    }));


    return {
        authenticate: passport.authenticate.bind(passport, 'local', {
            successRedirect: config.site.baseUrl,
            failureRedirect: config.site.baseUrl + 'login',
            failureFlash: true
        }),
        requireAuthentication: function(req, res, next) {
            if (req.isAuthenticated()) {
                next();
            } else {
                res.redirect(config.site.baseUrl + 'login');
            }
        }
    };
};
