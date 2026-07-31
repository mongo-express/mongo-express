import { fileURLToPath } from 'node:url';
import AssetsPlugin from 'assets-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

const env = process.env.NODE_ENV || 'development';
const isDev = env === 'development';
const isProd = !isDev;

const fileSuffix = isDev ? '' : '-[chunkhash].min';

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
    login: {
      import: './lib/scripts/login.js',
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
      import: './lib/scripts/editor.js',
      dependOn: 'vendor',
    },
  },
  output: {
    filename: `[name]${fileSuffix}.js`,
    path: fileURLToPath(new URL('build', import.meta.url)),
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
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ['file-loader'],
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
      ],
    }),

    new AssetsPlugin({ filename: 'build-assets.json' }),
  ].filter((n) => !!n),
};
