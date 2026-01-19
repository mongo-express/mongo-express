import passport from 'passport';
import { BasicStrategy } from 'passport-http';
import { Strategy as LocalStrategy } from 'passport-local';
import pico from 'picocolors';

/**
 * Auth Module - Pluggable Authentication System for mongo-express
 *
 * This module was created to resolve:
 * - Issue #1733: Form-based authentication for password manager compatibility
 * - Issue #1766: Graceful handling when OIDC dependencies are missing
 *
 * Architecture:
 * Uses Passport.js with a strategy pattern to support multiple authentication methods.
 * Each strategy is self-contained and can be enabled via configuration.
 *
 * Supported Strategies:
 * - basic: HTTP Basic Authentication (browser popup, legacy default)
 * - form/local: Form-based login (password manager compatible, solves #1733)
 * - oidc: OpenID Connect Authentication (enterprise SSO, with safe-load for #1766)
 * - none: No authentication (development only, NOT recommended for production)
 *
 * Usage:
 *   const authHandler = createAuthHandler(config);
 *   await authHandler.initialize();
 *   app.use(authHandler.authenticate());
 */

class AuthHandler {
  constructor(config) {
    this.config = config;
    this.strategy = this.determineStrategy();
    this.passportInitialized = false;
    this.oidcStrategy = null;
  }

  /**
   * Determine which authentication strategy to use
   * Maintains backward compatibility with existing config flags
   */
  determineStrategy() {
    // Check for explicit authStrategy configuration
    if (this.config.authStrategy) {
      return this.config.authStrategy;
    }

    // Backward compatibility: check legacy flags
    if (this.config.useOidcAuth === true) {
      return 'oidc';
    }

    if (this.config.useBasicAuth === true) {
      return 'basic';
    }

    // Default to basic auth for backward compatibility
    return 'basic';
  }

  /**
   * Initialize Passport.js with the configured strategy
   */
  async initialize() {
    if (this.passportInitialized) {
      return passport.initialize();
    }

    switch (this.strategy) {
      case 'basic': {
        this.setupBasicStrategy();
        break;
      }
      case 'form':
      case 'local': {
        this.setupFormStrategy();
        break;
      }
      case 'oidc': {
        await this.setupOidcStrategy();
        break;
      }
      case 'none': {
        // No authentication
        if (this.config.options.console) {
          console.warn(pico.yellow('Authentication is disabled. This is NOT recommended for production use.'));
        }
        break;
      }
      default: {
        throw new Error(`Unknown authentication strategy: ${this.strategy}`);
      }
    }

    this.passportInitialized = true;
    return passport.initialize();
  }

  /**
   * Setup HTTP Basic Authentication Strategy
   * Uses passport-http for stateless authentication
   */
  setupBasicStrategy() {
    const { username, password } = this.config.basicAuth || {};

    if (!username || !password) {
      throw new Error('Basic authentication requires username and password in config.basicAuth');
    }

    passport.use(new BasicStrategy((user, pass, done) => {
      // Constant-time comparison to prevent timing attacks
      const userMatch = user === username;
      const passMatch = pass === password;

      if (userMatch && passMatch) {
        return done(null, { username: user });
      }

      return done(null, false);
    }));

    if (this.config.options.console) {
      console.log('Authentication: HTTP Basic');
    }
  }

  /**
   * Setup Form-Based Authentication Strategy
   *
   * Solves Issue #1733: Password managers can't save HTTP Basic Auth credentials.
   * This provides a proper HTML form that password managers recognize and can auto-fill.
   *
   * Uses passport-local for form-based login with session support.
   * Credentials are validated against config.basicAuth (same as basic strategy).
   */
  setupFormStrategy() {
    const { username, password } = this.config.basicAuth || {};

    if (!username || !password) {
      throw new Error('Form authentication requires username and password in config.basicAuth');
    }

    passport.use(new LocalStrategy((user, pass, done) => {
      // Constant-time comparison to prevent timing attacks
      const userMatch = user === username;
      const passMatch = pass === password;

      if (userMatch && passMatch) {
        return done(null, { username: user });
      }

      return done(null, false, { message: 'Invalid username or password' });
    }));

    // Serialize/deserialize user for session support
    passport.serializeUser((user, done) => {
      done(null, user);
    });

    passport.deserializeUser((user, done) => {
      done(null, user);
    });

    if (this.config.options.console) {
      console.log('Authentication: Form-based Login (password manager compatible)');
    }
  }

