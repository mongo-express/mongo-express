module.exports = function (grunt) {

    //    require('load-grunt-config')(grunt);
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json')
    });

    grunt.registerTask('admins', 'Hashes admins passwords in admin.json.', function () {
        var utils = require('./auth/utils');
        if ( grunt.file.exists('admins.json') ) {
            grunt.log.write('Hashing admins passwords in admin.json.\n');
            var salt = utils.generateSalt(),
                done = this.async(),
                admins = grunt.file.readJSON('admins.json'),
                hashed_passwords = 0,
                admin_usernames = Object.keys(admins);

            admin_usernames.forEach(function (admin) {
                grunt.log.write(admins[admin], salt, '\n');
                utils.hashPassword(admins[admin], salt, function (err, hashed) {
                    if ( err ) {
                        grunt.fail.fatal('Failed hashing passwords');
                        done(false);
                    }
                    else {
                        hashed_passwords += 1;

                        admins[admin] = hashed;
                        grunt.log.write(hashed);

                        if ( hashed_passwords == admin_usernames.length ) {
                            grunt.file.write(
                                'admins.json',
                                JSON.stringify(admins, null, '  ')
                            );
                            done();
                        }
                    }
                });
            });
        }
        else {
            grunt.log.write('Did not find an admin.json file, so skipping hashing of passwords.\n');
        }
    });
};
