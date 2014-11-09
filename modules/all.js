/**
 * Module returning all articles from dabas
 * Input: callback
 */

var fs = require('fs')

module.exports = function(callback) {
  fs.readFile('dabas/all-articles.json', function(err, data) {
  	if(err)
  		return callback('error', null);
    return callback(null, JSON.parse(data));
  });
}