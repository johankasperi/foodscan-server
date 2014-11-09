/**
 * Module for searching data from dabas
 * Input: key and callback
 */

var http = require('http')
	  fs = require('fs')

var apiOpt = {};

/**
 * Module export
 */
module.exports = function(key, callback) {
  fs.readFile('secret/keys.json', function(err, data) {
    apiOpt = JSON.parse(data);
    dabasSearch(key, callback);
  });
}

/**
 * Data from several APIs
 */

httpReq = function(opt, callback) {
  var req = http.request(opt, callback);
  req.on('error', function(e) {
    return callback(e);
  });
  req.end();   
}

dabasSearch = function(key, callback) {
  apiOpt.dabas.path = '/DABASService/V1/articles/searchparameter/'+encodeURIComponent(key)+'/json?apikey='+apiOpt.dabas.apiKey;
  httpReq(apiOpt.dabas, function(res) {
  	res.setEncoding('utf-8');
  	var result = '';
  	res.on('data', function(data) {
  		result += data;
  	});
  	res.on('end', function() {
  		var dabas = JSON.parse(result);
  		if(dabas.length === 0)
  			return callback('error', null);
  		return callback(null, dabas);
  	})
  });
}