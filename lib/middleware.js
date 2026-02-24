import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import swig from 'free-swig';
import fileUpload from 'express-fileupload';
import * as swigFilters from './filters.js';
import router from './router.js';

/**
 * Parse request size limit string (e.g., "50mb", "1gb") to bytes.
 * Falls back to 50MB if parsing fails.
 * @param {string} limit - Size limit string like "50mb" or "1gb"
 * @returns {number} Size in bytes
 */
const parseRequestSizeLimit = (limit) => {
  if (!limit) return 50 * 1024 * 1024; // Default 50MB

  const match = String(limit).toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 50 * 1024 * 1024;

  const value = Number.parseInt(match[1], 10);
  const unit = match[2] || 'b';

  const multipliers = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  return value * (multipliers[unit] || 1);
};

const middleware = async function (config) {
  const app = express();

  app.locals.assets = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../build-assets.json', import.meta.url))));

  // Set up swig
  const swigOptions = {
    cache: process.env.NODE_ENV === 'production' ? 'memory' : false,
  };
  const swigEngine = new swig.Swig(swigOptions);
  app.engine('html', swigEngine.renderFile);
  for (const name of Object.keys(swigFilters)) {
    swig.setFilter(name, swigFilters[name]);
  }

  // App configuration
  app.set('views', fileURLToPath(new URL('views', import.meta.url)));
  app.set('view engine', 'html');
  app.set('view options', { layout: false });

  // Handle file upload
  // Use config.site.requestSizeLimit if available, otherwise default to 50MB
  const fileSizeLimit = parseRequestSizeLimit(config.site.requestSizeLimit);
  app.use(fileUpload({
    limits: { fileSize: fileSizeLimit },
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
