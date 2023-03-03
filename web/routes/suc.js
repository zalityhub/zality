/*
 * suc page.
 */

// Module requirements

exports.init = function (main, fun, path) {
  exports.main = main;
  return this;
}


exports.geted = function (req, res) {
  this.nx.log(`get ${req.originalUrl} from ${req.ip.toString()}`);

  res.render('suc', {
    'title': 'Site Under Construction',
    'version': exports.main.server.version
  });
}

exports.posted = function (req, res) {
  this.nx.log(`post ${req.originalUrl} from ${req.ip.toString()}`);

  return res.redirect('http://' + req.headers['host'] + '/');
}
