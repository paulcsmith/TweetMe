var sc, Mojo, use_palmhost_proxy;

/**
 * opts = {
 *  content_type:'', // optional
 *  field_name:'', //optional, default to 'media;
 *  file_url:'',
 *  url:'', // REQ
 *  platform: {
 * 		sceneAssistant:{} // REQ; the sceneAssistant we're firing the service req from
 *  }
 * 	extra:{...} // extra post fields (text/plain only atm)
 * } 
 * @param Function onSuccess 
 */
TM.helpers.HTTPUploadFile = function(opts, onSuccess, onFailure) {
	
	Mojo.Log.info('in HTTPUploadFile ================!!!!!!!!!!!!!!');
	
	var key, val, postparams = [];
	var file_url   = opts.file_url || null;
	var url        = opts.url      || null;
	var field_name = opts.field_name || 'media';
	var content_type = opts.content_type || 'img';
	
	if (opts.extra) {
		for (key in opts.extra) {
			val = opts.extra[key];
			postparams.push({ 'key' :key, 'data':val, contentType:'text/plain' });
		}
	}
	
	if (opts.platform) {
		var sceneAssistant = opts.platform.sceneAssistant;
	} else {
		Mojo.Log.error('You must pass the opts.platform.sceneAssistant argument to upload on webOS');
		return;
	}
	
	Mojo.Log.info('OPTS =============');
	TM.helpers.debug(opts);
	Mojo.Log.info('OPTS.EXTRA =============');
	TM.helpers.debug(opts.extra);
//	Mojo.Log.info('ONSUCCESS =============');
//	TM.helpers.debug(onSuccess);
//	Mojo.Log.info('ONFAILURE =============');
//	TM.helpers.debug(onFailure);
	Mojo.Log.info('POSTPARAMS =============');
	TM.helpers.debug(postparams);
	Mojo.Log.info('sceneAssistant =============');
	TM.helpers.debug(sceneAssistant);

	
	sceneAssistant.controller.serviceRequest('palm://com.palm.downloadmanager/', {
		method: 'upload', 
		parameters: {
			'url'        : url,
			'contentType': content_type,
			'fileLabel'  : field_name,
			'fileName'   : file_url,
			'postParameters': postparams,
			cookies      : {}, // optional
			customHttpHeaders: [], // optional
			subscribe    : true 
		},
		'onSuccess' : onSuccess,
		'onFailure' : onFailure
	 });
};




/**
 * Constructor
 * 
 * opts = {
 *   api:'',
 *   startEvent:'',
 *   successEvent:'',
 *   failureEvent:'',
 *   eventTarget:DOMElement
 * } 
 */
function SpazFileUploader(opts) {

	if (!opts) {
	 opts = {};
	}
	this.opts = opts;
	
  // Instead use option paramters. Makes more sense. Works like an AJAX request that way. Do this when calling the uplaod methods
	//	this.startEvent   = opts.startEvent   || sc.events.fileUploadStart;
	//	this.successEvent = opts.successEvent || sc.events.fileUploadSuccess;
	//	this.failureEvent = opts.failureEvent || sc.events.fileUploadFailure;
	//	this.eventTarget  = opts.eventTarget  || document;
	
	if (this.opts.api) {
		this.setAPI(this.opts.api);
	}
	
	this.apis = this.getAPIs();

}

/**
 * returns an array of API labels
 * @return array 
 */
SpazFileUploader.prototype.getAPILabels = function() {
	var labels = [];
	for ( var key in this.getAPIs() ) {
		labels.push(key);
	}
	return labels;
};


/**
 * This builds the apis hash and returns it. All API stuff is defined inside here
 */
