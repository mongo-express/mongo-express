globalThis.loadFile = function (id) {
  const st = ME_SETTINGS;
  globalThis.location.assign(`${st.baseHref}db/${st.dbName}/gridFS/${st.bucketName}/${encodeURIComponent(id)}`);
};
