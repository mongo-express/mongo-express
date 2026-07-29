import readline from 'node:readline/promises';

// Anchored, and the host part rejects whitespace: the original pattern was unanchored, so
// anything merely containing a URI passed ('garbage mongodb://host', 'mongodb://host; rm -rf /').
const URI_SCHEME = String.raw`mongodb(\+srv)?://`;
const URI_CREDENTIALS = String.raw`(?:[^\s/:]+:(?:[^\s@]+)?@)?`;
const URI_HOSTS = String.raw`(?:[^\s/]+|/\S+\.sock,?)+`;
const URI_PATH = String.raw`(?:/([^ "*./:<>?|]*))?`;
const URI_OPTIONS = String.raw`(?:\?(?:\S+=\S*&?)+)?`;

export const MONGO_URI_PATTERN = new RegExp(
  `^${URI_SCHEME}${URI_CREDENTIALS}${URI_HOSTS}${URI_PATH}${URI_OPTIONS}$`,
);

export const isValidConnectionString = (value) => MONGO_URI_PATTERN.test(String(value ?? '').trim());

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
