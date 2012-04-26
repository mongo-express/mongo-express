module.exports = {
  mongodb: {
    server: 'localhost',
    port: 27017,
    database: 'test'
  },
  site: {
    //base_url: the URL that mongo express will be located at
    base_url: 'http://localhost:3000/'
  },
  options: {
    //cmd_type: the type of command line you want mongo express to run
    //values: eval, subprocess
    //  eval - uses db.eval. commands block, so only use this if you have to
    //  subprocess - spawns a mongo command line as a subprocess and pipes output to mongo express
    cmd_type: 'eval',
    //subprocess_timeout: number of seconds of non-interaction before a subprocess is shut down
    subprocess_timeout: 300
  }
};
