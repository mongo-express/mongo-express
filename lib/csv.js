import { Parser } from '@json2csv/plainjs';
import { flatten } from 'flat';
import { isPlainObject } from 'lodash-es';

const handleObject = (data) => {
  for (const x in data) {
    if (data[x] && data[x].constructor.name === 'ObjectId') {
      data[x] = `ObjectId("${data[x]}")`;
    } else if (isPlainObject(data[x])) {
      handleObject(data[x]);
    }
  }
};

const csv = (data) => {
  for (let i = 0, ii = data.length; i < ii; i++) {
    const current = data[i];
    handleObject(current);
    data[i] = flatten(current, { safe: true });
  }
  const parser = new Parser({ eol: '\n' });
  return parser.parse(data);
};

export default csv;
