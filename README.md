mongo-express
=============

Web-based MongoDB admin interface written with Node.js and express


Features
--------

Current features:

* Supports multiple databases
* Database blacklist/whitelist
* View/add/rename/delete collections
* View/add/update/delete documents

Planned features:

* Error messages/responses
* Support for replica set connections
* Web-based command-line interface
* Site authentication

Currently mongo-express *requires* admin access to the database.
Support for regular user connections will be coming soon.


Screenshots
-----------

Click here for screenshots: 
[http://imgur.com/a/OTZHe](http://imgur.com/a/OTZHe)


Usage
-----

To install:
    npm install mongo-express
Or if you want to install a global copy:
    npm install -g mongo-express

To configure:
Open config.js and fill in your MongoDB server connection and admin auth details.

To run:
    node app

To use:
Visit http://localhost:8081 or whatever URL/port you entered into your config.
