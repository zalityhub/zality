const https = require('https');
const express = require("express");
const bodyParser = require("body-parser");

// Set up the server
const app = express();
app.use(bodyParser.json());

// https://query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=earningsHistory
app.get("/v10/*", function (req, res) {
  const url = `https://query1.finance.yahoo.com${req.originalUrl}`;

  console.log(url);
  const request = https.request(url, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data = data + chunk.toString();
    });

    response.on('end', () => {
      res.end(data);
    });
  })

  request.on('error', (error) => {
    console.log('An error', error);
  });

  request.end()
});

// Start the server
const port = 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