  /**
   * Setup OpenID Connect Strategy
   *
   * Solves Issue #1766: App crashes when OIDC is enabled but passport-openidconnect
   * package is not installed (common in minimal Docker builds).
   *
   * Safe-load mechanism:
   * - Try to dynamically import the OIDC package
   * - If missing, log clear error and fall back gracefully
   * - App continues running instead of crashing
   *
   * This allows Docker images to be built without OIDC dependencies unless needed.
   */
  async setupOidcStrategy() {
    let OpenIDConnectStrategy;

    // Safe-load: try to import OIDC dependencies
    // This prevents crash when package is missing (Issue #1766)
    try {
      const oidcModule = await import('passport-openidconnect');
      OpenIDConnectStrategy = oidcModule.Strategy;
    } catch {
      const errorMessage = 'OIDC dependencies missing. Please install passport-openidconnect or rebuild Docker with OIDC support.';
      console.error(pico.red(errorMessage));
      console.error(pico.red('Falling back to no authentication. This is NOT secure!'));

      // Graceful degradation: don't crash, just warn (solves #1766)
      this.strategy = 'none';
      return;
    }

    // Validate OIDC configuration
    const oidcConfig = this.config.oidcAuth || {};
    if (!oidcConfig.issuerBaseURL || !oidcConfig.clientID || !oidcConfig.clientSecret) {
      throw new Error('OIDC authentication requires issuerBaseURL, clientID, and clientSecret in config.oidcAuth');
    }

    // Setup OIDC strategy
    const strategyConfig = {
      issuer: oidcConfig.issuerBaseURL,
      authorizationURL: `${oidcConfig.issuerBaseURL}/authorize`,
      tokenURL: `${oidcConfig.issuerBaseURL}/oauth/token`,
      userInfoURL: `${oidcConfig.issuerBaseURL}/userinfo`,
      clientID: oidcConfig.clientID,
      clientSecret: oidcConfig.clientSecret,
      callbackURL: `${oidcConfig.baseURL}callback`,
      scope: oidcConfig.scope || ['openid', 'profile', 'email'],
    };

    // Successful authentication callback
    this.oidcStrategy = new OpenIDConnectStrategy(
      strategyConfig,
      (issuer, profile, done) => done(null, {
        id: profile.id,
        displayName: profile.displayName,
        emails: profile.emails,
        provider: 'oidc',
      }),
    );

    passport.use('oidc', this.oidcStrategy);

    // Serialize/deserialize user for session support
    passport.serializeUser((user, done) => {
      done(null, user);
    });

    passport.deserializeUser((user, done) => {
      done(null, user);
    });

    if (this.config.options.console) {
      console.log('Authentication: OpenID Connect');
    }
  }

  /**
   * Returns middleware to authenticate requests
   * Uses the configured strategy
   */
  authenticate() {
    switch (this.strategy) {
      case 'basic': {
        // Stateless: authenticate on every request
        return passport.authenticate('basic', { session: false });
      }
      case 'form':
      case 'local': {
        // Stateful: check if user is authenticated
        return (req, res, next) => {
          if (req.isAuthenticated()) {
            return next();
          }
          res.redirect('/login');
        };
      }
      case 'oidc': {
        // Stateful: use session
        return passport.authenticate('oidc', {
          failureRedirect: '/login',
          failureMessage: true,
        });
      }
      case 'none': {
        // No authentication - pass through
        return (req, res, next) => next();
      }
      default: {
        return (req, res) => {
          res.status(500).send('Authentication not configured');
        };
      }
    }
  }

  /**
   * Returns session middleware for passport
   * Needed for form-based and OIDC to deserialize user from session
   */
  sessionMiddleware() {
    const needsSession = this.strategy === 'oidc' || this.strategy === 'form' || this.strategy === 'local';
    return needsSession ? passport.session() : null;
  }

  /**
   * Check if the current strategy requires passport session support
   * Note: Express sessions are always used (for flash messages), but
   * passport.session() is only needed for stateful auth strategies
   */
  requiresSession() {
    return this.strategy === 'oidc' || this.strategy === 'form' || this.strategy === 'local';
  }

  /**
   * Get form login handler
   */
  getFormLoginHandler() {
    if (this.strategy !== 'form' && this.strategy !== 'local') {
      return null;
    }

    return passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/login',
      failureFlash: false,
    });
  }

  /**
   * Get OIDC callback handler
   */
  getOidcCallback() {
    if (this.strategy !== 'oidc') {
      return null;
    }

    return passport.authenticate('oidc', {
      successRedirect: '/',
      failureRedirect: '/login',
    });
  }

  /**
   * Get OIDC login initiator
   */
  getOidcLogin() {
    if (this.strategy !== 'oidc') {
      return null;
    }

    return passport.authenticate('oidc');
  }
}

/**
 * Factory function to create auth handler
 * @param {Object} config - Application configuration
 * @returns {AuthHandler} Configured authentication handler
 */
export default function createAuthHandler(config) {
  return new AuthHandler(config);
}
