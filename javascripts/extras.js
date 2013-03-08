/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
**/
 
var Base64 = {
 
	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
 
	// public method for encoding
	encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = Base64._utf8_encode(input);
 
		while (i < input.length) {
 
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
 
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
 
			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}
 
			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
 
		}
 
		return output;
	},
 
	// public method for decoding
	decode : function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
		while (i < input.length) {
 
			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));
 
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
 
			output = output + String.fromCharCode(chr1);
 
			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
 
		}
 
		output = Base64._utf8_decode(output);
 
		return output;
 
	},
 
	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	},
 
	// private method for UTF-8 decoding
	_utf8_decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;
 
		while ( i < utftext.length ) {
 
			c = utftext.charCodeAt(i);
 
			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
 
		}
 
		return string;
	}
 
}


// Stuff for shortening URL's

/*
Copyright (c) 2007-2009, Edward Finkler, Funkatron Productions
 
All rights reserved.
 
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
 
        Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.
        
        Redistributions in binary form must reproduce the above
        copyright notice, this list of conditions and the following
        disclaimer in the documentation and/or other materials provided
        with the distribution.
        
        Neither the name of Edward Finkler, Funkatron Productions nor
        the names of its contributors may be used to endorse or promote
        products derived from this software without specific prior written
        permission.
 
 
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
 
/**
  * Constants to refer to services 
*/
var SPAZCORE_SHORTURL_SERVICE_SHORTIE = 'short.ie';
var SPAZCORE_SHORTURL_SERVICE_ISGD	= 'is.gd';
var SPAZCORE_SHORTURL_SERVICE_BITLY	= 'bit.ly';


/**
 * Constructor
 * @param {string} service	the name of a service. Preferrably one of the SPAZCORE_SHORTURL_SERVICE_* constants
 */
function SpazShortURL(service) {
	
	this.api = this.getAPIObj(service);
	
}


SpazShortURL.prototype.getAPIObj = function(service) {
	
	var apis = {}
	
	apis[SPAZCORE_SHORTURL_SERVICE_BITLY] = {
		'url'	  : 'http://bit.ly/api',
		'getData' : function(longurl, opts){
			
			/*
				use the api if we're doing multiple URLs
			*/
			if (Object.isArray(longurl)) {
				apis[SPAZCORE_SHORTURL_SERVICE_BITLY].processing_multiple = true;
				apis[SPAZCORE_SHORTURL_SERVICE_BITLY].url = 'http://api.bit.ly/shorten';
				opts.longUrl = longurl;
				
				return opts;
			} else {
				apis[SPAZCORE_SHORTURL_SERVICE_BITLY].processing_multiple = false;
				return { 'url':longurl };				
			}
		},
		'processResult' : function(data) {
			if (apis[SPAZCORE_SHORTURL_SERVICE_BITLY].processing_multiple === true) {
				var result = data; //sc.helpers.deJSON(data) not needed. I forced JSON eval in the Prototype AJAX options
				var rs = {}
				for (var i in result.results) {
					rs[i] = result.results[i].shortUrl;
				}
				return rs;
			} else {
				return data;
			}
		}
		
	};
		
	apis[SPAZCORE_SHORTURL_SERVICE_SHORTIE] = {
		'url'	  : 'http://short.ie/api?',
		'getData' : function(longurl, opts){
			
			if (longurl.match(/ /gi)) {
				var longurl = longurl.replace(/ /gi, '%20');
			}
			
			var shortie = {
				orig: longurl,
				url:  longurl,
				email:	 '',
				private: 'false',
				format:	 'rest'
			};
			return shortie;
		}
	};
		
	apis[SPAZCORE_SHORTURL_SERVICE_ISGD] = {
		'url'	  : 'http://is.gd/api.php',
		'getData' : function(longurl, opts) {
			return { 'longurl':longurl };
		}
	};
	
	return apis[service];
}


/**
 * shortens a URL by making an ajax call
 * @param {string} longurl
 * @param {object} opts   right now opts.event_target (a DOMelement) and opts.apiopts (passed to api's getData() call) are supported
 */
