var http = require('http')
var url = require('url')

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

httpReq = function(opt, article, property, callback, nextfunc) {
  var req = http.request(opt, function(res) {
    res.setEncoding('utf8');
    if(res.statusCode != 200)
      return callback(null, article);    
    
    var result = '';
    res.on('data', function(data) { 
      result += data;
    });
    res.on('end', function() {
      article[property] = JSON.parse(result);
      if(nextfunc == null)
        return callback(null, article);
      nextfunc(article, callback);
    })
  });
  req.on('error', function(e) {
    return callback(e);
  });
  req.end();   
}

/*dabasSearch = function(key, callback) {
  dabasOpt.path = '/DABASService/V1/articles/searchparameter/'+key+'/json?apikey='+dabasOpt.apiKey;
  console.log(dabasOpt.path);
  httpReq(dabasOpt, {}, "dabas", callback, dabasGtin)
}*/

dabasGtin = function (gtin, callback) {
  dabasOpt.path = '/DABASService/V1/article/gtin/'+gtin+'/json?apikey='+dabasOpt.apiKey;
  httpReq(dabasOpt, {}, "dabas", callback, lcafdSearch)
}

lcafdSearch = function (article, callback) {
  lcafdOpt.path = "/web/api/ingredients?search="+article.dabas.Artikelbenamning+"&limit=1";
  httpReq(lcafdOpt, article, "LCAFDdata", callback, calculateCarbon) 
}

calculateCarbon = function (article, callback) {
  lcafdOpt.path = "/web/api/func/calculate?ingredient="+article.LCAFDdata.ingredients[0].id+"&amount="+article.Bruttovikt+"&unit=gram";
  httpReq(lcafdOpt, article, "LCAFDcarbon", callback, null) 
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
  /*var search = parsedUrl.query.search;
  if(search != null) 
    dabasSearch(search, function(err, result) {
      if(err)
         returnResult(res, null);
      returnResult(res, result);
    });*/
  if (/^\/api\/get/.test(req.url)) {
    var gtin = parsedUrl.query.gtin;
    if(gtin != null)
      dabasGtin(gtin, function(err, result) {
        if(err)
          returnResult(res, null);
        returnResult(res, result);
      });
    else {
      returnResult(res, null);
    }
  }
  else {
    returnResult(res, null)
  }
})
server.listen(Number(3333))