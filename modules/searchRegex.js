/**
 * Module for searching data from dabas
 * Input: key and callback
 */

var fs = require('fs')

/**
 * Module export
 */
module.exports = function(key, limit, callback) {
  dabasSearchRegex(key, limit, callback);
}

/**
 * Filter dabas/all-articles.json
 */

dabasSearchRegex = function(key, limit, callback) {
  var articles = JSON.parse(fs.readFileSync('dabas/all-articles.json', 'utf8'));
  var key = key.charAt(0).toUpperCase() + key.slice(1);
  var regex = '^'+key;
  var result = [];
  for(var i = 0; i<articles.length; i++) {
  	var obj = articles[i];
  	if(obj.name.match(regex)) {
  	  	result.push(obj);
  	}
  	if(limit != null && result.length == limit) {
  	  	return callback(null, result)
    }
  }
  return callback(null, result)
}