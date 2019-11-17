'use strict';

const expect = require('chai').expect;
const mongodb = require('mongodb');

const bson = require('../../lib/bson');

describe('BSON', function () {
  describe('toBSON', function () {
    it('should convert documents with native JS types', function () {
      const test = '{test: true, "s": "hello", i: -99.44}';
      const result = bson.toBSON(test);
      expect(result).to.eql({
        test: true,
        s: 'hello',
        i: -99.44,
      });
    });

    it('should convert ObjectID to BSON', function () {
      const test = '{_id: ObjectID(), id2: ObjectId()}';
      const result = bson.toBSON(test);
      expect(result).to.have.property('_id').to.be.an.instanceof(mongodb.ObjectId);
      expect(result).to.have.property('id2').to.be.an.instanceof(mongodb.ObjectId);
    });

    it('should convert ISODate to BSON', function () {
      const test = '{date: ISODate(), date2: new Date()}';
      const result = bson.toBSON(test);

      expect(result).to.have.property('date').to.be.an.instanceof(Date);
      expect(result).to.have.property('date2').to.be.an.instanceof(Date);
    });

    it('should convert Timestamp to BSON', function () {
      const test = '{ts: Timestamp()}';
      const result = bson.toBSON(test);

      expect(result).to.have.property('ts').to.be.an.instanceof(mongodb.Timestamp);
    });

    it('should convert DBRef to BSON', function () {
      const test = `{
        ref: DBRef("coll", "579e18580bddc20700502419"),
        ref2: DBRef("coll", "579e18580bddc20700502419", "db"),
        ref3: DBRef("coll", "579e18580bddc20700502419", "")
      }`;
      const result = bson.toBSON(test);
      expect(result).to.have.property('ref').to.be.an.instanceof(mongodb.DBRef);
      expect(result).to.have.property('ref').to.have.property('namespace', 'coll');
      expect(result).to.have.property('ref').to.have.property('oid').eql('579e18580bddc20700502419');

      expect(result).to.have.property('ref2').to.be.an.instanceof(mongodb.DBRef);
      expect(result).to.have.property('ref2').to.have.property('db', 'db');

      expect(result).to.have.property('ref3').to.be.an.instanceof(mongodb.DBRef);
      expect(result).to.have.property('ref3').to.have.property('db', '');
    });

    it('should convert Symbol to BSON', function () {
      const test = '{symbol: Symbol("test")}';
      const result = bson.toBSON(test);

      expect(result).to.have.property('symbol').to.be.an.instanceof(mongodb.Symbol);
    });

    it('should convert MinKey to BSON', function () {
      const test = '{key: MinKey()}';
      const result = bson.toBSON(test);

      expect(result).to.have.property('key').to.be.an.instanceof(mongodb.MinKey);
    });

    it('should convert MaxKey to BSON', function () {
      const test = '{key: MaxKey()}';
      const result = bson.toBSON(test);

      expect(result).to.have.property('key').to.be.an.instanceof(mongodb.MaxKey);
    });

    it('should convert Code to BSON', function () {
      const test = '{code: Code(function() { x; }), code2: Code("function() { x; }")}';
      const result = bson.toBSON(test);

      expect(result).to.have.property('code').to.be.an.instanceof(mongodb.Code);
      expect(result).to.have.property('code2').to.be.an.instanceof(mongodb.Code);
    });

    it('should not be executable', function () {
      const test = 'this.constructor.constructor("return console")().log(this.constructor.constructor("return process")().mainModule.require(\'child_process\').execSync(\'id\').toString())'; // eslint-disable-line max-len
      expect(() => bson.toBSON(test)).throws(/Cannot read property 'constructor' of undefined/);
    });
  });

  describe('toString', function () {
    it('should convert simple documents', function () {
      const test = {
        bool: true,
        str: 'string',
        number: -678.53,
        list: [1, 2, 3],
      };
      const result = bson.toString(test);
      const test2 = bson.toBSON(result);

      expect(test).to.eql(test2);
    });

    it('should convert ObjectID to string', function () {
      const test = {
        id: mongodb.ObjectId(),
        id2: mongodb.ObjectId('4fb1299686a989240b000001'),
      };
      const result = bson.toString(test);
      const test2 = bson.toBSON(result);

      expect(test).to.eql(test2);
    });

    it('should convert ISODate to string', function () {
      const test = {
        date: new Date(),
      };
      const result = bson.toString(test);
      const test2 = bson.toBSON(result);

      expect(test).to.eql(test2);
    });

    it('should convert Timestamp to string', function () {
      const test = {
        ts: mongodb.Timestamp(),
        ts2: mongodb.Timestamp(100, 100),
      };
      const result = bson.toString(test);
      const test2 = bson.toBSON(result);
      expect(test2).to.eql(test);
    });

    it('should convert DBRef to string', function () {
      const test = {
        ref: mongodb.DBRef('coll', mongodb.ObjectId('57b80f922128ccef64333288'), ''),
        ref2: mongodb.DBRef('coll', mongodb.ObjectId('57b80f922128ccef64333288'), 'db'),
      };
      const result = bson.toString(test);
      const expected = `{\n    ref: DBRef('coll', '57b80f922128ccef64333288', ''),\n    ref2: DBRef('coll', '57b80f922128ccef64333288', 'db')\n}`;
      expect(result).to.eql(expected);
    });

    it('should convert Symbol to string', function () {
      const test = { symbol: mongodb.Symbol('test') };
      const result = bson.toString(test);
      expect(result).to.eql(`{\n    symbol: {\n        _bsontype: 'Symbol',\n        value: 'test'\n    }\n}`);
    });

    it('should convert MinKey to string', function () {
      const test = { key: mongodb.MinKey() };
      const result = bson.toString(test);
      const test2 = bson.toBSON(result);

      expect(test).to.eql(test2);
    });

    it('should convert MaxKey to string', function () {
      const test = { key: mongodb.MaxKey() };
      const result = bson.toString(test);
      const test2 = bson.toBSON(result);

      expect(test).to.eql(test2);
    });

    it('should convert Code to string', function () {
      const test = { code: mongodb.Code('function() { x; }') };
      const result = bson.toString(test);
      expect(result).to.eql(`{\n    code: Code('function() { x; }')\n}`);
    });
  });

  describe('toJsonString', function () {
    it('should convert to a valid JSON string', function () {
      const doc = {
        dateObject: new Date(Date.UTC(2017, 1, 11)),
        objectID: new mongodb.ObjectId('589f79826ea20d18e06b1c36'),
        someValue: 'someValue',
        nestedObject: { level1: { level2: 2 } },
      };
      const result = bson.toJsonString(doc);
      const expected = '{"dateObject":{"$date":"2017-02-11T00:00:00.000Z"},"objectID":{"$oid":"589f79826ea20d18e06b1c36"},"someValue":"someValue","nestedObject":{"level1":{"level2":2}}}'; // eslint-disable-line max-len
      expect(result).to.equal(expected);
      const parsed = JSON.parse(result);
      expect(parsed.someValue).to.equal(doc.someValue);
    });

    it('shouldn\'t convert lone parenthesis to }', function () {
      const doc = {
        someString: '))))',
      };
      const result = bson.toJsonString(doc);
      const expected = '{"someString":"))))"}';
      expect(result).to.equal(expected);
      const parsed = JSON.parse(result);
      expect(parsed.someString).to.equal(doc.someString);
    });
  });

  describe('parseObjectId', function () {
    it('should parse a naked id', () => {
      const test = '4fb1299686a989240b000001';
      const result = bson.parseObjectId(test);
      expect(result).to.be.an.instanceof(mongodb.ObjectId);
      expect(result.toHexString()).to.equal(test);
    });
    it('should parse when it has an ObjectId wrapper', () => {
      const objectIdStr = '4fb1299686a989240b000001';
      const test = `ObjectId("${objectIdStr}")`;
      const result = bson.parseObjectId(test);
      expect(result).to.be.an.instanceof(mongodb.ObjectId);
      expect(result.toHexString()).to.equal(objectIdStr);
    });
  });
});
