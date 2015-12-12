mongo-express
=============

Web-based MongoDB admin interface written with Node.js and express

[![Build Status](https://secure.travis-ci.org/andzdroid/mongo-express.png?branch=master)](http://travis-ci.org/andzdroid/mongo-express) - Master (stable) branch

[![Build Status](https://secure.travis-ci.org/andzdroid/mongo-express.png?branch=develop)](http://travis-ci.org/andzdroid/mongo-express) - Develop branch


Features
--------

Current features:

* Connect to multiple databases
* Connect and authenticate to individual databases
* Authenticate as admin to view all databases
* Database blacklist/whitelist
* View/add/rename/delete collections
* View/add/update/delete documents
* Use BSON data types in documents
* Ability to specify the default key to be shown in the docs list.

Planned features:

* Support for replica set connections
* Site authentication
* REST interface


Limitations
-----------

* Documents must have `document._id` property to be edited
* No GridFS support (might become a planned feature)
* Binary BSON data type not tested

JSON documents are parsed through a javascript virtual machine, so **the web
interface can be used for executing malicious javascript on a server**.

**mongo-express should only be used privately for development purposes**.


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

Copy `YOUR_PATH/node_modules/mongo-express/config.default.js` into a new file called `YOUR_PATH/node_modules/mongo-express/config.js`.

*Note:* Populate the defaultKeyNames field with your database names, collection names and the key name to be displayed by default in the documents list of collections page.

For example :
```
    defaultKeyNames:{
    	"world_db":{  //Database 1 Name
    		"continent":"cont_name", // collection:feild
    		"country":"country_name",
    		"city":"name"
    	},
    	... // Database 2
    	... // Database 3
    }
```
If no key name is specified for a collection, it defaults to '_id'.

*Note:* YOUR_PATH will depend on your current OS user and system configuration. You can see it in the output text shown after executing npm install.

Fill in your MongoDB connection details and any other options you want to change in `config.js`.

**To run:**

    cd YOUR_PATH/node_modules/mongo-express/ && node app.js

If you installed it globally, you can immediately start mongo-express like this:

    mongo-express -u user -p password -d database

Or if you want to use it as an administrator:

    mongo-express -u superuser -p password

For help on configuration options:

    mongo-express -h

**To mount as Express 4 middleware (see `node_modules/mongo-express/app.js`):**

    var mongo_express = require('mongo-express/middleware')
    var mongo_express_config = require('./mongo_express_config')

    app.use('/mongo_express', mongo_express(mongo_express_config))
    
**To run in a Docker container:**

First, build an image from the project directory:

    docker build -t mongo-express .

Then run the image. Make sure you have a running [MongoDB container](https://registry.hub.docker.com/_/mongo/) and specify it's name in the `--link` argument.

    docker run -it --rm --link YOUR_MONGODB_CONTAINER:mongo mongo-express

You can use the following [environment variables](https://docs.docker.com/reference/run/#env-environment-variables) to modify the container's configuration:

    Name                              | Default         | Description
    ----------------------------------|-----------------|------------
    `ME_CONFIG_MONGODB_SERVER`        |`mongo` or `localhost`| MongoDB host name or IP address. The default is `localhost` in the config file and `mongo` in the docker image.
    `ME_CONFIG_MONGODB_PORT`          | `27017`         | MongoDB port.
    `ME_CONFIG_MONGODB_ADMINUSERNAME` | ` `             | Administrator username.
    `ME_CONFIG_MONGODB_ADMINPASSWORD` | ` `             | Administrator password.
    `ME_CONFIG_SITE_COOKIESECRET`     | `cookiesecret`  | String used by [cookie-parser middleware](https://www.npmjs.com/package/cookie-parser) to sign cookies.
    `ME_CONFIG_SITE_SESSIONSECRET`    | `sessionsecret` | String used to sign the session ID cookie by [express-session middleware](https://www.npmjs.com/package/express-session).
    `ME_CONFIG_BASICAUTH_USERNAME`    | `admin`         | mongo-express login name. Sending an empty string will disable basic authentication.
    `ME_CONFIG_BASICAUTH_PASSWORD`    | `pass`          | mongo-express login password.
    `ME_CONFIG_REQUEST_SIZE`          | `100kb`         | Used to configure maximum mongo update payload size. CRUD operations above this size will fail due to restrictions in [body-parser](https://www.npmjs.com/package/body-parser).
    `ME_CONFIG_OPTIONS_EDITORTHEME`   | `rubyblue`      | Web editor color theme, [more here](http://codemirror.net/demo/theme.html).

**Example:**

    docker run -it --rm \
        --name mongo-express \
        --link web_db_1:mongo \
        -e ME_CONFIG_OPTIONS_EDITORTHEME="ambiance" \
        -e ME_CONFIG_BASICAUTH_USERNAME="" \
        mongo-express

This example links to a container name typical of `docker-compose`, changes the editor's color theme, and disables basic authentication.

**To use:**

The default port exposed from the container is 8081, so visit `http://localhost:8081` or whatever URL/port you entered into your config (if running standalone) or whatever `config.site.baseUrl` (if mounting as a middleware).


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

---

Not tested:

* Binary/BinData

Here is an example of a document which can be read/edited in mongo-express:

    {
      "_id": ObjectID(), // or ObjectId()
      "dates": {
        "date": ISODate("2012-05-14T16:20:09.314Z"),
        "new_date": ISODate(),
        "alternative": new Date()
      },
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

License
-------
MIT License

Copyright (c) 2012 Chun-hao Hu

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
