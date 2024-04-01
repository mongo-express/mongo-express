import { expect } from 'chai';
import {
  Binary, BSONSymbol, Code, DBRef, MaxKey, MinKey, ObjectId, Timestamp,
} from 'mongodb';

import * as libBson from '../../lib/bson.js';

describe('BSON', function () {
  describe('toBSON', function () {
    it('should convert documents with native JS types', function () {
      const test = '{test: true, "s": "hello", i: -99.44}';
      const result = libBson.toBSON(test);
      expect(result).to.eql({
        test: true,
        s: 'hello',
        i: -99.44,
      });
    });

    it('should convert ObjectId to BSON', function () {
      const test = '{_id: ObjectId(), id2: ObjectId()}';
      const result = libBson.toBSON(test);
      expect(result).to.have.nested.property('_id._bsontype', 'ObjectId');
      expect(result).to.have.nested.property('id2._bsontype', 'ObjectId');
    });

    it('should convert ISODate to BSON', function () {
      const test = '{date: ISODate(), date2: new Date()}';
      const result = libBson.toBSON(test);

      expect(result).to.have.property('date').to.be.an.instanceof(Date);
      expect(result).to.have.property('date2').to.be.an.instanceof(Date);
    });

    it('should convert Timestamp to BSON', function () {
      const test = '{ts: Timestamp()}';
      const result = libBson.toBSON(test);
      expect(result).to.have.nested.property('ts._bsontype', 'Timestamp');
    });

    it('should convert DBRef to BSON', function () {
      const test = `{
        ref: DBRef("coll", "579e18580bddc20700502419"),
        ref2: DBRef("coll", "579e18580bddc20700502419", "db"),
        ref3: DBRef("coll", "579e18580bddc20700502419", "")
      }`;
      const result = libBson.toBSON(test);
      expect(result).to.have.nested.property('ref._bsontype', 'DBRef');

      expect(result).to.have.property('ref').to.have.property('namespace', 'coll');
      expect(result).to.have.property('ref').to.have.property('oid').eql('579e18580bddc20700502419');

      expect(result).to.have.nested.property('ref2._bsontype', 'DBRef');
      expect(result).to.have.property('ref2').to.have.property('db', 'db');

      expect(result).to.have.nested.property('ref3._bsontype', 'DBRef');
      expect(result).to.have.property('ref3').to.have.property('db', '');
    });

    it('should convert Symbol to BSON', function () {
      const test = '{symbol: Symbol("test")}';
      const result = libBson.toBSON(test);
      expect(result).to.have.nested.property('symbol._bsontype', 'BSONSymbol');
    });

    it('should convert MinKey to BSON', function () {
      const test = '{key: MinKey()}';
      const result = libBson.toBSON(test);

      expect(result).to.have.nested.property('key._bsontype', 'MinKey');
    });

    it('should convert MaxKey to BSON', function () {
      const test = '{key: MaxKey()}';
      const result = libBson.toBSON(test);
      expect(result).to.have.nested.property('key._bsontype', 'MaxKey');
    });

    it('should convert BinData to BSON', function () {
      const test = '{bin: BinData(80, "test")}';
      const result = libBson.toBSON(test);
      expect(result).to.have.nested.property('bin._bsontype', 'Binary');
      expect(result.bin.sub_type).to.equal(80);
    });

    // it('should convert Code to BSON', function () {
    //   const test = '{code: Code(function() { x; }), code2: Code("function() { x; }")}';
    //   const result = libBson.toBSON(test);

    //   expect(result).to.have.property('code').to.be.an.instanceof(Code);
    //   expect(result).to.have.property('code2').to.be.an.instanceof(Code);
    // });
  });

  describe('toString', function () {
    it('should convert simple documents', function () {
      const test = {
        bool: true,
        str: 'string',
        number: -678.53,
        list: [1, 2, 3],
      };
      const result = libBson.toString(test);
      const test2 = libBson.toBSON(result);

      expect(test2).to.eql(test);
    });

    it('should convert ObjectId to string', function () {
      const test = {
        id: new ObjectId(),
        id2: new ObjectId('4fb1299686a989240b000001'),
      };
      const result = libBson.toString(test);
      const test2 = libBson.toBSON(result);
      expect(test2).to.eql(test);
    });

    it('should convert ISODate to string', function () {
      const test = {
        date: new Date(),
      };
      const result = libBson.toString(test);
      const test2 = libBson.toBSON(result);

      expect(test2).to.eql(test);
    });

    it('should convert Timestamp to string', function () {
      const test = {
        ts: new Timestamp(),
        ts2: new Timestamp({ t: 100, i: 100 }),
      };

      const result = libBson.toString(test);
      const test2 = libBson.toBSON(result);
      expect(test2).to.eql(test);
    });

    it('should convert DBRef to string', function () {
      const test = {
        ref: new DBRef('coll', new ObjectId('57b80f922128ccef64333288'), ''),
        ref2: new DBRef('coll', new ObjectId('57b80f922128ccef64333288'), 'db'),
      };
      const result = libBson.toString(test);
      // eslint-disable-next-line max-len
      const expected = '{\n    ref: DBRef(\'coll\', \'57b80f922128ccef64333288\'),\n    ref2: DBRef(\'coll\', \'57b80f922128ccef64333288\', \'db\')\n}';
      expect(result).to.eql(expected);
    });

    it('should convert Symbol to string', function () {
      const test = { symbol: new BSONSymbol('test') };
      const result = libBson.toString(test);
      expect(result).to.eql('{\n    symbol: {\n        value: \'test\'\n    }\n}');
    });

    it('should convert MinKey to string', function () {
      const test = { key: new MinKey() };
      const result = libBson.toString(test);
      const test2 = libBson.toBSON(result);

      expect(test2).to.eql(test);
    });

    it('should convert MaxKey to string', function () {
      const test = { key: new MaxKey() };
      const result = libBson.toString(test);

      const test2 = libBson.toBSON(result);
      expect(test2.key._bsontype).to.eql('MaxKey');
    });

    it('should convert Code to string', function () {
      const test = { code: new Code('function() { x; }') };
      const result = libBson.toString(test);
      expect(result).to.eql('{\n    code: Code(\'function() { x; }\')\n}');
    });

    it('should convert BinData to string', function () {
      const test = { bin: new Binary(new TextEncoder().encode('test'), 80) };
      const result = libBson.toString(test);
      expect(result).to.eql('{\n    bin: BinData(80, \'dGVzdA==\')\n}');
    });
  });

  describe('toJsonString', function () {
    it('should convert to a valid JSON string', function () {
      const doc = {
        dateObject: new Date(Date.UTC(2017, 1, 11)),
        objectId: new ObjectId('589f79826ea20d18e06b1c36'),
        someValue: 'someValue',
        nestedObject: { level1: { level2: 2 } },
      };
      const result = libBson.toJsonString(doc);
      const expected = '{"dateObject":{"$date":"2017-02-11T00:00:00Z"},"objectId":{"$oid":"589f79826ea20d18e06b1c36"},"someValue":"someValue","nestedObject":{"level1":{"level2":2}}}'; // eslint-disable-line max-len
      expect(result).to.equal(expected);
      const parsed = JSON.parse(result);
      expect(parsed.someValue).to.equal(doc.someValue);
    });

    it('shouldn\'t convert lone parenthesis to }', function () {
      const doc = {
        someString: '))))',
      };
      const result = libBson.toJsonString(doc);
      const expected = '{"someString":"))))"}';
      expect(result).to.equal(expected);
      const parsed = JSON.parse(result);
      expect(parsed.someString).to.equal(doc.someString);
    });
  });

  describe('parseObjectId', function () {
    it('should parse a naked id', () => {
      const test = '4fb1299686a989240b000001';
      const result = libBson.parseObjectId(test);
      expect(result).to.have.property('_bsontype', 'ObjectId');
      // expect(result).to.be.an.instanceof(ObjectId);
      expect(result.toHexString()).to.equal(test);
    });
    it('should parse when it has an ObjectId wrapper', () => {
      const objectIdStr = '4fb1299686a989240b000001';
      const test = `ObjectId("${objectIdStr}")`;
      const result = libBson.parseObjectId(test);
      expect(result).to.have.property('_bsontype', 'ObjectId');
      expect(result.toHexString()).to.equal(objectIdStr);
    });
  });
});
