import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AssetsPlugin from 'assets-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const env = process.env.NODE_ENV || 'development';
const isDev = env === 'development';
const isProd = !isDev;

const fileSuffix = isDev ? '' : '-[chunkhash].min';

function resolveModulePath(name) {
  return path.dirname(require.resolve(`${name}/package.json`));
}

const codemirrorPath = resolveModulePath('codemirror');
const bootstrapPath = resolveModulePath('bootstrap');

export default {
  mode: isProd ? 'production' : 'development',
  performance: {
    maxEntrypointSize: 768000,
    maxAssetSize: 768000,
  },
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
        { from: 'public/images/*', to: 'img/[name][ext]' },
        { from: 'public/stylesheets/*', to: 'css/[name][ext]' },

        { from: path.join(codemirrorPath, '/lib/codemirror.css'), to: 'css/[name][ext]' },
        { from: path.join(codemirrorPath, '/theme'), to: 'css/theme/[name][ext]' },

        { from: path.join(bootstrapPath, '/dist/fonts'), to: 'fonts/[name][ext]' },
        { from: path.join(bootstrapPath, '/dist/css/bootstrap.min.css'), to: 'css/[name][ext]' },
        { from: path.join(bootstrapPath, '/dist/css/bootstrap.min.css.map'), to: 'css/[name][ext]' },
        { from: path.join(bootstrapPath, '/dist/css/bootstrap-theme.min.css'), to: 'css/[name][ext]' },
        { from: path.join(bootstrapPath, '/dist/css/bootstrap-theme.min.css.map'), to: 'css/[name][ext]' },
      ],
    }),

    new AssetsPlugin({ filename: 'build-assets.json' }),
  ].filter((n) => !!n),
};
