'use strict';

module.exports = {
  extends: 'airbnb-base',
  parserOptions: {
    sourceType: 'script',
  },
  env: {
    node: true,
    es6: true,
  },
  plugins: [
    'import',
    'lodash',
  ],
  rules: {
    strict: ['error', 'global'],
    'global-require': ['off'],
    'func-names': ['off'],
    'new-cap': ['off'],
    'consistent-return': ['off'],
    'no-console': ['off'],
    'vars-on-top': ['off'],
    'no-param-reassign': ['off'],
    'prefer-arrow-callback': ['off'],
    'no-nested-ternary': ['off'],

    'no-restricted-syntax': ['off'],
    'no-mixed-operators': ['off'],
    'no-plusplus': ['off'],
    'guard-for-in': ['off'],
    'no-continue': ['off'],

    'no-multi-spaces': ['off'],
    'max-len': ['error', 150, 2],
    'prefer-template': ['off'],
    'no-underscore-dangle': ['off'],

    'import/no-extraneous-dependencies': ['error', {
      devDependencies: [
        '**/test/**/*.js',
        '**/scripts/*.js',
        '**/webpack.config.js',
      ],
    }],

    'lodash/callback-binding': ['error'],
    'lodash/collection-method-value': ['error'],
    'lodash/collection-return': ['error'],
    'lodash/no-double-unwrap': ['error'],
    'lodash/no-extra-args': ['error'],
    'lodash/no-unbound-this': ['error'],
    'lodash/unwrap': ['error'],

    // To be turned on
    'no-shadow': ['off', { allow: ['err', 'error'] }],
  },
};