SpazShortURL.prototype.shorten = function(longurl, opts) {
	Mojo.Log.info('Attempting to send AJAX request to shorten urls');
	var shortener = this;
	
	if (!opts) { opts = {} };

	/*
		set defaults if needed
	*/
	opts.apiopts	  = opts.apiopts	  || null;
	
	/*
		we call getData now in case it needs to override anything
	*/
	var apidata = this.api.getData(longurl, opts.apiopts);
    
    // Probably unneeded.
	if (TM.helpers.getMojoURL) {
		this.api.url = TM.helpers.getMojoURL(this.api.url);
	}
		
    var xhr = new Ajax.Request(this.api.url, 
    {
        method: 'POST',
        postBody: null,
        parameters: apidata,
        evalJSON: 'force',
        onSuccess: shortener.successfulRequest.curry(opts.onSuccess, shortener, longurl),
        onFailure: function(xhr) {
        	Mojo.Log.error(shortener.api.url + ' error:')
        	
        	var errobj = {'url':shortener.api.url, 'xhr':null, 'msg':null}
        	
        	if (xhr) {
        		errobj.xhr = xhr;
        		Mojo.Log.error("Error:"+xhr.status+" from "+ shortener.api.url);
        	} else {
        		Mojo.Log.error("Error:Unknown from "+ shortener.api.url);
        		errobj.msg = 'Unknown Error';
        	}
        	if (opts.onFail) {
        	    opts.onFail();
        	}
        }
    });

};

// Handles processing the response from the URL shortener. Processes the response and calls the onSuccess function if specified
SpazShortURL.prototype.successfulRequest = function (onSuccess, shortener, longurl, transport){
    Mojo.Log.info('Spaz short URL request was successful');
    Mojo.Log.info('Response is', transport.responseJSON);
    if (!transport.responseJSON) {
        Mojo.Controller.getAppController().showBanner('No internet connection', '', '');
    }
    else {
        if (onSuccess) {
            var return_data = {};
            if (shortener.api.processResult) {
            	return_data = shortener.api.processResult(transport.responseJSON);
            } else {
            	return_data = {
            		'shorturl':transport.responseJSON,
            		'longurl' :longurl
            	}
            }
            //Mojo.Log.logProperties(return_data);
            var successFunction = onSuccess.curry(return_data); //Leaves OG argument intact, and adds the AJAX transport to the end.
            successFunction();
        } else {
            Mojo.Controller.getAppController().showBanner('Success!', '', '');
        }
    }
}

SpazShortURL.prototype._onShortenResponseSuccess = function(data, target) {
	sc.helpers.triggerCustomEvent(sc.events.newShortURLSuccess, target, data);
};
SpazShortURL.prototype._onShortenResponseFailure = function(errobj, target) {
	sc.helpers.triggerCustomEvent(sc.events.newShortURLFailure, target, errobj);
};

/**
 * @TODO 
 */
SpazShortURL.prototype.expand = function(shorturl, opts) {
	
	var shortener = this;
	
	var xhr = jQuery.ajax({
		complete:function(xhr, rstr) {
		},
		'error':function(xhr, msg, exc) {
			sc.helpers.dump(this.url + ' error:'+msg)
			
			var errobj = {'url':this.url, 'xhr':null, 'msg':null}
			
			if (xhr) {
				errobj.xhr = xhr;
				sc.helpers.dump("Error:"+xhr.status+" from "+ this.url);
			} else {
				sc.helpers.dump("Error:Unknown from "+ this.url);
				errobj.msg = 'Unknown Error';
			}
			shortener._onExpandResponseFailure(errobj, opts.event_target);
		},
		success:function(data) {
			// var shorturl = trim(data);
			data = sc.helpers.deJSON(data);
			var longurl = data[shorturl];
			shortener._onExpandResponseSuccess({
					'shorturl':shorturl,
					'longurl' :longurl
				},
				opts.event_target
			);
		},
		beforeSend:function(xhr) {},
		type:"GET",
		url :'http://longurlplease.appspot.com/api/v1.1',
		data:{ 'q':shorturl }
	});
};

/**
 * @TODO 
 */
SpazShortURL.prototype._onExpandResponseSuccess = function(data, target) {
	sc.helpers.triggerCustomEvent(sc.events.newExpandURLSuccess, target, data);
};

/**
 * @TODO 
 */
SpazShortURL.prototype._onExpandResponseFailure = function(errobj, target) {
	sc.helpers.triggerCustomEvent(sc.events.newExpandURLFailure, target, errobj);
};

/**
 * given as string and a mapping object, replace multiple values in the string (or vice versa)
 * map should be of format
 * {
 * 	'searchforme':'replacewithme',
 * 	'searchforme2':'replacewithme2',
 * 	'searchforme3':'replacewithme3'
 * }
 * @param {string} str
 * @param {object} map
 * @return {string}
 */
TM.helpers.replaceMultiple = function(str, map) {
  Mojo.Log.info('Map object for replacing is', Object.inspect($H(map)));
	for (var key in map) {
		str = str.replace(key, map[key]);
	}
	return str;
};


function capitaliseFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}


