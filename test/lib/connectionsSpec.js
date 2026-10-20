import { expect } from 'chai';

import { createConnectionPool } from '../../lib/connections.js';

const config = { explorer: { secret: 'shared-secret' }, mongodb: {} };

/** Stands in for lib/db.js, reporting which connection string it was given. */
const fakeConnect = async ({ mongodb }) => ({ id: mongodb.connectionString, clients: [] });

describe('connection pool', function () {
  it('keeps one connection per session, so two people do not share one database', async function () {
    const pool = createConnectionPool(config, fakeConnect);

    await pool.open('session-a', 'mongodb://alice/alice');
    await pool.open('session-b', 'mongodb://bob/bob');

    expect(pool.get('session-a').id).to.equal('mongodb://alice/alice');
    expect(pool.get('session-b').id).to.equal('mongodb://bob/bob');
    pool.stop();
  });

  it('reports no connection for a session that never opened one', function () {
    const pool = createConnectionPool(config, fakeConnect);

    expect(pool.get('stranger')).to.equal(null);
    pool.stop();
  });

  it('closes the previous connection when a session reconnects', async function () {
    const closed = [];
    const pool = createConnectionPool(config, async ({ mongodb }) => ({
      clients: [{ client: { close: async () => { closed.push(mongodb.connectionString); } } }],
    }));

    await pool.open('session-a', 'mongodb://first/db');
    await pool.open('session-a', 'mongodb://second/db');

    expect(closed).to.eql(['mongodb://first/db']);
    pool.stop();
  });

  it('leaves the session without a connection when the database refuses', async function () {
    const pool = createConnectionPool(config, async () => {
      throw new Error('Authentication failed');
    });

    let thrown;
    try {
      await pool.open('session-a', 'mongodb://nope/db');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).to.be.an('error');
    expect(pool.get('session-a')).to.equal(null);
    pool.stop();
  });

  it('drops a session and forgets its connection', async function () {
    const pool = createConnectionPool(config, fakeConnect);

    await pool.open('session-a', 'mongodb://alice/alice');
    await pool.drop('session-a');

    expect(pool.get('session-a')).to.equal(null);
    pool.stop();
  });

  it('accepts a ticket once', function () {
    const pool = createConnectionPool(config, fakeConnect);
    const ticket = pool.issueTicket('mongodb://alice/alice');

    expect(pool.redeemTicket(ticket)).to.equal('mongodb://alice/alice');
    expect(pool.redeemTicket(ticket)).to.equal(null);
    pool.stop();
  });

  it('rejects an expired ticket', function () {
    const pool = createConnectionPool(
      { ...config, explorer: { ...config.explorer, ticketSeconds: -1 } },
      fakeConnect,
    );

    expect(pool.redeemTicket(pool.issueTicket('mongodb://alice/alice'))).to.equal(null);
    pool.stop();
  });

  it('rejects a ticket nobody issued', function () {
    const pool = createConnectionPool(config, fakeConnect);

    expect(pool.redeemTicket('made-up')).to.equal(null);
    pool.stop();
  });

  it('only authorises the configured secret', function () {
    const pool = createConnectionPool(config, fakeConnect);

    expect(pool.authorised('shared-secret')).to.equal(true);
    expect(pool.authorised('wrong')).to.equal(false);
    expect(pool.authorised('shared-secre')).to.equal(false);
    expect(pool.authorised()).to.equal(false);
    pool.stop();
  });

  it('authorises nothing when no secret is configured, rather than everything', function () {
    const pool = createConnectionPool({ explorer: {}, mongodb: {} }, fakeConnect);

    expect(pool.authorised('')).to.equal(false);
    expect(pool.authorised()).to.equal(false);
    expect(pool.authorised('anything')).to.equal(false);
    pool.stop();
  });
});
