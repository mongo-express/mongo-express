import prompt from 'prompt';

export const promptForConnectionString = async function () {
  prompt.message = 'Prompt';

  const { connectionString } = await prompt.get([
    {
      name: 'connectionString',
      required: true,
      description:
        'No mongo connection string provided, please, enter the string',
      pattern:
        /mongodb:\/\/(?:[^:]+:(?:[^@]+)?@)?(?:[^/]+|\/.+.sock?,?)+(?:\/([^ "*./:<>?|]*))?(?:\?(?:(.+=.+)&?)+)*/,
      message:
        'Please, enter a valid string. Check docs for more info https://www.mongodb.com/docs/manual/reference/connection-string/',
    },
  ]);

  return connectionString;
};

export default prompt;