SpazFileUploader.prototype.getAPIs = function() {

	var thisSFU = this;

	var apis = {
		'pikchur' : {
		    'upload_url' : 'http://api.pikchur.com/simple/upload',
		    'post_url' : 'http://api.pikchur.com/simple/uploadAndPost',
			'api_key_field': 'api_key', // setting this to non-empty means we MUST set an api key
			'processResult': function(event, apiobj) {
				var loader = event.target;
				
				var returnobj = {}

				var parser=new DOMParser();
				var xmldoc = parser.parseFromString(loader.data,"text/xml");

				var rspAttr = xmldoc.getElementsByTagName("rsp")[0].attributes;
				if (rspAttr.getNamedItem("stat").nodeValue === 'ok')
				{
					returnobj['mediaurl'] = jQuery(xmldoc).find('mediaurl').text();
				} 
				else
				{
					returnobj['errAttributes'] = xmldoc.getElementsByTagName("err")[0].attributes;
					returnobj['errMsg'] = errAttributes.getNamedItem("msg").nodeValue;
				}
				TM.helpers.debug(returnobj);
				return returnobj;
			}
		},
		'yfrog' : {
		    'upload_url' : 'http://yfrog.com/api/upload',
		    'post_url' : 'http://yfrog.com/api/uploadAndPost',
			'processResult': function(event, apiobj) {
				var loader = event.target;

				var parser = new DOMParser();
				var xmldoc = parser.parseFromString(loader.data,"text/xml");

				var rspAttr = xmldoc.getElementsByTagName("rsp")[0].attributes;
				if (rspAttr.getNamedItem("stat").nodeValue === 'ok')
				{
					returnobj['mediaurl'] = jQuery(xmldoc).find('mediaurl').text();
				} 
				else
				{
					returnobj['errAttributes'] = xmldoc.getElementsByTagName("err")[0].attributes;
					returnobj['errMsg'] = errAttributes.getNamedItem("msg").nodeValue;
				}
				TM.helpers.debug(returnobj);
				return returnobj;
			}
		},
	  'twitpic' : {
	    'key': 'd72a029acbb772669240b9690632fc02',
			//'upload_url' : 'http://twitpic.com/api/upload',
			'upload_url': 'http://api.twitpic.com/1/upload.json',
		  'post_url'   : 'http://twitpic.com/api/uploadAndPost',
			'processResult': function(event, apiobj) {
				/*var loader = event.responseString;
				var returnobj = {};
				
				Mojo.Log.info('PROCESSING: EVENT');
				TM.helpers.debug(event);

				var parser = new DOMParser();
				if (event.responseString) {
				  var xmldoc = parser.parseFromString(event.responseString, "text/xml");

  				var rspAttr = xmldoc.getElementsByTagName("rsp")[0];// .attributes'
  				if (rspAttr.getAttribute('stat') === 'ok')
  				{
  					returnobj['mediaurl'] = xmldoc.getElementsByTagName('mediaurl')[0].textContent;
  				} 
  				else
  				{
  					returnobj['errAttributes'] = xmldoc.getElementsByTagName("err")[0].textContent;
  					returnobj['errMsg'] = errAttributes.getNamedItem("msg").nodeValue;
  				}
				}
				Mojo.Log.info('Data after processing');
        TM.helpers.debug(returnobj);
        
				return returnobj;
				*/
				//event.upload_url = event.url;
				//delete event.url; //Gets rid of the conflictin url property
				var data;
				if (event.responseString) {
				  //event.responseString.replace(/([^{]*)/, '');
				  Mojo.Log.info('response string', event.responseString);
				  data = event.responseString.evalJSON();
				  var regex = /[^{]*(.*)/;
				  //data = 	regex.exec(event.responseString).evalJSON();
				  Mojo.Log.info('Data when processing result is', data);
				}
				return data;
			}
		},
	  'posterous' : {
			'upload_url' : 'http://posterous.com/api/upload',
		  'post_url'   : 'http://posterous.com/api/uploadAndPost',
			'processResult': function(event, apiobj) {
				var loader = event.target;
				
				Mojo.Log.info('PROCESSING: EVENT');
				Mojo.Log.info(event);

				var parser=new DOMParser();
				var xmldoc = parser.parseFromString(event.data,"text/xml");

				var rspAttr = xmldoc.getElementsByTagName("rsp")[0].attributes;
				if (rspAttr.getNamedItem("stat").nodeValue === 'ok')
				{
					returnobj['mediaurl'] = jQuery(xmldoc).find('mediaurl').text();
				} 
				else
				{
					returnobj['errAttributes'] = xmldoc.getElementsByTagName("err")[0].attributes;
					returnobj['errMsg'] = errAttributes.getNamedItem("msg").nodeValue;
				}
				TM.helpers.debug(returnobj);
				return returnobj;
			}
		},
		'twitgoo' : {
			'upload_url' : 'http://twitgoo.com/api/upload',
			'post_url'   : 'http://twitgoo.com/api/uploadAndPost',
			'processResult': function(event, apiobj) {
				var loader = event.target;

				var parser=new DOMParser();
				var xmldoc = parser.parseFromString(loader.data,"text/xml");

				var rspAttr = xmldoc.getElementsByTagName("rsp")[0].attributes;
				if (rspAttr.getNamedItem("stat").nodeValue === 'ok')
				{
					returnobj['mediaurl'] = jQuery(xmldoc).find('mediaurl').text();
				} 
				else
				{
					returnobj['errAttributes'] = xmldoc.getElementsByTagName("err")[0].attributes;
					returnobj['errMsg'] = errAttributes.getNamedItem("msg").nodeValue;
				}
				TM.helpers.debug(returnobj);
				return returnobj;
			}
		}
		
	};

	return apis;

};

/**
 * Pass the api you want to use as a string
 * @param {string} apilabel 
 */
SpazFileUploader.prototype.setAPI = function(apilabel) {
	this.api = this.apis[apilabel];
};

/**
 * some services require an api key or app identifier. This sets that.
 * @param {string} api_key
 */
SpazFileUploader.prototype.setAPIKey = function(api_key) {
	if (this.api) {
		this.api.api_key = api_key;
	} else {
		Mojo.Log.error('Must set the API before setting API key');
	}
};

/**
 * some services require an api key or app identifier. This sets that.
 * @param {string} api_key
 */
SpazFileUploader.prototype.getAPIKey = function() {
	if (this.api) {
		return this.api.api_key;
	} else {
		Mojo.Log.error('Must set the API before getting API key');
	}
};

/**
 * opts = {
 *   'api':'', // use if not set already
 *   'username':'xxx',
 *   'password':'xxx',
 *   'source':'xxx',
 *   'message':''
 *   
 * } 
 * 
 * This uploads a file located at the given file_url. It uses the
 * sc.helpers.HTTPUploadFile as defined for your given platform.  Events are
 * raised as set in the constructor on start, success and failure.
 * 
 * Note that in the webOS implementation, success events are raised every time
 * progress is reported, NOT just when completion happens. Check for the
 * "completed" boolean property in the response object. This may change in the
 * future.
 * 
 * @param {string} post_url  the url we're uploading the file to
 * @param {string} file_url  the local url of the file we're uploading
 * @param {object} opts  a set of key/val pairs
 */
SpazFileUploader.prototype.uploadFile = function(post_url, file_url, opts) {
  Mojo.Log.info('In upload file');
	var api, api_key;

	var thisSFU = this;

	if (opts.api) {
		api = this.apis.api;
	} else if (this.api) {
		api = this.api;
	} else {
		Mojo.Log.error('Must set the API before uploading');
		return;
	}
	
	var username = opts.username || null;
	var password = opts.password || null;
	var source   = opts.source   || null;
	var message  = opts.message  || null;
	
	/*
		platform opts are for platform-specific options. For now we're using
		this because webOS requires the scene controller to call the service
		request, so we pass a reference to the scene assistant
	*/
	var platformOpts = opts.platform || null;

	var onStart = opts.onStart || null;

  Mojo.Log.info('Twitpic API key', this.api.key);
	var extraParams = {
		"username": username,
		"password": password,
		"source":   source,
		"message":  message,
		key: this.api.key,
		consumer_token: TM.oauthConfig.consumerKey,
		consumer_secret: TM.oauthConfig.consumer_key_secret,
		oauth_token: TM.oauthConfig.token,
		oauth_secret: TM.oauthConfig.tokenSecret
	};
	
	/*
	TM.oauthConfig = {
	  requestTokenUrl:'https://api.twitter.com/oauth/request_token',
	  authorizeUrl:'https://api.twitter.com/oauth/authorize',
	  accessTokenUrl:'https://api.twitter.com/oauth/access_token',
	  consumer_key:'sp2kvMt81CK3KZCMCjgleA',
	  consumerKey:'sp2kvMt81CK3KZCMCjgleA', // for signature creation
	  consumer_key_secret:'umfCM53hosnjFHgtL2Z3AsndPRyeux8Z0FIjb2uSNHk',
	  consumerSecret:'umfCM53hosnjFHgtL2Z3AsndPRyeux8Z0FIjb2uSNHk',
	  oauth_realm: 'http://api.twitter.com/',
	  serviceProvider:
	    { signatureMethod     : "HMAC-SHA1"
	    , requestTokenURL     : "https://api.twitter.com/oauth/request_token"
	    , accessTokenURL      : "https://api.twitter.com/oauth/access_token"
	    , echoURL             : "http://www.google.com"
	    }
	};
	TM.oauthConfig.tokenSecret = TM.prefs.oauthTokenSecret;
	TM.oauthConfig.token = TM.prefs.oauthAccessToken;
	*/
	
	/**
	 * if we have an API key field, then we need the api key 
	 */
	if ( (api.api_key_field) ) {
		extraParams[api.api_key_field] = this.getAPIKey();
	}

	/*
		A callback in case we need to massage the data before upload
	*/
	if (api.onBeforeSend) {
		api.onBeforeSend.call(api, extraParams, api.upload_url, file_url);
	}
	
	/*
		trigger upload start event
	*/
	//sc.helpers.triggerCustomEvent(thisSFU.startEvent, thisSFU.eventTarget);
	this.opts.onStart(this); // Passes the Spaz File Uploader object
	
	// upload the file
	TM.helpers.HTTPUploadFile({
			'extra'   : extraParams,
			'url'     : post_url,
			'file_url': file_url,
			'platform': platformOpts
		},
		function(event) {
			var data = api.processResult.call(thisSFU, event, api);
			TM.helpers.debug(data, 'Data returned from http upload file');
			//sc.helpers.triggerCustomEvent(thisSFU.successEvent, thisSFU.eventTarget, event);
			if (event.completed) {
			  Mojo.Log.info('About to call COMPLETE function');
			  this.opts.onSuccess(event, data);
			  this.opts.onComplete(event, data);
			} else {
			  Mojo.Log.info('About to call SUCCESS function');
			  this.opts.onSuccess(event, data);
			}
		}.bind(this),
		function(event) {
			Mojo.Log.info('UPLOAD FAILURE, PROCESSING');
			var data = api.processResult.call(thisSFU, event, api);
			TM.helpers.debug(data);
			//sc.helpers.triggerCustomEvent(thisSFU.failureEvent, thisSFU.eventTarget, event);
			this.opts.onFailure(event, data);
		}.bind(this)
	);
};



/**
 * a wrapper for uploadFile that uses the post_url from the API definition 
 */
SpazFileUploader.prototype.uploadAndPost = function(file_url, opts) {
	var api;
	
	if (opts.api) {
		api = this.apis.api;
	} else if (this.api) {
		api = this.api;
	} else {
		Mojo.Log.error('Must set the API before uploading');
		return;
	}
	
	this.uploadFile(api.post_url, file_url, opts);
	
};

/**
 * a wrapper for uploadFile that uses the upload_url from the API definition 
 */
SpazFileUploader.prototype.upload = function(file_url, opts) {
	Mojo.Log.info('In upload');
	var api;
	
	if (!opts) {
	  opts = {};
	}
	this.opts = opts;
	var func = function (){ Mojo.Log.info('Default function'); }; // Just an empty function to call in case no onSuccess, onFailure, or onComplete functions are called.
	this.opts.onStart = opts.onStart || func;
	this.opts.onSuccess = opts.onSuccess || func;
	this.opts.onFailure = opts.onFailure || func;
	this.opts.onComplete = opts.onComplete || func;
	
	if (opts.api) {
		api = this.apis.api;
	} else if (this.api) {
		api = this.api;
	} else {
		Mojo.Log.error('Must set the API before uploading');
		return;
	}
	
	this.uploadFile(api.upload_url, file_url, opts);
	
};
