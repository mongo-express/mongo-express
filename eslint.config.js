import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import unicorn from 'eslint-plugin-unicorn';
import stylistic from '@stylistic/eslint-plugin';

// Flat config, required from ESLint 10 on, which no longer reads .eslintrc.
//
// This replaces eslint-config-airbnb-base. That package is stuck on 15.0.0 (2022) and
// declares `eslint: ^7 || ^8`, so it cannot follow ESLint 9+. Rather than swap in another
// meta-config, the stylistic rules the codebase actually relies on are listed explicitly
// below via @stylistic — the previous config already switched about 25 airbnb rules off,
// so little of it was load-bearing.

export default [
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'lib/views/**',
      'instrumented/**',
      'coverage/**',
      'cypress/**',
      // Vendored yarn release: a single 2.9 MB bundle. .eslintignore never needed to list
      // it, but flat config walks dot-directories, and linting it stalls the run.
      '.yarn/**',
    ],
  },

  js.configs.recommended,
  unicorn.configs['flat/all'],

  {
    languageOptions: {
      // The default espree parser covers everything here; @babel/eslint-parser was needed
      // for syntax espree once lagged on, and it does not support ESLint 10 (it throws
      // `scopeManager.addGlobals is not a function`).
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2025 },
    },
    plugins: {
      import: importPlugin,
      '@stylistic': stylistic,
    },
    rules: {
      // Style previously inherited from airbnb-base, kept so the codebase does not churn.
      '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/space-before-blocks': 'error',
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/max-len': ['error', 155, 2, {
        // airbnb-base set these alongside its own limit; the previous override replaced
        // the whole option array and silently dropped them.
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      }],

      // Carried over verbatim from .eslintrc.yml
      'import/extensions': ['error', 'always'],
      'import/no-extraneous-dependencies': ['error', {
        devDependencies: [
          '**/test/**/*.js',
          '**/scripts/*.js',
          '**/webpack.config.mjs',
          '**/cypress.config.mjs',
          '**/eslint.config.js',
        ],
      }],

      'no-console': 'off',
      'no-param-reassign': 'off',
      'no-plusplus': 'off',
      'no-continue': 'off',
      'no-underscore-dangle': 'off',
      'no-nested-ternary': 'off',
      'no-restricted-syntax': 'off',
      'guard-for-in': 'off',
      'func-names': 'off',
      'new-cap': 'off',
      'consistent-return': 'off',
      'prefer-arrow-callback': 'off',
      'prefer-template': 'off',
      'vars-on-top': 'off',

      'unicorn/filename-case': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-method-this-argument': 'off',
      'unicorn/no-keyword-prefix': 'off',
      'unicorn/no-null': 'off',
      'unicorn/numeric-separators-style': 'off',
      'unicorn/prefer-export-from': 'off',
      // Was `unicorn/prevent-abbreviations`, renamed in unicorn 72. Kept off, as before.
      'unicorn/name-replacements': 'off',

      // Rules added between unicorn 56 and 72. `unicorn/all` opts into everything, so each
      // new release lands new opinions; these clash with how this codebase is written, and
      // adopting them would mean rewriting working code rather than migrating a config.
      'unicorn/prefer-await': 'off', // the route handlers are built on .then() chains
      'unicorn/no-this-outside-of-class': 'off', // jQuery and swig callbacks rely on `this`
      'unicorn/no-unnecessary-global-this': 'off',
      'unicorn/no-top-level-assignment-in-function': 'off',
      'unicorn/no-global-object-property-assignment': 'off',
      'unicorn/no-asterisk-prefix-in-documentation-comments': 'off', // its fix mangles JSDoc
      'unicorn/no-computed-property-existence-check': 'off',
      'unicorn/no-immediate-mutation': 'off',
      'unicorn/no-unreadable-new-expression': 'off',
      'unicorn/no-array-sort': 'off',
      'unicorn/require-array-sort-compare': 'off', // every .sort() here is over strings
      'unicorn/try-complexity': 'off',
      'unicorn/max-nested-calls': 'off',
      'unicorn/comment-content': 'off', // objects to prose like "tls" inside comments
      'unicorn/consistent-boolean-name': 'off',
      'unicorn/default-export-style': 'off',
      'unicorn/prefer-short-arrow-method': 'off',
      'unicorn/prefer-number-coercion': 'off',
      'unicorn/prefer-single-call': 'off',
      'unicorn/prefer-object-iterable-methods': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/prefer-string-repeat': 'off', // would turn '    ' into ' '.repeat(4)
      'unicorn/prefer-temporal': 'off', // Temporal is not available on the supported runtimes
      'unicorn/prefer-dispose': 'off', // `using` needs Symbol.dispose, not on every supported runtime
    },
  },

  {
    // Client-side bundles run in the browser and read settings injected by the template.
    files: ['lib/scripts/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ME_SETTINGS: 'readonly' },
    },
  },

  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: { ...globals.mocha },
    },
  },
];
