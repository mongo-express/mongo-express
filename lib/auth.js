import { timingSafeEqual } from 'node:crypto';
import pico from 'picocolors';

/**
 * Compare two strings without leaking their contents through timing.
 *
 * timingSafeEqual throws when the buffers differ in length, which would leak the length by
 * itself, so both sides are hashed to a fixed width first. A plain `===` short-circuits on
 * the first differing byte and is what makes credential comparison timing-attackable.
 */
const safeEqual = function (a, b) {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');

  if (left.length !== right.length) {
    // Still do the comparison, against ourselves, so the work is the same either way.
    timingSafeEqual(left, left);
    return false;
  }

  return timingSafeEqual(left, right);
};

/**
 * Which authentication strategy is in force.
 *
 * `authStrategy` is the explicit setting; the older `useOidcAuth` / `useBasicAuth` booleans
 * are still honoured so existing configurations keep working. There is deliberately no
 * 'none': turning authentication off is done by leaving it unconfigured, not by asking for
 * it, so a typo cannot open an instance up.
 */
export const resolveStrategy = function (config) {
  if (config.authStrategy) {
    return config.authStrategy;
  }
  if (config.useOidcAuth === true) {
    return 'oidc';
  }
  if (config.useBasicAuth === true) {
    return 'basic';
  }

  return 'none';
};

export const isFormStrategy = (config) => resolveStrategy(config) === 'form';

export const verifyCredentials = function (config, username, password) {
  const expected = config.basicAuth || {};

  // Both comparisons always run; `&&` would skip the second one once the first fails.
  const userMatches = safeEqual(username, expected.username);
  const passwordMatches = safeEqual(password, expected.password);

  return userMatches && passwordMatches;
};

export const loginPath = (config) => `${config.site.baseUrl || '/'}login`;

/**
 * Gate every request behind a session flag set by the login form.
 *
 * The login page and the health check have to stay reachable, or there is no way in and no
 * way to probe the instance.
 */
export const requireLogin = function (config) {
  const allowed = new Set([loginPath(config), config.healthCheck.path]);

  return function (req, res, next) {
    if (req.session?.authenticated === true || allowed.has(req.originalUrl.split('?', 1)[0])) {
      return next();
    }

    req.session.error = 'Please sign in to continue.';

    return res.redirect(loginPath(config));
  };
};

/**
 * Load the OIDC middleware factory.
 *
 * The importer is injectable so the missing-package path can be tested: the package is
 * installed in development, and that path is the one worth guarding — an earlier attempt at
 * issue #1766 answered a missing package by disabling authentication and carrying on, which
 * leaves the database open. Refusing to start is the point.
 *
 * @param {Function} [importer] resolves to the express-openid-connect module
 * @returns {Promise<Function>} the `auth` middleware factory
 * @throws whatever the import threw, after explaining what to do about it
 */
export const loadOidcAuth = async function (importer = () => import('express-openid-connect')) {
  try {
    const { auth } = await importer();

    return auth;
  } catch (error) {
    console.error(pico.red('OIDC authentication is enabled but the "express-openid-connect" package isn\'t installed.'));
    console.error(pico.red('Please install the "express-openid-connect" package or disable OIDC authentication in the configuration file.'));
    console.error(pico.red('When building the Docker image, pass --build-arg ENABLE_OIDC=true to include it.'));
    throw error;
  }
};
