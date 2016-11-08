mongo-express
===

[![npm version](https://badge.fury.io/js/mongo-express.svg)](https://www.npmjs.com/package/mongo-express) [![npm](https://img.shields.io/npm/dm/mongo-express.svg)](https://www.npmjs.com/package/mongo-express) [![GitHub stars](https://img.shields.io/github/stars/mongo-express/mongo-express.svg)](https://github.com/mongo-express/mongo-express/stargazers) [![Known Vulnerabilities](https://snyk.io/test/npm/name/badge.svg)](https://snyk.io/test/npm/mongo-express)
[![Build Status](https://travis-ci.org/mongo-express/mongo-express.svg?branch=master)](https://travis-ci.org/mongo-express/mongo-express)

Web-based MongoDB admin interface written with Node.js, Express and Bootstrap3


Features
--------

* Connect to multiple databases
* View/add/delete databases
* View/add/rename/delete collections
* View/add/update/delete documents
* Preview audio/video/image assets inline in collection view
* Nested and/or large objects are collapsible for easy overview
* Async on-demand loading of big document properties (>100KB default) to keep collection view fast
* GridFS support - add/get/delete incredibly large files
* Use BSON data types in documents
* Mobile / Responsive - Bootstrap 3 works passably on small screens when you're in a bind
* Connect and authenticate to individual databases
* Authenticate as admin to view all databases
* Database blacklist/whitelist
* Custom CA and CA validation disabling
* Supports replica sets


Screenshots
-----------

Home Page | Database View | Collection View | Editing A Document
--- | --- | --- | ---
<img src="http://i.imgur.com/XiYhblA.png" title="Home Page showing databases"> | <img src="http://i.imgur.com/XWcIgY1.png" title="Viewing collections & buckets in a database" /> | <img src="https://imgur.com/UmGSr3x.png" title="Viewing documents in a collection" /> | <img src="https://imgur.com/lL38abn.png" title="Editing a document" />

These screenshots are from version 0.30.40
View album for more screenshots: (server status, database views etc..)
[https://imgur.com/a/9vHsF](https://imgur.com/a/9vHsF)


Usage (npm / CLI)
-----------------

*mongo-express* requires Node.js v4 or higher.

**To install:**

    npm install -g mongo-express

Or if you want to install a non-global copy:

    npm install mongo-express

By default `config.default.js` is used where the basic access authentication is `admin`:`pass`. This is obviously not safe, and there are warnings in the console.

**To configure:**

Copy `YOUR_PATH/node_modules/mongo-express/config.default.js` into a new file called `YOUR_PATH/node_modules/mongo-express/config.js`.

*Note:* YOUR_PATH will depend on your current OS user and system configuration. You can see it in the output text shown after executing npm install.

Fill in your MongoDB connection details and any other options you want to change in `config.js`.

**To run:**

    cd YOUR_PATH/node_modules/mongo-express/ && node app.js

If you installed it globally, you can immediately start mongo-express like this:

    mongo-express -u user -p password -d database
    
You can access a remote database by providing MongoDB Host and Port:

    mongo-express -u user -p password -d database -H mongoDBHost -P mongoDBPort

Or if you want to use it as an administrator:

    mongo-express -a -u superuser -p password

For help on configuration options:

    mongo-express -h

Usage (Express 4 middleware)
----------------------------

**To mount as Express 4 middleware (see `node_modules/mongo-express/app.js`):**

    var mongo_express = require('mongo-express/lib/middleware')
    var mongo_express_config = require('./mongo_express_config')

    app.use('/mongo_express', mongo_express(mongo_express_config))

Usage (Docker)
--------------

Make sure you have a running [MongoDB container](https://hub.docker.com/_/mongo/) and specify it's name in the `--link` argument.

**Use the docker hub image:**

```console
$ docker run -it --rm -p 8081:8081 --link YOUR_MONGODB_CONTAINER:mongo mongo-express
```

**Build from source:**

Build an image from the project directory, then run the image.

```console
$ docker build -t mongo-express .
$ docker run -it --rm -p 8081:8081 --link YOUR_MONGODB_CONTAINER:mongo mongo-express
```

You can use the following [environment variables](https://docs.docker.com/reference/run/#env-environment-variables) to modify the container's configuration:

    Name                              | Default         | Description
    ----------------------------------|-----------------|------------
    `ME_CONFIG_MONGODB_SERVER`        |`mongo` or `localhost`| MongoDB host name or IP address. The default is `localhost` in the config file and `mongo` in the docker image. If it is a replica set, use a comma delimited list of the host names.
    `ME_CONFIG_MONGODB_PORT`          | `27017`         | MongoDB port.
    `ME_CONFIG_MONGODB_ENABLE_ADMIN`  | `false`         | Enable administrator access. Send strings: `"true"` or `"false"`.
    `ME_CONFIG_MONGODB_ADMINUSERNAME` | ` `             | Administrator username.
    `ME_CONFIG_MONGODB_ADMINPASSWORD` | ` `             | Administrator password.
    `ME_CONFIG_MONGODB_AUTH_DATABASE` | `db`            | Database name (only needed if `ENABLE_ADMIN` is `"false"`).
    `ME_CONFIG_MONGODB_AUTH_USERNAME` | `admin`         | Database username (only needed if `ENABLE_ADMIN` is `"false"`).
    `ME_CONFIG_MONGODB_AUTH_PASSWORD` | `pass`          | Database password (only needed if `ENABLE_ADMIN` is `"false"`).
    `ME_CONFIG_SITE_BASEURL`          | `/`             | Set the express baseUrl to ease mounting at a subdirectory. Remember to include a leading and trailing slash.
    `ME_CONFIG_SITE_COOKIESECRET`     | `cookiesecret`  | String used by [cookie-parser middleware](https://www.npmjs.com/package/cookie-parser) to sign cookies.
    `ME_CONFIG_SITE_SESSIONSECRET`    | `sessionsecret` | String used to sign the session ID cookie by [express-session middleware](https://www.npmjs.com/package/express-session).
    `ME_CONFIG_BASICAUTH_USERNAME`    | `admin`         | mongo-express web login name. Sending an empty string will disable basic authentication.
    `ME_CONFIG_BASICAUTH_PASSWORD`    | `pass`          | mongo-express web login password.
    `ME_CONFIG_REQUEST_SIZE`          | `100kb`         | Used to configure maximum mongo update payload size. CRUD operations above this size will fail due to restrictions in [body-parser](https://www.npmjs.com/package/body-parser).
    `ME_CONFIG_OPTIONS_EDITORTHEME`   | `rubyblue`      | Web editor color theme, [more here](http://codemirror.net/demo/theme.html).
    `ME_CONFIG_SITE_SSL_ENABLED`      | `false`         | Enable SSL.
    `ME_CONFIG_MONGODB_SSLVALIDATE`   | `true`          | Validate mongod server certificate against CA
    `ME_CONFIG_SITE_SSL_CRT_PATH`     | ` `             | SSL certificate file.
    `ME_CONFIG_SITE_SSL_KEY_PATH`     | ` `             | SSL key file.

**Example:**

    docker run -it --rm \
        --name mongo-express \
        --link web_db_1:mongo \
        -p 8081:8081 \
        -e ME_CONFIG_OPTIONS_EDITORTHEME="ambiance" \
        -e ME_CONFIG_BASICAUTH_USERNAME="" \
        mongo-express

This example links to a container name typical of `docker-compose`, changes the editor's color theme, and disables basic authentication.

**To use:**

The default port exposed from the container is 8081, so visit `http://localhost:8081` or whatever URL/port you entered into your config (if running standalone) or whatever `config.site.baseUrl` (if mounting as a middleware).

Usage (Bluemix)
---------------

**Deploy to Bluemix**

Doing manually:

* Git clone this repository
* Create a new or use already created [MongoDB experimental service](https://www.ng.bluemix.net/docs/#services/MongoDB/index.html#MongoDB)
* Change the file `manifest.yml` to fit your Bluemix app and service environment


Doing automatically:

* Click the button below to fork into IBM DevOps Services and deploy your own copy of this application on Bluemix

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/mongo-express/mongo-express.git)


Then, take the following action to customize to your environment:

* Create your `config.js` file based on `config.default.js`
  * Check if it is necessary to change the `dbLabel` according to the MongoDB service created
  * Change the `basicAuth` properties, not to keep the default values


Search
------
* *Simple* search takes the user provided fields (`key` & `value`) and prepares a MongoDB find() object, with projection set to `{}` so returns all columns.
* *Advanced* search passes the `find` and `projection` fields/objects straight into MongoDB `db.collection.find(query, projection)`. The `find` object is where your query happens, while the `projection` object determines which columns are returned.

See [MongoDB db.collection.find()](https://docs.mongodb.org/manual/reference/method/db.collection.find/) documentation for examples and exact usage.

Planned features
----------------

Pull Requests are always welcome! <3

* Support for replica set connections
* Site authentication
* Mongo Shell console (work in progress)

Limitations
-----------

* Documents must have `document._id` property to be edited
* Binary BSON data type not tested

Not tested
----------

* Binary/BinData

JSON documents are parsed through a javascript virtual machine, so **the web
interface can be used for executing malicious javascript on a server**.

**mongo-express should only be used privately for development purposes**.



BSON Data Types
---------------

The following BSON data types are supported in the mongo-express document editor/viewer.

**Native Javascript Types**

Strings, numbers, lists, booleans, null, etc.

All numbers in Javascript are 64-bit floating points.

**ObjectID/ObjectId**

    ObjectID()

Creates a new Object ID type.

    ObjectID(id)

Use Object ID with the given 24-digit hexadecimal string.

**ISODate**

    ISODate()

Creates a new ISODate object with current time.

`new Date()` can also be used (note the `new` keyword there).

    ISODate(timestamp)

Uses ISODate object with the given timestamp.

**DBRef/Dbref**

    DBRef(collection, objectID)

    DBRef(collection, objectID, database)

Object ID is the ID string, not the ObjectID type.

The database value is optional.

**Timestamp**

    Timestamp()

Creates a new Timestamp object with a value of 0.

    Timestamp(time, ordinal)

Example: `Timestamp(ISODate(), 0)`.

See [http://www.mongodb.org/display/DOCS/Timestamp+data+type](http://www.mongodb.org/display/DOCS/Timestamp+data+type) for more info about the Timestamp data type.

**Code**

    Code(code)

Code can be a native Javascript function, or it can be a string.

Specifying a scope/context is not supported.

**MinKey**

    MinKey()

**MaxKey**

    MaxKey()

**Symbol**

    Symbol(string)

Example Document
----------------

Here is an example of a document which can be read/edited in mongo-express (media truncated for legibility):

    {
      "_id": ObjectID(), // or ObjectId()
      "dates": {
        "date": ISODate("2012-05-14T16:20:09.314Z"),
        "new_date": ISODate(),
        "alternative": new Date()
      },
      "photo": "data:image/jpeg;base64,/9j/4...",
      "video": "data:video/webm;base64,GkXfo...",
      "audio": "data:audio/ogg;base64,T2dnUw...",
      "bool": true,
      "string": "hello world!",
      "list of numbers": [
        123,
        111e+87,
        4.4,
        -12345.765
      ],
      "reference": DBRef("collection", "4fb1299686a989240b000001"),
      "ts": Timestamp(ISODate(), 1),
      "minkey": MinKey(),
      "maxkey": MaxKey(),
      "func": Code(function() { alert('Hello World!') }),
      "symbol": Symbol("test")
    }

---

License
-------
MIT License

Copyright (c) 2012 Chun-hao Hu

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
