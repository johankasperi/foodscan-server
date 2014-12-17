/**
 * Module for searching data from dabas
 * Input: key and callback
 */

var fs = require('fs')
    //gtinModule = require("./gtin.js")

/**
 * Module export
 */
module.exports = function(articles, key, limit, callback) {
  dabasSearch(articles, key, limit, callback);
}

/**
 * Filter dabas/all-articles.json
 */

dabasSearch = function(articles, key, limit, callback) {
  var key = key.charAt(0).toUpperCase() + key.slice(1);
  var regex = new RegExp('.*' + key + '.*', "i");
  var result = [];
  for(var i = 0; i<articles.length; i++) {
  	var obj = articles[i];
  	if(obj.dabas.name.match(regex)) {
      result.push(obj)
  	}
    if(limit != null && result.length == limit) {
      return callback(null, result);
    }
  }
  if(result.length < 1)
    return callback("error", null);

  callback(null, result);
}
