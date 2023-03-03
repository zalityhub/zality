/*
 * stocks page.
 */

// Module requirements
const stringify = require('json-stringify-safe');
const fs = require('fs');
const yahooFinance = require('yahoo-finance');


function getQuote(symbol, res, cb) {
  yahooFinance.quote({
    symbol: 'AAPL',
    modules: [ 'price', 'summaryDetail' ] // see the docs for the full list
  }, function (err, quote) {
    cb(err, {symbol: symbol,quote}, res);
  });
}


exports.init = function (main, fun, path) {
  exports.main = main;
  return this;
}

exports.geted = function (req, res) {
  this.nx.log(`get ${req.originalUrl} from ${req.ip.toString()}`);

  //getQuote('APPL', res, function (err, data, res) {
    //const html = stringify(data, null, 4);
    //res.send(html);
  //});

  const content = fs.readFileSync(`./views/stocks.html`, {encoding:'utf8'})
  res.send(content)
}

exports.posted = function (req, res) {
  this.nx.log(`post ${req.originalUrl} from ${req.ip.toString()}`);

  return res.redirect('http://' + req.headers['host'] + '/');
}
