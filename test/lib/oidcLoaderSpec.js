import { expect } from 'chai';

import { loadOidcAuth, resolveStrategy } from '../../lib/auth.js';

// The OIDC handshake itself belongs to express-openid-connect and needs a real identity
// provider to exercise, so it is not simulated here. What is worth guarding is our own
// behaviour around it: that a missing package stops the app rather than quietly disabling
// authentication. An earlier attempt at issue #1766 answered it by setting the strategy to
// 'none' and carrying on, which leaves the database open to anyone who can reach it.
const silence = () => {
  const original = console.error;
  const lines = [];
  console.error = (...args) => { lines.push(args.join(' ')); };

  return { lines, restore: () => { console.error = original; } };
};

describe('OIDC loader', () => {
  it('returns the middleware factory when the package is present', async () => {
    const auth = await loadOidcAuth();

    expect(auth).to.be.a('function');
  });

  it('rethrows when the package is missing, rather than continuing unauthenticated', async () => {
    const missing = new Error("Cannot find package 'express-openid-connect'");
    const captured = silence();

    try {
      await loadOidcAuth(() => Promise.reject(missing));
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).to.equal(missing);
    } finally {
      captured.restore();
    }
  });

  it('explains how to fix it, including the Docker build flag', async () => {
    const captured = silence();

    try {
      await loadOidcAuth(() => Promise.reject(new Error('nope')));
    } catch {
      // expected
    } finally {
      captured.restore();
    }

    const output = captured.lines.join('\n');
    expect(output).to.contain('express-openid-connect');
    expect(output).to.contain('ENABLE_OIDC=true');
  });

  // Belt and braces: 'none' must not be something a configuration can ask for, so a typo in
  // ME_CONFIG_AUTH_STRATEGY cannot switch authentication off.
  it('never resolves an explicit strategy to none', () => {
    expect(resolveStrategy({ useOidcAuth: true })).to.equal('oidc');
    expect(resolveStrategy({ authStrategy: 'oidc' })).to.equal('oidc');
    expect(resolveStrategy({})).to.equal('none');
  });
});
