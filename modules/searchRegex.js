/**
 * Module for searching data from dabas
 * Input: key and callback
 */

var fs = require('fs')
    //gtinModule = require("./gtin.js")

/**
 * Module export
 */
module.exports = function(key, extended, limit, callback) {
  dabasSearchRegex(key, extended, limit, callback);
}

/**
 * Filter dabas/all-articles.json
 */

dabasSearchRegex = function(key, extended, limit, callback) {
  var articles = JSON.parse(fs.readFileSync('dabas/all-articles.json', 'utf8'));
  var key = key.charAt(0).toUpperCase() + key.slice(1);
  var regex = '^'+key;
  var result = [];
  for(var i = 0; i<articles.length; i++) {
  	var obj = articles[i];
  	if(obj.name.match(regex)) {
      result.push(obj)
  	}
    if(limit != null && result.length == limit) {
      return getDabas(result, extended, callback);
    }
  }
  if(result.length < 1)
    return callback("error", null);

  getDabas(result, extended, callback);
}

getDabas = function(arr, extended, callback) {
  if(!extended)
    return callback(null, arr);
  var result = [];
  for(var i = 0; i<arr.length; i++) {
    var obj = arr[i];
    gtinModule(obj.gtin, false, function(err, data){
      if(!err) {
        result.push(data);
      }
      if(result.length == arr.length) {
        callback(null, result);
      }
    })
  }
}
