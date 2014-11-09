var http = require('http')
    url = require('url')
    gtinModule = require('./modules/gtin.js')
    searchModule = require('./modules/search.js')

/**
 * Main callback function
 */
returnResult = function (res, result) {
    if (result) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify(result))
    } else {
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' })
      res.end()
    }
}

/**
 * Httpserver
 */

var server = http.createServer(function (req, res) {
  var parsedUrl = url.parse(req.url, true);
  if (/^\/api\/get/.test(req.url)) {
    var gtin = parsedUrl.query.gtin;
    var search = parsedUrl.query.search;
    if(gtin != null) {
      gtinModule(gtin, function(err, result) {
        if(err)
          returnResult(res, null);
        returnResult(res, result);
      });
    }
    else if(search != null) {
      searchModule(search, function(err, result) {
        if(err)
          returnResult(res, null);
        returnResult(res, result);
      });
    }
  }
  else {
    returnResult(res, null)
  }
})
server.listen(Number(3333))