var http = require('http')
var url = require('url')
var bl = require('bl')

var dabasOpt = {
  hostname: 'api.dabas.com',
  port: '80',
  method: 'GET',
  path: '',
  apiKey: '40a55e82-e7a1-4839-8bbe-20bf8f932215'
}

var lcafdOpt = {
  hostname: 'crowd.kasperi.se',
  port: '80',
  method: 'GET',
  path: '',
}

dabasSearch = function(key, callback) {
  dabasOpt.path = '/DABASService/V1/articles/searchparameter/'+key+'/json?apikey='+dabasOpt.apiKey;
  var req = http.request(dabasOpt, function(res) {
    res.setEncoding('utf8');
    res.pipe(bl(function(err, data) {
      if(err)
        return callback(err);
      dabasGtin(data[0].gtin, callback);
    }));
  });
  req.on('error', function(e) {
    return callback(e);
  });
  req.end();
}

dabasGtin = function (gtin, callback) {
  dabasOpt.path = '/DABASService/V1/article/gtin/'+gtin+'/json?apikey='+dabasOpt.apiKey;
  var req = http.request(dabasOpt, function(res) {
    res.setEncoding('utf8');
    var result = '';
    res.on('data', function(data) {
      result += data;
    });
    res.on('end', function() {
      result = JSON.parse(result);
      var article = { Artikelbenamning: result.Artikelbenamning }
      lcafdSearch(article, callback);
    })
  });
  req.on('error', function(e) {
    return callback(e);
  });
  req.end(); 
}

lcafdSearch = function (article, callback) {
  console.log(article);
  lcafdOpt.path = "/web/api/ingredients?search="+article.Artikelbenamning+"&limit=1";
  console.log(lcafdOpt.path);
  var req = http.request(lcafdOpt, function(res) {
    res.setEncoding('utf8');
    var result = '';
    res.on('data', function(data) { 
      result += data;
    });
    res.on('end', function() {
      result = JSON.parse(result);
      console.log(result);
      article["lcafdId"] = result.ingredients[0].id;
      calculateCarbon(article, callback);
    })
  });
  req.on('error', function(e) {
    return callback(e);
  });
  req.end(); 
}

calculateCarbon = function (article, callback) {
  lcafdOpt.path = "/web/api/func/calculate?ingredient="+article.lcafdId+"&amount="+article.Bruttovikt+"&unit=gram";
  console.log(lcafdOpt.path);
  var req = http.request(lcafdOpt, function(res) {
    res.setEncoding('utf8');
    var result = '';
    res.on('data', function(data) { 
      result += data;
    });
    res.on('end', function() {
      result = JSON.parse(result);
      console.log(result);
      article["carbon"] = result.carbon.average;
      console.log(article.carbon);
      callback(null, article);
    })
  });
  req.on('error', function(e) {
    return callback(e);
  });
  req.end(); 
}

returnResult = function (res, result) {
    if (result) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } else {
      res.writeHead(404)
      res.end()
    }
} 

var server = http.createServer(function (req, res) {
  var parsedUrl = url.parse(req.url, true)
  var search = parsedUrl.query.search;
  var gtin = parsedUrl.query.gtin;
  if(search != null) 
    dabasSearch(search, function(err, result) {
      if(err)
         returnResult(res, null);
      returnResult(res, result);
    });
  else if(gtin != null)
    dabasGtin(gtin, function(err, result) {
      if(err)
        returnResult(res, null);
      returnResult(res, result);
    });
  else {
    returnResult(res, null);
  }
  /*if (/^\/api\/food/.test(req.url))
    result = parsetime(time)
  else if (/^\/api\/food/.test(req.url))
    result = unixtime(time)*/
})
server.listen(Number(3333))