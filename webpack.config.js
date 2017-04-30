'use strict';

const webpack = require('webpack');
const path = require('path');
const AssetsPlugin = require('assets-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
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
  entry: {
    index: './lib/scripts/index.js',
    database: './lib/scripts/database.js',
    collection: './lib/scripts/collection.js',
    document: './lib/scripts/document.js',
    gridfs: './lib/scripts/gridfs.js',

    vendor: './lib/scripts/vendor.js',
    codemirror: './lib/scripts/codeMirrorLoader.js',
  },
  output: {
    filename: `[name]${fileSuffix}.js`,
    path: path.join(__dirname, 'build'),
    publicPath: 'public/',
  },

  module: {
    loaders: [
      {
        test: /.js$/,
        loader: 'babel-loader',
        exclude: /(node_modules)/,
        query: {
          presets: ['es2015'],
        },
      },
    ],
  },

  plugins: [
    new CleanWebpackPlugin(['build']),

    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env),
      __DEV__: isDev,
    }),

    new webpack.optimize.CommonsChunkPlugin({
      names: ['codemirror', 'vendor'],
      filename: `[name]${fileSuffix}.js`,
    }),

    isProd && (new webpack.optimize.UglifyJsPlugin()),
    isProd && (new webpack.optimize.OccurrenceOrderPlugin(true)),

    new CopyWebpackPlugin([
      { from: 'public/images/*', to: 'img/[name].[ext]' },
      { from: 'public/stylesheets/*', to: 'css/[name].[ext]' },

      { from: path.join(codemirrorPath, '/lib/codemirror.css'), to: 'css/[name].[ext]' },
      { from: path.join(codemirrorPath, '/theme/*'), to: 'css/theme/[name].[ext]' },

      { from: path.join(bootstrapPath, '/dist/fonts/*'), to: 'fonts/[name].[ext]' },
      { from: path.join(bootstrapPath, '/dist/css/bootstrap.min.css'), to: 'css/[name].[ext]' },
      { from: path.join(bootstrapPath, '/dist/css/bootstrap.min.css.map'), to: 'css/[name].[ext]' },
      { from: path.join(bootstrapPath, '/dist/css/bootstrap-theme.min.css'), to: 'css/[name].[ext]' },
      { from: path.join(bootstrapPath, '/dist/css/bootstrap-theme.min.css.map'), to: 'css/[name].[ext]' },
    ]),

    new AssetsPlugin({ filename: 'build-assets.json' }),
  ].filter(n => !!n),
};
