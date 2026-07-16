/* eslint-disable import/prefer-default-export */

import prompt from 'prompt';

export const promptForConnectionString = async function () {
  try {
    prompt.message = 'mongo-express';
    prompt.start();

    const { connectionString } = await prompt.get([
      {
        name: 'connectionString',
        required: true,
        description: 'No MongoDB connection string provided in config. Please enter the URI',
        pattern: /mongodb(\+srv)?:\/\/(?:[^:]+:(?:[^@]+)?@)?(?:[^/]+|\/.+.sock?,?)+(?:\/([^ "*./:<>?|]*))?(?:\?(?:(.+=.+)&?)+)*/,
        message: 'Please enter a valid MongoDB URI (mongodb:// or mongodb+srv://).',
      },
    ]);

    return connectionString;
  } catch (error) {
    console.error('\n[Initialization aborted] Failed to get connection string:', error.message);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  }
};
