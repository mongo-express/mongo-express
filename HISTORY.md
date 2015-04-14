0.21.0
------

* Added database statistics (karthik25)
* Added basic auth (netpi)
* Added complex querying (kathik25)

0.20.0
------

* Added JSON find type
* Added collection export
* Added confirmation dialog on delete
* Added uptime info in days
* Fixed long collection name issue

0.18.0
------

* Updated express package version
* Updated swig package version
* Added simple key-value document searching

0.17.5
------

* Specified version 3.0.0alpha1 of express in package.json. Latest version of express is causing errors.

0.17.4
------

* Removed hacky BSON->string conversion function
* Replaced it with a modified JSON.stringify function

0.17.3
------

* Removed requirement for doc IDs to be ObjectID type

0.17.2
------

* Added build status images in README

0.17.1
------

* Added tests for BSON conversion functions

0.17.0
------

* Added support for all BSON data types except Binary
* Fixed BSON converter so not only top-level values get converted
* Updated README with more BSON data type examples

0.16.1
------

* Fixed bug: when trying to delete document, collection gets deleted

0.16.0
------

* Added support for some BSON data types when viewing docs
* Updated README with list of supported data types

0.15.0
------

* Added support for BSON data types when adding/editing docs

0.14.1
------

* Forgot to update HISTORY file

0.14.0
------

* Added success/error feedback messages
* Added cookie/session middleware
* Added cookieSecret and sessionSecret options to config
* Moved config.js to config.default.js
* Updated configuration instructions in README

0.13.0
------

* Added version history
* Added MIT license
* Added pager links above document list
* Added pagination links below document list
* Added config option to set number of documents displayed per page

0.12.0
------

* Added async package to dependencies
* Added system.users to list of un-editable collections
* Changed config file to allow lists of databases and associated auth details
* Added support for regular MongoDB users
* Removed requirement for admin access to the MongoDB server
