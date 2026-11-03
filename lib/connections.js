import { randomBytes, timingSafeEqual } from 'node:crypto';

import db from './db.js';

/**
 * One MongoDB connection per browser session, rather than one per process.
 *
 * Upstream holds a single `mongo` in the router's closure and a single
 * `config.mongodb.connectionString`, so the connection form sets the database
 * for everyone: whoever signs in last wins, and every other visitor is looking
 * at their data. Keyed by session id, several people can use one instance at
 * once and each sees only what their own credentials reach.
 */

const DEFAULT_IDLE_MS = 30 * 60 * 1000;
const DEFAULT_TICKET_MS = 60 * 1000;

/** Fixed-width comparison; `===` leaks the length and the first differing byte. */
const secretMatches = function (a, b) {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');

  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }

  return timingSafeEqual(left, right);
};

// `connect` is injectable so the pool's own behaviour can be tested without a server.
/** Closes every client a pool entry holds, ignoring sockets already gone. */
const close = async function (entry) {
  await Promise.all((entry.mongo?.clients || []).map(
    (client) => client.client?.close?.().catch(() => {}),
  ));
};

export const createConnectionPool = function (config, connect = db) {
  const explorer = config.explorer || {};
  const idleMs = (explorer.idleMinutes || 0) * 60 * 1000 || DEFAULT_IDLE_MS;
  const ticketMs = (explorer.ticketSeconds || 0) * 1000 || DEFAULT_TICKET_MS;

  /** sessionId -> { mongo, connectionString, lastUsed } */
  const sessions = new Map();
  /** ticket -> { connectionString, expiresAt } */
  const tickets = new Map();

  const sweep = async () => {
    const now = Date.now();

    for (const [ticket, held] of tickets) {
      if (held.expiresAt <= now) tickets.delete(ticket);
    }

    for (const [id, entry] of sessions) {
      if (now - entry.lastUsed < idleMs) continue;
      sessions.delete(id);
      await close(entry);
    }
  };

  // A leaked connection holds a socket to a student's database open for as long
  // as the process lives, so idle ones are closed rather than merely forgotten.
  const timer = setInterval(() => { void sweep(); }, 60 * 1000);
  timer.unref();

  return {
    /** The connection for this request, or null if the session has none yet. */
    get(sessionId) {
      const entry = sessions.get(sessionId);
      if (!entry) return null;
      entry.lastUsed = Date.now();
      return entry.mongo;
    },

    /** Connects and binds the result to one session. Throws if Mongo refuses. */
    async open(sessionId, connectionString) {
      const previous = sessions.get(sessionId);
      const mongo = await connect({ ...config, mongodb: { ...config.mongodb, connectionString } });

      sessions.set(sessionId, { mongo, connectionString, lastUsed: Date.now() });
      if (previous) await close(previous);

      return mongo;
    },

    async drop(sessionId) {
      const entry = sessions.get(sessionId);
      if (!entry) return;
      sessions.delete(sessionId);
      await close(entry);
    },

    /**
     * Holds a connection string for one redirect.
     *
     * The dashboard hands the credentials over server to server and sends the
     * student a ticket, so the password is never in a URL, in history, or in a
     * referer header.
     */
    issueTicket(connectionString) {
      const ticket = randomBytes(24).toString('hex');
      tickets.set(ticket, { connectionString, expiresAt: Date.now() + ticketMs });
      return ticket;
    },

    redeemTicket(ticket) {
      const held = tickets.get(ticket);
      if (!held) return null;
      tickets.delete(ticket);
      return held.expiresAt > Date.now() ? held.connectionString : null;
    },

    authorised(header) {
      return Boolean(explorer.secret) && secretMatches(header, explorer.secret);
    },

    stop() {
      clearInterval(timer);
    },
  };
};

export default createConnectionPool;
