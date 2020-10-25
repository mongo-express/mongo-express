'use strict';

const webpack = require('webpack');
const path = require('path');
const AssetsPlugin = require('assets-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const env = process.env.NODE_ENV || 'development';
const isDev = env === 'development';
const isProd = !isDev;

const fileSuffix = isDev ? '' : '-[chunkhash].min';

function resolveModulePath(name) {
  const packageJson = '/package.json';
  return path.dirname(require.resolve(`${name}${packageJson}`));
}

const codemirrorPath = resolveModulePath('codemirror');
const bootstrapPath = resolveModulePath('bootstrap');

module.exports = {
  mode: isProd ? 'production' : 'development',
  entry: {
    index: {
      import: './lib/scripts/index.js',
      dependOn: 'vendor',
    },
    database: {
      import: './lib/scripts/database.js',
      dependOn: 'vendor',
    },
    collection: {
      import: './lib/scripts/collection.js',
      dependOn: ['vendor', 'codemirror'],
    },
    document: {
      import: './lib/scripts/document.js',
      dependOn: ['vendor', 'codemirror'],
    },
    gridfs: {
      import: './lib/scripts/gridfs.js',
      dependOn: 'vendor',
    },

    // Shared
    vendor: './lib/scripts/vendor.js',
    codemirror: {
      import: './lib/scripts/codeMirrorLoader.js',
      dependOn: 'vendor',
    },
  },
  output: {
    filename: `[name]${fileSuffix}.js`,
    path: path.join(__dirname, 'build'),
    publicPath: 'public/',
  },

  module: {
    rules: [
      {
        test: /.js$/,
        loader: 'babel-loader',
        exclude: /(node_modules)/,
        options: {
          presets: ['@babel/preset-env'],
        },
      },
    ],
  },

  plugins: [
    new CleanWebpackPlugin(),

    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env),
      __DEV__: isDev,
    }),

    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/images/*', to: 'img/[name].[ext]' },
        { from: 'public/stylesheets/*', to: 'css/[name].[ext]' },

        { from: path.join(codemirrorPath, '/lib/codemirror.css'), to: 'css/[name].[ext]' },
        { from: path.join(codemirrorPath, '/theme/*'), to: 'css/theme/[name].[ext]' },

        { from: path.join(bootstrapPath, '/dist/fonts/*'), to: 'fonts/[name].[ext]' },
        { from: path.join(bootstrapPath, '/dist/css/bootstrap.min.css'), to: 'css/[name].[ext]' },
        { from: path.join(bootstrapPath, '/dist/css/bootstrap.min.css.map'), to: 'css/[name].[ext]' },
        { from: path.join(bootstrapPath, '/dist/css/bootstrap-theme.min.css'), to: 'css/[name].[ext]' },
        { from: path.join(bootstrapPath, '/dist/css/bootstrap-theme.min.css.map'), to: 'css/[name].[ext]' },
      ],
    }),

    new AssetsPlugin({ filename: 'build-assets.json' }),
  ].filter((n) => !!n),
};
