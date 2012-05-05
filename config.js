module.exports = {
  mongodb: {
    server: 'localhost',
    port: 27017,
    //username and password must be for admin account
    //leave it empty if no admin account
    username: '',
    password: '',
    autoReconnect: true,
    //poolSize: size of connection pool
    poolSize: 4,
    //whitelist: hide all databases except the ones in this list  (empty list for no whitelist)
    whitelist: [],
    //blacklist: hide databases listed in the blacklist (empty list for no blacklist)
    blacklist: []
  },
  site: {
    //baseUrl: the URL that mongo express will be located at
    //Remember to add the trailing forward slash at the end!
    baseUrl: 'http://localhost:8081/',
    port: 8081
  },
  options: {
    //editorTheme: Name of the theme you want to use for displaying documents
    //See http://codemirror.net/demo/theme.html for all examples
    editorTheme: "rubyblue",

    //The options below aren't being used yet

    //cmdType: the type of command line you want mongo express to run
    //values: eval, subprocess
    //  eval - uses db.eval. commands block, so only use this if you have to
    //  subprocess - spawns a mongo command line as a subprocess and pipes output to mongo express
    cmdType: 'eval',
    //subprocessTimeout: number of seconds of non-interaction before a subprocess is shut down
    subprocessTimeout: 300
  }
};
