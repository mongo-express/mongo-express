mongo-express
=============

Web-based MongoDB admin interface written with Node.js and express


Features
--------

Current features:

* Supports multiple databases
* Supports regular user authentication or admin authentication
* Database blacklist/whitelist
* View/add/rename/delete collections
* View/add/update/delete documents
* Supports BSON data types

Planned features:

* Support for replica set connections
* Web-based command-line interface
* Site authentication
* REST interface


Limitations
-----------

* Can only edit documents which have a document._id property
* Cannot edit document._id property (will be fixed soon)
* Converts all documents from BSON to JSON when viewing (will be fixed soon)


Screenshots
-----------

<img src="http://i.imgur.com/DOi3b.png" title="Viewing documents in a collection" />

Click here for more screenshots: 
[http://imgur.com/a/OTZHe](http://imgur.com/a/OTZHe)

These screenshots are from version 0.11.0.


Usage
-----

**To install:**

    npm install mongo-express

Or if you want to install a global copy:

    npm install -g mongo-express

**To configure:**

Copy `config.default.js` into a new file called `config.js`.

Fill in your MongoDB connection details, and any other options you want to change.

**To run:**

    node app

**To use:**

Visit `http://localhost:8081` or whatever URL/port you entered into your config.


License
-------
MIT License

Copyright (c) 2012 Chun-hao Hu

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
