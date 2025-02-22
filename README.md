# mongo-express

[![npm version](https://badge.fury.io/js/mongo-express.svg)](https://www.npmjs.com/package/mongo-express) [![npm](https://img.shields.io/npm/dm/mongo-express.svg)](https://www.npmjs.com/package/mongo-express) [![GitHub stars](https://img.shields.io/github/stars/mongo-express/mongo-express.svg)](https://github.com/mongo-express/mongo-express/stargazers) [![Known Vulnerabilities](https://snyk.io/test/npm/name/badge.svg)](https://snyk.io/test/npm/mongo-express)
[![Build Status](https://github.com/mongo-express/mongo-express/actions/workflows/standard-ci.yml/badge.svg?branch=master)](https://github.com/mongo-express/mongo-express/actions/workflows/standard-ci.yml)

A web-based MongoDB admin interface written with Node.js, Express, and Bootstrap 5

## Features

- Connect to multiple databases
- View/add/delete databases
- View/add/rename/delete collections
- View/add/update/delete documents
- Preview audio/video/image assets inline in the collection view
- Nested and/or large objects are collapsible for easy overview
- Async on-demand loading of big document properties (>100KB default) to keep collection view fast
- GridFS support - add/get/delete incredibly large files
- Use BSON data types in documents
- Mobile / Responsive - Bootstrap 5 works passably on small screens when you're in a bind
- Connect and authenticate to individual databases
- Authenticate as admin to view all databases
- Database blacklist/whitelist
- Custom CA/TLS/SSL and CA validation disabling
- Supports replica sets
- OpenIdConnect Authentication

## Screenshots

| Home Page                                                                      | Database View                                                                                    | Collection View                                                                       | Editing A Document                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| <img src="http://i.imgur.com/XiYhblA.png" title="Home Page showing databases"> | <img src="http://i.imgur.com/XWcIgY1.png" title="Viewing collections & buckets in a database" /> | <img src="https://imgur.com/UmGSr3x.png" title="Viewing documents in a collection" /> | <img src="https://imgur.com/lL38abn.png" title="Editing a document" /> |

These screenshots are from version 0.30.40
View the album for more screenshots: (server status, database views, etc..)
[https://imgur.com/a/9vHsF](https://imgur.com/a/9vHsF)

## Development

To test or develop with the latest version (_master_ branch) you can install using this git repository:

    npm i mongo-express@github:mongo-express/mongo-express
    OR
    yarn add mongo-express@github:mongo-express/mongo-express
    OR
    pnpm add mongo-express@github:mongo-express/mongo-express

Copy config.default.js to config.js and edit the default property to fit your local environment

**Run the development build using:**

    npm run start-dev
    OR
    yarn start-dev
    OR
    pnpm run start-dev

## Usage (npm / yarn / pnpm / CLI)

_mongo-express_ requires Node.js v18.18 or higher.

**To install:**

    npm i -g mongo-express
    OR
    yarn add -g mongo-express
    OR
    pnpm add -g mongo-express

Or if you want to install a non-global copy:

    npm i mongo-express
    OR
    yarn add mongo-express
    OR
    pnpm add mongo-express

By default `config.default.js` is used where the basic access authentication is `admin`:`pass`. This is obviously not safe, and there are warnings in the console.

**To configure:**

Copy `YOUR_PATH/node_modules/mongo-express/config.default.js` into a new file called `YOUR_PATH/node_modules/mongo-express/config.js`.

_Note:_ YOUR_PATH will depend on your current OS user and system configuration. You can see it in the output text shown after executing npm install.

Fill in your MongoDB connection details and any other options you want to change in `config.js`.

**You will also need to create a .env file with the variables for your cookie and session secrets, these are just default values**

    ME_CONFIG_SITE_COOKIESECRET: 'cookiesecret',
    ME_CONFIG_SITE_SESSIONSECRET: 'sessionsecret',

**To run:**

    cd YOUR_PATH/node_modules/mongo-express/ && node app.js

or if you installed it globally, you can immediately start mongo-express like this:

    mongo-express

You can add some configuration options. Example:

    node app.js --url mongodb://127.0.0.1:27017

or:

    mongo-express --URL mongodb://127.0.0.1:27017

Configuration options:
Option | Short | Description
| - | - | -
`--version` | `-V` | output the version number
`--url <url>` | `-U <url>` | connection string url (`<url>` example: `mongodb://127.0.0.1:27017`)
`--admin` | `-a` | enable authentication as admin
`--port <port>` | `-p <port>` | listen on specified port (default `<port>` is `8081`)
`--help` | `-h` | display help for command options

## Usage (Express 4 middleware)

**To mount as Express 4 middleware (see `node_modules/mongo-express/app.js`):**

    var mongo_express = require('mongo-express/lib/middleware')
    var mongo_express_config = require('./mongo_express_config')

    app.use('/mongo_express', mongo_express(mongo_express_config))

## Usage (Docker)

Make sure you have a running [MongoDB container](https://hub.docker.com/_/mongo/) on a Docker network (`--network some-network` below) with `--name` or `--network-alias` set to `mongo`. Alternatively, set the connection string `ME_CONFIG_MONGODB_URL` to the proper connection for your MongoDB container on your Docker network.

**Use [the Docker Hub image](https://hub.docker.com/_/mongo-express/):**

```console
$ docker run -it --rm -p 8081:8081 --network some-network mongo-express
```

**Build from source:**

Build an image from the project directory, then run the image.

```console
$ docker build -t mongo-express .
$ docker run -it --rm -p 8081:8081 --network some-network mongo-express
```

You can use the following [environment variables](https://docs.docker.com/reference/run/#env-environment-variables) to modify the container's configuration:

| Name                                           | Default                                             | Description                                                                                                                                                                     |
| ---------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ME_CONFIG_MONGODB_URL`                        | `mongodb://admin:pass@localhost:27017/db?ssl=false` |                                                                                                                                                                                 |
| `ME_CONFIG_MONGODB_ENABLE_ADMIN`               | `false`                                             | Enable administrator access. Send strings: `"true"` or `"false"`.                                                                                                               |
| `ME_CONFIG_MONGODB_AUTH_USERNAME`              | `admin`                                             | Database username (only needed if `ENABLE_ADMIN` is `"false"`).                                                                                                                 |
| `ME_CONFIG_MONGODB_AUTH_PASSWORD`              | `pass`                                              | Database password (only needed if `ENABLE_ADMIN` is `"false"`).                                                                                                                 |
| `ME_CONFIG_MONGODB_ALLOW_DISK_USE`             | `false`                                             | Remove the limit of 100 MB of RAM on each aggregation pipeline stage.                                                                                                           |
| `ME_CONFIG_MONGODB_TLS`                        | `false`                                             | Use TLS client certificate                                                                                                                                                      |
| `ME_CONFIG_MONGODB_TLS_ALLOW_CERTS`            | `true`                                              | Validate mongod server certificate against CA                                                                                                                                   |
| `ME_CONFIG_MONGODB_TLS_CA_FILE`                | ``                                                  | CA certificate File                                                                                                                                                             |
| `ME_CONFIG_MONGODB_TLS_CERT_FILE`              | ``                                                  | TLS client certificate file                                                                                                                                                     |
| `ME_CONFIG_MONGODB_TLS_CERT_KEY_FILE`          | ``                                                  | TLS client certificate key file                                                                                                                                                 |
| `ME_CONFIG_MONGODB_TLS_CERT_KEY_FILE_PASSWORD` | ``                                                  | TLS client certificate key file password                                                                                                                                        |
| `ME_CONFIG_MONGODB_URL_FILE`                   | ``                                                  | File version of ME_CONFIG_MONGODB_URL                                                                                                                                           |
| `ME_CONFIG_MONGODB_AWS_DOCUMENTDB`             | `false`                                             | This allow AWS DocumentDB compatibility (experimental)                                                                                                                          |
| `ME_CONFIG_SITE_BASEURL`                       | `/`                                                 | Set the express baseUrl to ease mounting at a subdirectory. Remember to include leading and trailing slash.                                                                     |
| `ME_CONFIG_HEALTH_CHECK_PATH`                  | `/status`                                           | Set the mongo express healthcheck path. Remember to add the forward slash at the start.                                                                                         |
| `ME_CONFIG_SITE_COOKIESECRET`                  | `cookiesecret`                                      | String used by [cookie-parser middleware](https://www.npmjs.com/package/cookie-parser) to sign cookies.                                                                         |
| `ME_CONFIG_SITE_SESSIONSECRET`                 | `sessionsecret`                                     | String used to sign the session ID cookie by [express-session middleware](https://www.npmjs.com/package/express-session).                                                       |
| `ME_CONFIG_BASICAUTH`                          | `false`                                             | Deprecated, use `ME_CONFIG_BASICAUTH_ENABLED` instead.                                                                                                                          |
| `ME_CONFIG_BASICAUTH_ENABLED`                  | `false`                                             | Enable Basic Authentication. Send strings: `"true"` or `"false"`.                                                                                                               |
| `ME_CONFIG_BASICAUTH_USERNAME`                 | ``                                                  | mongo-express web login name. If not defined, `admin` is the username.                                                                                                          |
| `ME_CONFIG_BASICAUTH_USERNAME_FILE`            | ``                                                  | File version of `ME_CONFIG_BASICAUTH_USERNAME`                                                                                                                                  |
| `ME_CONFIG_BASICAUTH_PASSWORD`                 | ``                                                  | mongo-express web login password. If not defined, `pass` is the password.                                                                                                       |
| `ME_CONFIG_BASICAUTH_PASSWORD_FILE`            | ``                                                  | File version of `ME_CONFIG_BASICAUTH_PASSWORD`                                                                                                                                  |
| `ME_CONFIG_OIDCAUTH_ENABLED`                   | `false`                                             | Enable OpenIdConnect Authentication. Send strings: `"true"` or `"false"`.                                                                                                       |
| `ME_CONFIG_OIDCAUTH_ISSUER`                    | ``                                                  | OAuth2 [Issuer](https://datatracker.ietf.org/doc/html/rfc8414#section-2). Root URL to the openidconnect metadata eg. `"<issuer>/.well-known/openid-configuration"`              |
| `ME_CONFIG_OIDCAUTH_ISSUER_FILE`               | ``                                                  | File version of `ME_CONFIG_OIDCAUTH_ISSUER`                                                                                                                                     |
| `ME_CONFIG_OIDCAUTH_CLIENTID`                  | ``                                                  | OAuth2 ClientId. The client must be private and allowed to perform the Authorization Code Flow grant.                                                                           |
| `ME_CONFIG_OIDCAUTH_CLIENTID_FILE`             | ``                                                  | File version of `ME_CONFIG_OIDCAUTH_CLIENTID`                                                                                                                                   |
| `ME_CONFIG_OIDCAUTH_CLIENTSECRET`              | ``                                                  | OAuth2 Client Secret.                                                                                                                                                           |
| `ME_CONFIG_OIDCAUTH_CLIENTSECRET_FILE`         | ``                                                  | File version of `ME_CONFIG_OIDCAUTH_CLIENTSECRET`                                                                                                                               |
| `ME_CONFIG_OIDCAUTH_SECRET`                    | ``                                                  | A random secret used by the library to init the Authorization Code Flow (required)                                                                                              |
| `ME_CONFIG_OIDCAUTH_SECRET_FILE`               | ``                                                  | File version of `ME_CONFIG_OIDCAUTH_SECRET_FILE`                                                                                                                                |
| `ME_CONFIG_OIDCAUTH_BASEURL`                   | ``                                                  | OAuth2 base url. It's used to build the redirect URL eg. `"<base-url>/callback"`. If not specified `ME_CONFIG_SITE_BASEURL` will be used.                                       |
| `ME_CONFIG_OIDCAUTH_BASEURL_FILE`              | ``                                                  | File version of `ME_CONFIG_OIDCAUTH_BASEURL`                                                                                                                                    |
| `ME_CONFIG_REQUEST_SIZE`                       | `100kb`                                             | Used to configure maximum Mongo update payload size. CRUD operations above this size will fail due to restrictions in [body-parser](https://www.npmjs.com/package/body-parser). |
| `ME_CONFIG_OPTIONS_READONLY`                   | `false`                                             | if readOnly is true, components of writing are not visible.                                                                                                                     |
| `ME_CONFIG_OPTIONS_FULLWIDTH_LAYOUT`           | `false`                                             | If set to true an alternative page layout is used utilizing full window width.                                                                                                  |
| `ME_CONFIG_OPTIONS_PERSIST_EDIT_MODE`          | `false`                                             | If set to true, remain on the same page after clicking on the Save button                                                                                                       |
| `ME_CONFIG_OPTIONS_NO_DELETE`                  | `false`                                             | If noDelete is true, components of deleting are not visible.                                                                                                                    |
| `ME_CONFIG_OPTIONS_NO_EXPORT`                  | `false`                                             | If noExport is true, components of exporting are not visible.                                                                                                                    |
| `ME_CONFIG_OPTIONS_CONFIRM_DELETE`             | `false`                                             | If confirmDelete is set to 'true', a modal for confirming deletion is displayed                                                                                                                   |
| `ME_CONFIG_OPTIONS_COLLAPSIBLE_JSON`           | `true`                                              | If set to true, jsons will be displayed collapsible                                                                                                                 |
| `ME_CONFIG_SITE_SSL_ENABLED`                   | `false`                                             | Enable SSL.                                                                                                                                                                     |
| `ME_CONFIG_SITE_SSL_CRT_PATH`                  | ` `                                                 | SSL certificate file.                                                                                                                                                           |
| `ME_CONFIG_SITE_SSL_KEY_PATH`                  | ` `                                                 | SSL key file.                                                                                                                                                                   |
| `ME_CONFIG_SITE_GRIDFS_ENABLED`                | `false`                                             | Enable gridFS to manage uploaded files.                                                                                                                                         |
| `ME_CONFIG_DOCUMENTS_PER_PAGE`                 | `10`                                                | How many documents you want to see at once in collection view                                                                                                                   |
| `PORT`                                         | `8081`                                              | port that mongo-express will run on.                                                                                                                                            |
| `VCAP_APP_HOST`                                | `localhost`                                         | address that mongo-express will listen on for incoming connections.                                                                                                             |

**Example:**

    docker run -it --rm \
        --name mongo-express \
        --network web_default \
        -p 8081:8081 \
        -e ME_CONFIG_BASICAUTH_ENABLED="false" \
        -e ME_CONFIG_MONGODB_URL="mongodb://mongo:27017" \
        mongo-express

This example links to a container name typical of `docker-compose`, changes the editor's color theme, and disables basic authentication.

**To use:**

The default port exposed from the container is 8081, so visit `http://localhost:8081` or whatever URL/port you entered into your config (if running standalone) or whatever `config.site.baseUrl` (if mounting as a middleware).

### Using Docker Extensions:

**Pre-requisite:**

- Docker Desktop 4.15

**Usage:**

By using Mongo Express Docker Extension, it's easy to setup Mongo Express on Docker Desktop with [just one click](https://open.docker.com/extensions/marketplace?extensionId=ajeetraina/mongodb-express-docker-extension&tag=1.0).


## Usage (IBM Cloud)

**Deploy to IBM Cloud**

Doing manually:

- Git clone this repository
- Create a new or use already created [MongoDB service](https://www.ibm.com/products/databases-for-mongodb)
- Change the file `examples/ibm-cloud/manifest.yml` to fit your IBM Cloud app and service environment

Doing automatically:

- Click the button below to fork into IBM DevOps Services and deploy your own copy of this application on IBM Cloud

[![Deploy to IBM Cloud](https://cloud.ibm.com/devops/setup/deploy/button_x2.png)](https://cloud.ibm.com/devops/setup/deploy?repository=https://github.com/mongo-express/mongo-express.git)

Then, take the following action to customize to your environment:

- Create your `config.js` file based on `config.default.js`
  - Check if it is necessary to change the `dbLabel` according to the MongoDB service created
  - Change the `basicAuth` properties, do not to keep the default values

## Usage (OpenIdConnect Authentication)

**Usage with the `mongo-express` package**

If you install `mongo-express` as a *package*, install the `express-openid-connect` dependency:

```bash
yarn add express-openid-connect
```

**Setup the OAuth2 application**

The current implementation supports OAuth2 Authorization Code Flow Grant, to make it work you need to setup a client on your Identity Provider, and pass the parameters to the application:

```bash
ME_CONFIG_OIDCAUTH_ENABLED=true
ME_CONFIG_OIDCAUTH_BASEURL=https://<domain>/<base-url>
ME_CONFIG_OIDCAUTH_ISSUER=<authority>
ME_CONFIG_OIDCAUTH_CLIENTID=<client-id>
ME_CONFIG_OIDCAUTH_CLIENTSECRET=<client-secret> # Optional
ME_CONFIG_OIDCAUTH_SECRET=<random-generated-string>
ME_CONFIG_SITE_COOKIESECRET=<client-secret>
ME_CONFIG_SITE_BASEURL=/<base-url>
```

To register your client, you will need the application's redirect URI, which can be obtained by appending `/callback` to the application base URL: Eg. https://example.com/mongo-express/callback

## Search

- _Simple_ search takes the user provided fields (`key` & `value`) and prepares a MongoDB find() object, with projection set to `{}` so returns all columns.
- _Advanced_ search passes the `find` and `projection` fields/objects straight into MongoDB `db.collection.find(query, projection)`. The `find` object is where your query happens, while the `projection` object determines which columns are returned.

See [MongoDB db.collection.find()](https://docs.mongodb.org/manual/reference/method/db.collection.find/) documentation for examples and exact usage.

## Planned features

Pull Requests are always welcome! 💖

## Limitations

- Documents must have the `document._id` property to be edited
- Binary BSON data type not tested

## E2E Testing

    We are currently trying to use Cypress, to open cypress use the command `cypress open`
    To instrument the code to allow the E2E coverage to run, please run this command: `yarn nyc instrument --compact=false lib instrumented`

## Not Tested

- Binary/BinData

JSON documents are parsed through a javascript virtual machine, so **the web
interface can be used for executing malicious javascript on a server**.

**mongo-express should only be used privately for development purposes**.

## BSON Data Types

The following BSON data types are supported in the mongo-express document editor/viewer.

**Native Javascript Types**

Strings, numbers, lists, booleans, null, etc.

All numbers in Javascript are 64-bit floating points.

**ObjectID/ObjectId**

    ObjectId()

Creates a new Object ID type.

    ObjectId(id)

Use Object ID with the given 24-digit hexadecimal string.

**ISODate**

    ISODate()

Creates a new ISODate object with the current time.

`new Date()` can also be used (note the `new` keyword there).

    ISODate(timestamp)

Uses ISODate object with the given timestamp.

**UUID**

    UUID()

Creates a new UUID v4.

Can also be used `new UUID()` (note the `new` keyword there).

    UUID(uuid)

Uses UUID v4 with the given 24-digit hexadecimal string.

Example: `UUID("dee11d4e-63c6-4d90-983c-5c9f1e79e96c")` or `UUID("dee11d4e63c64d90983c5c9f1e79e96c")`

**DBRef/Dbref**

    DBRef(collection, objectID)

    DBRef(collection, objectID, database)

Object ID is the ID string, not the ObjectId type.

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

## Example Document

Here is an example of a document which can be read/edited in mongo-express (media truncated for legibility):

    {
      "_id": ObjectId(),
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
