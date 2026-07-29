import readline from 'node:readline/promises';

export const MONGO_URI_SCHEMES = ['mongodb://', 'mongodb+srv://'];

/**
 * Whether the whole value is a MongoDB URI.
 *
 * Deliberately not a full URI grammar: prefix checks plus a whitespace scan are linear,
 * whereas a pattern like `(?:[^\s/]+|...)+` is ambiguously nested and open to
 * catastrophic backtracking. The point is to reject answers that are not a URI at all —
 * the driver still validates the rest. The original pattern was unanchored, so anything
 * merely containing a URI passed ('garbage mongodb://host', 'mongodb://host; rm -rf /').
 */
export const isValidConnectionString = function (value) {
  const uri = String(value ?? '').trim();
  const scheme = MONGO_URI_SCHEMES.find((candidate) => uri.startsWith(candidate));

  if (!scheme) {
    return false;
  }

  const rest = uri.slice(scheme.length);

  return rest.length > 0 && !/\s/.test(rest);
};

const QUERY = 'MongoDB connection string (mongodb:// or mongodb+srv://): ';

/**
 * Ask the user for a MongoDB connection string on the terminal.
 *
 * Only ever called when stdin is a TTY: in a container, under systemd or in CI there is
 * nobody to answer, so the caller must fail with a readable error instead of blocking.
 *
 * Iterating the interface rather than awaiting rl.question() matters: question() never
 * settles once the stream ends, which surfaced as 'Detected unsettled top-level await'
 * and a silent exit 13 instead of a diagnostic.
 *
 * @param {object} [io] streams to read from and write to, injectable for tests
 * @returns {Promise<string>} the validated connection string
 * @throws {Error} if the input ends or no valid URI is given
 */
export const promptForConnectionString = async function ({
  input = process.stdin,
  output = process.stdout,
  attempts = 3,
} = {}) {
  const rl = readline.createInterface({ input, output });

  try {
    let used = 0;
    output.write(QUERY);

    for await (const line of rl) {
      const answer = line.trim();

      if (isValidConnectionString(answer)) {
        return answer;
      }

      used += 1;
      if (used >= attempts) {
        throw new Error(`No valid MongoDB connection string provided after ${attempts} attempts.`);
      }

      output.write(`Not a valid MongoDB URI. ${attempts - used} attempt(s) left.\n`);
      output.write(QUERY);
    }

    throw new Error('Input stream closed before a connection string was provided.');
  } finally {
    rl.close();
  }
};
