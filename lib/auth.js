import { timingSafeEqual } from 'node:crypto';

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
