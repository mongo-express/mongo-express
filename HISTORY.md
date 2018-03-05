0.45 - Sun Mar 4, 2017
-----

- Added `VCAP_APP_PORT` in config (#378)
- Prevent uncaught error if collection has been deleted. (#382)
- export query results from collections (#388)
- Allow hyphens in collection names (#389)


0.44.0 - Tue Nov 7, 2017
-----

- Confirm document delete (#374)


0.43.1 - Tue Oct 24, 2017
-----

- Fix can not delete database (#373)


0.43.0 - Sat Oct 14, 2017
-----

- Added support for Binary Data as _id (#368)


0.42.3 - Sat Sep 23, 2017
-----

- Fix small typo causing issue with auth databases (#366)


0.42.2 - Sat Aug 12, 2017
------

- Fixed default port in lib/db.js from documentation


0.42.1 - Mon Aug 7, 2017
------

- Fixed typo in tag of collection view (#357)


0.42.0 - Thu Jul 20, 2017
------

- Add connectionString support to connection (#350)


0.41.0 - Tue Jul 4, 2017
------

- Use stream for exporting collections (#345)
- Solution for CSRF wiht base url (#347)


0.40.0 - Mon May 1, 2017
------

- Fixed more flexible db names (#339)
- Fixed escaping in nested objects
- Fixed path resolve for windows for the builds
- Fixed revise the list database function to support user having access to admin database (#338)


0.39.2 - Sun Apr 16, 2017
------

## Fixes
* Fixed bug with collapsibleJSON property not able to render properly


0.39.1 - Sun Mar 26, 2017
------

## New
* Better windows support with usage of cross-env


0.39.0 - Sun Mar 26, 2017
------

## New 
* Add Create Index functionality (#326)

## Chores
* Added a bit of readme info, and updated license


0.38.0 - Sat Feb 25, 2017
------

## New
* Support for mounting on a different baseHref (#320)

## Chores
* Improve configuration step (#321)


0.37.2 - Tue Feb 21, 2017
------

## Fixes
* Small publishing fixes


0.37.1 - Tue Feb 21, 2017
------

## Fixes
* Build is now shipped as part of package


0.37.0 - Mon Feb 20, 2017
------

## New
* Added support for Collection with slash in the name (#309)
* Changed the way scripts work (#312)
    - Scripts are now built using babel and are in their own files.
    - Each page has it's own mini-bundle + vendor bundle
    - Scripts are built on install and output a json file that is used for url purposes
* Added more tests, and new test utils! (#314, #315)

## Fixes
* Fixed issue where parenthese we're stringified incorrectly (#306)
* Fixed loadDocument script that was rendered properly in read-only (#308)

## Varia
* Removed underscore and use only lodash. (#307)
* Removed Snyk. It was causing more annoyance than actual good (#306)
* Updated swig to swig-template, which uses a safe version (#311)


0.36.0 - Tue Feb 7, 2017
------
* Fix content-disposition non-ascii header, set config.gridFSEnabled via env vars (#304)

0.35.0 - Thu Jan 5, 2017
------
* Removed Duplicated navbar in mobile layout (#302)
* Add logger options to control logging (#300)
* Pass options in middleware-only usage (#299)

0.34.0 - Fri Dec 23, 2016
------

## Fixes
* Fixed index are no longer deletable in read-only mode (#298)

0.33.0 - Tue Dec 6, 2016
------

## New 
* Delete all Documents matching a query.

## Fixes
* Fixed issue where binary types we're converted to string when updating a document

0.32.0 - Sat Nov 12, 2016
------

## New
* ObjectID can now be used without the ObjectID wrapper.
* Added export to CSV
* Added index management. You can now delete index or reIndex a collection

## Fixes
* Fixed issue where ObjectID we're incorrectly stringified


0.30.48
-------
 * Add support for super large Objects

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
