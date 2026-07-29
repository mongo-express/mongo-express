// mocha looks up the root hooks by the named `mochaHooks` export; a default export is not
// picked up, so the single-export rule does not apply here.
/* eslint-disable import/prefer-default-export */
import { stopMemoryServers } from './testMongoUtils.js';

// Mocha root hooks: this runs once, after every spec file, and is the only place that can
// stop the ephemeral MongoDB servers before `exit: true` kills the process.
export const mochaHooks = {
  async afterAll() {
    await stopMemoryServers();
  },
};
