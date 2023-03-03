/*
 * chat page.
 */

// Module requirements

exports.init = function (main, fun, path) {
  exports.main = main;
  return this;
}


exports.geted = function (req, res) {
  this.nx.log(`get ${req.originalUrl} from ${req.ip.toString()}`);
  const a = req.app;
  const r = a.main;
  res.sendFile(`${r.viewsDir}/chat.html`);
}

exports.posted = function (req, res) {
  this.nx.log(`post ${req.originalUrl} from ${req.ip.toString()}`);

  return res.redirect('http://' + req.headers['host'] + '/');
}
