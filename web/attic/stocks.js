const stringify = require('json-stringify-safe');
const yahooFinance = require('yahoo-finance');


function getQuote(symbol, cb) {
  yahooFinance.quote(symbol, function(err, results) {
    cb(err, [{symbol: symbol, results}]);
  });
}

getQuote('AAPL', function(err, results) {
  console.log(stringify(results[0]));
});
