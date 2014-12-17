/**
 * Module for getting data from lcafdb and dabas
 * Input: gtin and callback
 */

var http = require('http')    
    _ = require('underscore');

var apiOpt = {
  "lcafdb": {
    "hostname": "lcafdb.foodprint.nu",
    "port": "80",
    "method": "GET",
    "path": ""
  }
}

/**
 * Module export
 */
module.exports = function(articles, gtin, lcafdb, callback) {
  dabasGtin(articles, gtin, lcafdb, callback);
}

/**
 * Data from several APIs
 */

/**
 * Make waterfall http request calls
 */
httpReq = function(opt, callback) {
  var req = http.request(opt, callback);
  req.on('error', function(e) {
    return callback(e);
  });
  req.end();   
}

dabasGtin = function (articles, gtin, lcafdb, callback) {
  var article = _.find(articles, function(obj) {
    return obj.dabas.GTIN === gtin;
  });

  if(!article)
    return callback("error", null);

  if(lcafdb === false) {
    return callback(null, article);  
  }

  // Determine what to look for in lcafdb
  var searchProductgroup = false;
  var searchIngredients = true;
  if(article.productgroup !== undefined) {
    if(article.productgroup.vendingGroup !== undefined) {
      var searchProductgroup = true;
    }
  }
  if(article.dabas.ingredientsRaw.length > 0) {
    var searchIngredients = true;
  }

  lcafdSearchIngredient(article, callback, article.dabas.name, searchProductgroup, searchIngredients);
}

lcafdSearchIngredient = function (article, callback, key, searchProductgroup, searchIngredients) {
  apiOpt.lcafdb.path = "/api/ingredients?search="+encodeURIComponent(key)+"&limit=1";
  httpReq(apiOpt.lcafdb, function(res) {
    res.setEncoding('utf8');
    if(res.statusCode !== 200) {
      if(article.dabas.name === key && searchProductgroup == true) {
        return lcafdSearchCategory(article, callback, "vendingUnderGroup", searchProductgroup, searchIngredients);
      }
      if(searchProductgroup == true) {
        if(article.productgroup.vendingUnderGroup.article === key) {
          return lcafdSearchIngredient(article, callback, article.productgroup.vendingGroup.article, searchProductgroup, searchIngredients);
        }
      }
      if(searchIngredients == true) {
        article.dabas["ingredients"] = [];
        return parseIngredients(article, 0, callback);
      }
      return callback(null, article);  
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
  apiOpt.lcafdb.path = "/api/func/calculate?ingredient="+article.lcafd.id+"&amount="+article.dabas.weight+"&unit=gram";
  httpReq(apiOpt.lcafdb, function(res) {
    res.setEncoding('utf8');
    if(res.statusCode != 200)
      return callback(null, article);    
    
    var result = '';
    res.on('data', function(data) { 
      result += data;
    });
    res.on('end', function() {
      article["carbon"] = Math.round(JSON.parse(result).carbon.average/1000);
      return callback(null, article);
    })
  }); 
}

lcafdSearchCategory = function(article, callback, property, searchProductgroup, searchIngredients) {
  var key = article.productgroup[property].article;
  if(key.indexOf(",") != -1)
    key = key.substring(0, key.indexOf(",")-1);

  apiOpt.lcafdb.path = "/api/categories?search="+encodeURIComponent(key)+"&limit=1";
  httpReq(apiOpt.lcafdb, function(res) {
    res.setEncoding('utf8');
    if(res.statusCode !== 200) {
      if(property === "vendingUnderGroup") {
        return lcafdSearchCategory(article, callback, "vendingGroup", searchProductgroup, searchIngredients);
      }
      else if(property === "vendingGroup") {
        return lcafdSearchCategory(article, callback, "majorGroup", searchProductgroup, searchIngredients);
      }
      else if(property === "majorGroup") {
        return lcafdSearchIngredient(article, callback, article.productgroup.vendingUnderGroup.article, searchProductgroup, searchIngredients);
      }
    }

    var result = '';
    res.on('data', function(data) {
      result += data;
    });
    res.on('end', function() {
      var cat = JSON.parse(result);
      article["lcafd"] = cat.categories[0];
      article["carbon"] = Math.round((article.lcafd.carbon.average*article.dabas.weight)/1000);
      return callback(null, article);
    });
  })
}

parseIngredients = function(article, i, callback) {
  if(i === article.dabas.ingredientsRaw.length)
    return callback(null, article)

  var name = article.dabas.ingredientsRaw[i].Beskrivning;
  var ingredient = {name: name};
  article.dabas.ingredients.push(ingredient);
  apiOpt.lcafdb.path = "/api/ingredients?search="+encodeURIComponent(name)+"&limit=1";
  httpReq(apiOpt.lcafdb, function(res) {
    res.setEncoding('utf8');
    if(res.statusCode != 200) {
      return parseIngredients(article, i+1, callback);
    }
    var result = '';
    res.on('data', function(data) { 
      result += data;
    });
    res.on('end', function() {
      var r = JSON.parse(result);
      var carbon = r.ingredients[0].carbon.average;
      ingredient["carbon"] = carbon;
      parseIngredients(article, i+1, callback);
    })
  }); 
}