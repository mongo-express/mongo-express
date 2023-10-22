import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import mustache from 'mustache';
// import fileUpload from 'express-fileupload';
import fileUpload from 'fastify-file-upload';
import * as swigFilters from './filters.js';
import router from './router.js';

const middleware = async function (config) {
  const app = fastify();

  app.register(fastifyStatic, {
    root: JSON.parse(fs.readFileSync('./build-assets.json'))
  });

  // Set template engine
  app.register(fastifyView, {
    engine: {
      mustache
    },
    root: fileURLToPath(new URL('views', import.meta.url)),
    production: process.env.NODE_ENV === 'production',
    viewExt: 'html',
  });

  // Handle file upload
  app.register(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  }));

  app.use('/', await router(config));

  app.set('read_only', config.options.readOnly || false);
  app.set('fullwidth_layout', config.options.fullwidthLayout || false);
  app.set('me_confirm_delete', config.options.confirmDelete || false);
  app.set('me_collapsible_json', config.options.collapsibleJSON || false);
  app.set('me_collapsible_json_default_unfold', config.options.collapsibleJSONDefaultUnfold || false);
  app.set('me_no_export', config.options.noExport || false);
  app.set('gridFSEnabled', config.options.gridFSEnabled || false);
  app.set('no_delete', config.options.noDelete || false);

  return app;
};

export default middleware;
