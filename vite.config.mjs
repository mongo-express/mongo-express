import { fileURLToPath } from 'node:url';
import inject from '@rollup/plugin-inject';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const env = process.env.NODE_ENV || 'development';
const isDev = env === 'development';
const isProd = !isDev;

export default defineConfig({
  mode: isProd ? 'production' : 'development',
  root: 'lib',
  plugins: [
    inject({  // => that should be first under plugins array
      $: 'jquery',
      jQuery: 'jquery',
    }),
    viteStaticCopy({
      targets: [
        { src: 'public/images/*', dest: 'img/[name][ext]' },
        { src: 'public/stylesheets/*', dest: 'css/[name][ext]' },
      ]
    })
  ],
  build: {
    outDir: fileURLToPath(new URL('build', import.meta.url)),
    emptyOutDir: true, // also necessary for outDir
    rollupOptions: {
      input: {
        // Shared
        vendor: fileURLToPath(new URL('./lib/scripts/vendor.js', import.meta.url)),
        codemirror: fileURLToPath(new URL('./lib/scripts/editor.js', import.meta.url)),

        index: fileURLToPath(new URL('./lib/scripts/index.js', import.meta.url)),
        login: fileURLToPath(new URL('./lib/scripts/login.js', import.meta.url)),
        database: fileURLToPath(new URL('./lib/scripts/database.js', import.meta.url)),
        collection: fileURLToPath(new URL('./lib/scripts/collection.js', import.meta.url)),
        document: fileURLToPath(new URL('./lib/scripts/document.js', import.meta.url)),
        gridfs: fileURLToPath(new URL('./lib/scripts/gridfs.js', import.meta.url)),
      },
    },
  },
});
