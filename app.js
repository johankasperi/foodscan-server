var http = require('http')
    url = require('url')
    fs = require('fs')
    _ = require('underscore')

/**
 * Data from several APIs
 */

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

// Make waterfall http request calls
httpReq = function(opt, callback) {
  var req = http.request(opt, callback);
  req.on('error', function(e) {
    return callback(e);
  });
  req.end();   
}

dabasGtin = function (gtin, callback) {
  var dabasProductgroups = JSON.parse(fs.readFileSync('dabas/dabas.json', 'utf8'));
  var article = {};
  dabasOpt.path = '/DABASService/V1/article/gtin/'+gtin+'/json?apikey='+dabasOpt.apiKey;
  httpReq(dabasOpt, function(res) {
    res.setEncoding('utf8');    
    
    var result = '';
    res.on('data', function(data) { 
      result += data;
    });
    res.on('end', function() {
      var dabas = JSON.parse(result);
      if(dabas.Artikelbenamning === null)
        return callback("error", null);

      article["dabas"] = {
        GTIN: ('GTIN' in dabas) ? dabas.GTIN : null,
        name: ('Artikelbenamning' in dabas) ? dabas.Artikelbenamning : null,
        producer: ('VarumarkeTillverkare' in dabas) ? dabas.VarumarkeTillverkare : null,
        country: ('Ursprungsland' in dabas) ? dabas.Ursprungsland : null,
        weight: ('Bruttovikt' in dabas) ? dabas.Bruttovikt : null,
        productcode: ('Produktkod' in dabas) ? dabas.Produktkod : null,
        images: ('Bilder' in dabas) ? dabas.Bilder: null,
        labels: ('Markningar' in dabas) ? dabas.Markningar : null,
        ingredientsRaw: ('Ingredienser' in dabas) ? dabas.Ingredienser : null,
      };
      findProductgroup(article, dabasProductgroups.articles, 1, {}, callback);
    })
  });
}

findProductgroup = function(article, list, level, returnObj, callback) {
  var articleno = article.dabas.productcode;
  if(level === 1) {
    var nr = parseInt(articleno[0]);
    var property = "vendingArea";
  }
  else if(level === 2) {
    var nr = parseInt(articleno.substring(1,4));
    var property = "majorGroup";
  }
  else if(level === 3) {
    var nr = parseInt(articleno.substring(4,8));
    var property = "vendingGroup";
  }
  else if(level === 4) {
    var nr = parseInt(articleno.substring(8,articleno.length));
    var property = "vendingUnderGroup";
  }
  var group = _.findWhere(list, {no: nr});
  if(!group) {
    for (var property in returnObj) {
        if (returnObj.hasOwnProperty(property)) {
            delete returnObj[property].childs;
        }
    }
    article["productgroup"] = returnObj;
    return lcafdSearchIngredient(article, callback, article.dabas.name);
  }
  returnObj[property] = group;
  if(!group.childs) {
    for (var property in returnObj) {
        if (returnObj.hasOwnProperty(property)) {
            delete returnObj[property].childs;
        }
    }
    article["productgroup"] = returnObj;
    return lcafdSearchIngredient(article, callback, article.dabas.name);
  }
  findProductgroup(article, group.childs, level+1, returnObj, callback);
}

lcafdSearchIngredient = function (article, callback, key) { 
  lcafdOpt.path = "/web/api/ingredients?search="+encodeURIComponent(key)+"&limit=1";
  httpReq(lcafdOpt, function(res) {
    res.setEncoding('utf8');
    if(res.statusCode != 200) {
      if(article.dabas.name === key) {
        return lcafdSearchIngredient(article, callback, article.productgroup.vendingGroup.article);
      }
      else if(article.productgroup.vendingGroup.article === key) {
        return lcafdSearchIngredient(article, callback, article.productgroup.vendingUnderGroup.article);
      }
      else {
        return lcafdSearchCategory(article, callback, "vendingUnderGroup"); 
      }   
    }
    var result = '';
    res.on('data', function(data) { 
      result += data;
    });
    res.on('end', function() {
      var lcafd = JSON.parse(result);
      article["lcafd"] = lcafd.ingredients[0];
      calculateCarbon(article, callback);
    })
  }); 
}

calculateCarbon = function (article, callback) {
  lcafdOpt.path = "/web/api/func/calculate?ingredient="+article.lcafd.id+"&amount="+article.dabas.weight+"&unit=gram";
  httpReq(lcafdOpt, function(res) {
    res.setEncoding('utf8');
    if(res.statusCode != 200)
      return callback(null, article);    
    
    var result = '';
    res.on('data', function(data) { 
      result += data;
    });
    res.on('end', function() {
      article["carbon"] = JSON.parse(result).carbon.average;
      return callback(null, article);
    })
  }); 
}

lcafdSearchCategory = function(article, callback, property) {
  var key = article.productgroup[property].article;
  if(key.indexOf(",") != -1)
    key = key.substring(0, key.indexOf(",")-1);
  lcafdOpt.path = "/web/api/categories?search="+encodeURIComponent(key)+"&limit=1";
  httpReq(lcafdOpt, function(res) {
    res.setEncoding('utf8');
    if(res.statusCode != 200) {
      if(property === "vendingUnderGroup") {
        return lcafdSearchCategory(article, callback, "vendingGroup");
      }
      else if(property === "vendingGroup") {
        return lcafdSearchCategory(article, callback, "majorGroup");
      }
      else {
        return parseIngredients(article, callback);
      }
    }

    var result = '';
    res.on('data', function(data) {
      result += data;
    });
    res.on('end', function() {
      var cat = JSON.parse(result);
      article["lcafd"] = cat.categories[0];
      article["carbon"] = article.lcafd.carbon.average*article.dabas.weight;
      parseIngredients(article, callback);
    });
  })
}

parseIngredients = function(article, callback) {
  if(article.dabas.ingredientsRaw.length === 0)
    return callback(null, article);
  article.dabas["ingredients"] = [];
  for(var i = 0; i < article.dabas.ingredientsRaw.length; i++) {
    var name = article.dabas.ingredientsRaw[i].Beskrivning;
    var ingredient = {name: name};
    article.dabas.ingredients.push(ingredient);
    lcafdGetIngredients(ingredient, function(err, result) {
      if(!err) {
        ingredient["carbon"] = result;
        if(i === article.dabas.ingredientsRaw.length) {
          return callback(null, article);
        }
      }
    });
  };
}

lcafdGetIngredients = function(ingredient, callback) {
  lcafdOpt.path = "/web/api/ingredients?search="+encodeURIComponent(ingredient.name)+"&limit=1";
  httpReq(lcafdOpt, function(res) {
    res.setEncoding('utf8');
    if(res.statusCode != 200) {
      return callback(res.statusCode, null);
    }
    var result = '';
    res.on('data', function(data) { 
      result += data;
    });
    res.on('end', function() {
      var r = JSON.parse(result);
      var carbon = r.ingredients[0].carbon.average;
      return callback(null, carbon);
    })
  });  
};

/**
 * Main callback function
 */
returnResult = function (res, result) {
    if (result) {
      delete result.dabas.ingredientsRaw;
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify(result, null, 4))
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