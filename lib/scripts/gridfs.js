window.loadFile = function (id) {
  const st = ME_SETTINGS;
  location.href = `${st.baseHref}db/${st.dbName}/gridFS/${st.bucketName}/${encodeURIComponent(id)}`;
};
