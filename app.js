var http = require('http')
    url = require('url')
    fs = require('fs')
    gtinModule = require('./modules/gtin.js')
    searchModule = require('./modules/search.js')
    categoryModule = require('./modules/categories.js')
    articleByCatModule = require('./modules/articleByCategory.js')

var articles = JSON.parse(fs.readFileSync('dabas/all-articles.json', 'utf8'));

/**
 * Main callback function
 */
returnResult = function (res, result) {
    if (result) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify(result,null,4))
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
  if (/^\/api\/get\/article/.test(req.url)) {
    var gtin = parsedUrl.query.gtin;
    var search = parsedUrl.query.search;
    var limit = parsedUrl.query.limit;
    var cat1 = parsedUrl.query.cat1;
    var cat2 = parsedUrl.query.cat2;
    var cat3 = parsedUrl.query.cat3;
    if(gtin != null) {
      gtinModule(articles, gtin, true, function(err, result) {
        if(err)
          returnResult(res, null);
        returnResult(res, result);
      });
    }
    else if(search != null) {
      searchModule(articles, search, limit, function(err, result) {
        if(err)
          returnResult(res, null);
        returnResult(res, result);
      });
    }
    else if(cat1 != null) {
      articleByCatModule(articles, cat1, cat2, cat3, limit, function(err, result) {
        if(err)
          returnResult(res, null);
        returnResult(res, result);
      });
    }
    else {
      returnResult(res, articles)
    }
  }
  else if (/^\/api\/get\/category/.test(req.url)) {
    var level = parsedUrl.query.level;
    var cat1 = parsedUrl.query.cat1;
    var cat2 = parsedUrl.query.cat2;
    var cat3 = parsedUrl.query.cat3;
    categoryModule(cat1, cat2, cat3, level, function(err, result) {
      if(err)
        returnResult(res, null);
      returnResult(res, result);
    })
  }
  else {
    returnResult(res, null)
  }
})
server.listen(Number(3333))