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
    poolSize: 4
  },
  site: {
    //baseUrl: the URL that mongo express will be located at
    baseUrl: 'http://localhost:3000/',
    port: 3000
  },
  options: {
    //cmdType: the type of command line you want mongo express to run
    //values: eval, subprocess
    //  eval - uses db.eval. commands block, so only use this if you have to
    //  subprocess - spawns a mongo command line as a subprocess and pipes output to mongo express
    cmdType: 'eval',
    //subprocessTimeout: number of seconds of non-interaction before a subprocess is shut down
    subprocessTimeout: 300
  }
};
