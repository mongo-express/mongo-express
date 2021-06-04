# 1.0-alpha.4 - Fri Jun 4, 2021
Fix:
- Fix invalid config fallback values [(#710)](https://github.com/mongo-express/mongo-express/pull/710)

Deps:
- Upgrade to GitHub-native Dependabot [(#682)](https://github.com/mongo-express/mongo-express/pull/682)
- Bump webpack-cli from 4.1.0 to 4.7.0 [(#695)](https://github.com/mongo-express/mongo-express/pull/695)
- Bump browserslist from 4.14.5 to 4.16.6 [(#707)](https://github.com/mongo-express/mongo-express/pull/707)

# 1.0-alpha.2 - Mon Apr 3, 2021
New:
- Property to disable delete action [(#608)](https://github.com/mongo-express/mongo-express/pull/608)

Fix:
- Fix boolean parameter parsing [(#604)](https://github.com/mongo-express/mongo-express/pull/604)
- Fix invalid default values for config [(#614)](https://github.com/mongo-express/mongo-express/pull/614)
- Fix query options bug from Mongodb breaking change [(#615)](https://github.com/mongo-express/mongo-express/pull/615)
- Fix several XSS vulnerability [(#merge](https://github.com/mongo-express/mongo-express/commit/f5e0d4931f856f032f22664b5e5901d5950cfd4b)

Deps:
- Update babel to 7 [(#624)](https://github.com/mongo-express/mongo-express/pull/624)
- Update webpack to 5 [(#625)](https://github.com/mongo-express/mongo-express/pull/625)
- Update eslint [(#626)](https://github.com/mongo-express/mongo-express/pull/626)


# 1.0-alpha.1 - Mon Jun 22, 2020
Breaking:
- Change mongo-query-parser to 2.0. This changes how parsing works altogether and drop support for some advanced syntax but is safer [(#528)](https://github.com/mongo-express/mongo-express/pull/528)
- Rewrite the connection module to use mongo as much as possible and update mongodb to 3.5 [(#528)](https://github.com/mongo-express/mongo-express/pull/528)

New:
- Add csv extension in file export [(#578)](https://github.com/mongo-express/mongo-express/pull/578)
- Don't drop the collection on Delete docs action when no query is provided. [(#502)](https://github.com/mongo-express/mongo-express/pull/502)
- Fix broken delete document for UUID (BinData 3 & 4) [(#538)](https://github.com/mongo-express/mongo-express/pull/538)

Deps:
- Bump lodash to 4.6.2 [(#525)](https://github.com/mongo-express/mongo-express/pull/525)


# 0.54 - Tue Dec 24, 2019

Breaking:
- Change bson parsing to use mongo-query-parser [(#522)](https://github.com/mongo-express/mongo-express/pull/522)
- Drop support for node 6

New:
- Support playing .wav file inline in collection [(#508)](https://github.com/mongo-express/mongo-express/pull/508)
- Add node 12, and 13 to CI [(#517)](https://github.com/mongo-express/mongo-express/pull/517)
- Add yarn.lock [(#515)](https://github.com/mongo-express/mongo-express/pull/515)
- Fix broken save document for UUID (BinData 3 & 4) [(#537)](https://github.com/mongo-express/mongo-express/pull/537)

Deps:
- Pin Event stream to 4.0 [(#514)](https://github.com/mongo-express/mongo-express/pull/514)
- Bump bootstrap from 3.3.7 to 3.4.1 [(#523)](https://github.com/mongo-express/mongo-express/pull/523)
- Bump lodash from 4.17.11 to 4.17.13 [(#532)](https://github.com/mongo-express/mongo-express/pull/532)
- Bump jquery from 3.3.1 to 3.4.1 [(#530)](https://github.com/mongo-express/mongo-express/pull/530)
- Bump mixin-deep from 1.3.1 to 1.3.2 [(#526)](https://github.com/mongo-express/mongo-express/pull/526)
- Bump js-yaml from 3.12.0 to 3.13.1 [(#527)](https://github.com/mongo-express/mongo-express/pull/527)
- Bump cross-env from 3.2.4 to 6.0.3 [(#519)](https://github.com/mongo-express/mongo-express/pull/519)
- Bump concurrently from 3.6.1 to 5.0.0 [(#507)](https://github.com/mongo-express/mongo-express/pull/507)


# 0.53 - Sat Jul 20, 2019
New:
- Add support to read CA certificate from file [(#465)](https://github.com/mongo-express/mongo-express/pull/465)
- Add support for BinData v4 for the ID field [(#473)](https://github.com/mongo-express/mongo-express/pull/473)

Deps:
- Update csurf to 1.10.0 [(#478)](https://github.com/mongo-express/mongo-express/pull/4778)
- Update mocha to 6.1.4 [(#477)](https://github.com/mongo-express/mongo-express/pull/477)
- Update cookie parser to 1.4.4 [(#474)](https://github.com/mongo-express/mongo-express/pull/474)


Documentation:
- Update README with VCAP_APP_HOST and add more verbiage to help [(#466)](https://github.com/mongo-express/mongo-express/pull/466)
- Fix default values of BASICAUTH environment variables in README [(#462)](https://github.com/mongo-express/mongo-express/pull/462)




# 0.52.2 - Sun Apr 7, 2019
Fix:
- Test for existence of numExtents [(#463)](https://github.com/mongo-express/mongo-express/pull/463)


# 0.52.1 - Fri Mar 29, 2019
Fix:
- Duplicate VCAP_APP_HOST in dockerfile


# 0.52.0 - Wed Mar 27, 2019
New:
- Add support to read Docker Secrets from file [(#460)](https://github.com/mongo-express/mongo-express/pull/460)



# 0.51.2 - Sun Feb 17, 2019
Fix:
- Issue with importing collections [(#456)](https://github.com/mongo-express/mongo-express/pull/456)


# 0.51.1 - Sun Jan 13, 2019

Fix:
- Cast Selection object to a string to compare with exact equality


# 0.51.0 - Sun Jan 13, 2019

New:
- Don't enter in edit mode with selection. [(#451)](https://github.com/mongo-express/mongo-express/pull/451)


# 0.50.0 - Sun Dec 16, 2018

New:
- Allow turning off export. [(#443)](https://github.com/mongo-express/mongo-express/pull/443)

Fixes:
- Fix issue where db with % would not link properly. [(#440)](https://github.com/mongo-express/mongo-express/pull/440)
- Fix issue where settings were not pass properly to views. [(#442)](https://github.com/mongo-express/mongo-express/pull/442)
- New Document modal now has a working scrollbar for longer documents. [(#446)](https://github.com/mongo-express/mongo-express/pull/446)
- Fix bug with import "--mongoexport json". [(#447)](https://github.com/mongo-express/mongo-express/pull/447)

Chores:
- Refactor urls to use dbUrl and collectionUrl. [(#441)](https://github.com/mongo-express/mongo-express/pull/441)
- Fixed typo: accessable -> accessible. [(#445)](https://github.com/mongo-express/mongo-express/pull/445)


# 0.49.0 - Mon Jul 9, 2018
Breaking:
- Dropped support for node 4 and 5. Added CI for node 8, 9 and 10. [(#425)](https://github.com/mongo-express/mongo-express/pull/425)

Fixes:
- Fix issue where connectionData would not initialize the correct objects leading to config settings not passing through [(#424)](https://github.com/mongo-express/mongo-express/pull/424)
- Bump Dependencies [(#425)](https://github.com/mongo-express/mongo-express/pull/425)


# 0.48.1 - Mon Jul 2, 2018
- Allow readonly config by environment variable (ME_CONFIG_OPTIONS_READONLY) [(#423)](https://github.com/mongo-express/mongo-express/pull/423)


# 0.48.0 - Mon Jun 25, 2018

- Update Dockerfile to build wih node 8. [(#417)](https://github.com/mongo-express/mongo-express/pull/417)
- Export collections with filenames encoded according to RFC 6266. [(#419)](https://github.com/mongo-express/mongo-express/pull/419)
- Add import buttons [(#421)](https://github.com/mongo-express/mongo-express/pull/421)


# 0.47.0 - Thu May 10, 2018

- Ensure mongo is never left uninitialised [(#401)](https://github.com/mongo-express/mongo-express/pull/401)
- Fixed when ME_CONFIG_MONGODB_SERVER is ReplSet [(#403)](https://github.com/mongo-express/mongo-express/pull/403)
- Fixed issue where export would only export partial results [(#406)](https://github.com/mongo-express/mongo-express/pull/406)
- Fixed convertBytes filter to handle NaN [(#410)](https://github.com/mongo-express/mongo-express/pull/410)
- Delete database modal now has consistent buttons with other delete modals [(#410)](https://github.com/mongo-express/mongo-express/pull/410)



# 0.46.1 - Wed Mar 28, 2018

- Fix bug in filters that mistakenly converts non-Binary and non-Object [(#396)](https://github.com/mongo-express/mongo-express/pull/396)



# 0.46 - Sat Mar 17, 2018


- Added support for NaN, +Inifity, -Infinity values [(#395)](https://github.com/mongo-express/mongo-express/pull/395)


# 0.45 - Sun Mar 4, 2018


- Added `VCAP_APP_PORT` in config [(#378)](https://github.com/mongo-express/mongo-express/pull/378)
- Prevent uncaught error if collection has been deleted. [(#382)](https://github.com/mongo-express/mongo-express/pull/382)
- export query results from collections [(#388)](https://github.com/mongo-express/mongo-express/pull/388)
- Allow hyphens in collection names [(#389)](https://github.com/mongo-express/mongo-express/pull/389)


# 0.44.0 - Tue Nov 7, 2017


- Confirm document delete [(#374)](https://github.com/mongo-express/mongo-express/pull/374)


# 0.43.1 - Tue Oct 24, 2017


- Fix can not delete database [(#373)](https://github.com/mongo-express/mongo-express/pull/373)


# 0.43.0 - Sat Oct 14, 2017


- Added support for Binary Data as _id [(#368)](https://github.com/mongo-express/mongo-express/pull/368)


# 0.42.3 - Sat Sep 23, 2017


- Fix small typo causing issue with auth databases [(#366)](https://github.com/mongo-express/mongo-express/pull/366)


# 0.42.2 - Sat Aug 12, 2017


- Fixed default port in lib/db.js from documentation


# 0.42.1 - Mon Aug 7, 2017


- Fixed typo in tag of collection view [(#357)](https://github.com/mongo-express/mongo-express/pull/357)


# 0.42.0 - Thu Jul 20, 2017


- Add connectionString support to connection [(#350)](https://github.com/mongo-express/mongo-express/pull/350)


# 0.41.0 - Tue Jul 4, 2017


- Use stream for exporting collections [(#345)](https://github.com/mongo-express/mongo-express/pull/345)
- Solution for CSRF wiht base url [(#347)](https://github.com/mongo-express/mongo-express/pull/347)


# 0.40.0 - Mon May 1, 2017


- Fixed more flexible db names [(#339)](https://github.com/mongo-express/mongo-express/pull/339)
- Fixed escaping in nested objects
- Fixed path resolve for windows for the builds
- Fixed revise the list database function to support user having access to admin database [(#338)](https://github.com/mongo-express/mongo-express/pull/338)


# 0.39.2 - Sun Apr 16, 2017


## Fixes
* Fixed bug with collapsibleJSON property not able to render properly


# 0.39.1 - Sun Mar 26, 2017


## New
* Better windows support with usage of cross-env


# 0.39.0 - Sun Mar 26, 2017


## New
* Add Create Index functionality [(#326)](https://github.com/mongo-express/mongo-express/pull/326)

## Chores
* Added a bit of readme info, and updated license


# 0.38.0 - Sat Feb 25, 2017


## New
* Support for mounting on a different baseHref [(#320)](https://github.com/mongo-express/mongo-express/pull/320)

## Chores
* Improve configuration step [(#321)](https://github.com/mongo-express/mongo-express/pull/321)


# 0.37.2 - Tue Feb 21, 2017


## Fixes
* Small publishing fixes


# 0.37.1 - Tue Feb 21, 2017


## Fixes
* Build is now shipped as part of package


# 0.37.0 - Mon Feb 20, 2017


## New
* Added support for Collection with slash in the name [(#309)](https://github.com/mongo-express/mongo-express/pull/309)
* Changed the way scripts work [(#312)](https://github.com/mongo-express/mongo-express/pull/312)
    - Scripts are now built using babel and are in their own files.
    - Each page has it's own mini-bundle + vendor bundle
    - Scripts are built on install and output a json file that is used for url purposes
* Added more tests, and new test utils! (#314, #315)

## Fixes
* Fixed issue where parenthese we're stringified incorrectly [(#306)](https://github.com/mongo-express/mongo-express/pull/306)
* Fixed loadDocument script that was rendered properly in read-only [(#308)](https://github.com/mongo-express/mongo-express/pull/308)

## Varia
* Removed underscore and use only lodash. [(#307)](https://github.com/mongo-express/mongo-express/pull/307)
* Removed Snyk. It was causing more annoyance than actual good [(#306)](https://github.com/mongo-express/mongo-express/pull/306)
* Updated swig to swig-template, which uses a safe version [(#311)](https://github.com/mongo-express/mongo-express/pull/311)


# 0.36.0 - Tue Feb 7, 2017

* Fix content-disposition non-ascii header, set config.gridFSEnabled via env vars [(#304)](https://github.com/mongo-express/mongo-express/pull/304)

# 0.35.0 - Thu Jan 5, 2017

* Removed Duplicated navbar in mobile layout [(#302)](https://github.com/mongo-express/mongo-express/pull/302)
* Add logger options to control logging [(#300)](https://github.com/mongo-express/mongo-express/pull/300)
* Pass options in middleware-only usage [(#299)](https://github.com/mongo-express/mongo-express/pull/299)

# 0.34.0 - Fri Dec 23, 2016


## Fixes
* Fixed index are no longer deletable in read-only mode [(#298)](https://github.com/mongo-express/mongo-express/pull/298)

# 0.33.0 - Tue Dec 6, 2016


## New
* Delete all Documents matching a query.

## Fixes
* Fixed issue where binary types we're converted to string when updating a document

# 0.32.0 - Sat Nov 12, 2016


## New
* ObjectID can now be used without the ObjectID wrapper.
* Added export to CSV
* Added index management. You can now delete index or reIndex a collection

## Fixes
* Fixed issue where ObjectID we're incorrectly stringified


# 0.30.48

 * Add support for super large Objects

# 0.21.0

* Added database statistics (karthik25)
* Added basic auth (netpi)
* Added complex querying (kathik25)

# 0.20.0

* Added JSON find type
* Added collection export
* Added confirmation dialog on delete
* Added uptime info in days
* Fixed long collection name issue

# 0.18.0

* Updated express package version
* Updated swig package version
* Added simple key-value document searching

# 0.17.5

* Specified version 3.0.0alpha1 of express in package.json. Latest version of express is causing errors.

# 0.17.4

* Removed hacky BSON->string conversion function
* Replaced it with a modified JSON.stringify function

# 0.17.3

* Removed requirement for doc IDs to be ObjectID type

# 0.17.2

* Added build status images in README

# 0.17.1

* Added tests for BSON conversion functions

# 0.17.0

* Added support for all BSON data types except Binary
* Fixed BSON converter so not only top-level values get converted
* Updated README with more BSON data type examples

# 0.16.1

* Fixed bug: when trying to delete document, collection gets deleted

# 0.16.0

* Added support for some BSON data types when viewing docs
* Updated README with list of supported data types

# 0.15.0

* Added support for BSON data types when adding/editing docs

# 0.14.1

* Forgot to update HISTORY file

# 0.14.0

* Added success/error feedback messages
* Added cookie/session middleware
* Added cookieSecret and sessionSecret options to config
* Moved config.js to config.default.js
* Updated configuration instructions in README

# 0.13.0

* Added version history
* Added MIT license
* Added pager links above document list
* Added pagination links below document list
* Added config option to set number of documents displayed per page

# 0.12.0

* Added async package to dependencies
* Added system.users to list of un-editable collections
* Changed config file to allow lists of databases and associated auth details
* Added support for regular MongoDB users
* Removed requirement for admin access to the MongoDB server
