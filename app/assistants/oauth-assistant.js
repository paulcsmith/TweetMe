function OauthAssistant(oauthConfig) {
    this.message=null;
    this.accessor=null;
    this.authHeader=null;
    this.method=null;
    this.requestTokenUrl = 'https://api.twitter.com/oauth/request_token'; //oauthConfig.requestTokenUrl a bug can sometimes occur where incorrect information overwrites the config and sends to the wrong address, so I'm hard coding until I figure out the cause. It may have been fixed now that preferences are stored to the database and not a cookie. Before it would sometimes mess up the sign up and then save an incorrect string for the request token url
    this.authorizeUrl=oauthConfig.authorizeUrl;
    this.accessTokenUrl=oauthConfig.accessTokenUrl;
    this.consumer_key=oauthConfig.consumer_key;
    this.consumer_key_secret=oauthConfig.consumer_key_secret;
    this.url='';
    this.requested_token='';
}
OauthAssistant.prototype.setup = function() {
    this.requestToken();
}

OauthAssistant.prototype.activate = function(event) {
  Mojo.Log.info('Calling activate');
  var paramType=typeof event;
  if (paramType == 'string') {
    result=event.match(/oauth_token=*/g);
  	if (result != null) {
  	    var token = event.replace("oauth_token=","");
  	    this.exchangeToken(token);
  	}
  }
  this.controller.get('divBigLoader').addClassName('show');
}

OauthAssistant.prototype.deactivate = function(event) {
	
}

OauthAssistant.prototype.cleanup = function(event) {

}

OauthAssistant.prototype.handleCommand = function (event){
  // Blocks the backswipe so they can't mess up login!
  if (event.type == "mojo-back") {
    event.preventDefault();
    event.stopPropagation();
    Mojo.Controller.getAppController().getStageController('TweetMe').minimize();
  }
}

OauthAssistant.prototype.signHeader = function (params){
    if(params==undefined)
	    params='';
    if(this.method==undefined)
	    this.method='GET';
    var timestamp=OAuth.timestamp();
    var nonce=OAuth.nonce(11);
    this.accessor = {consumerSecret: this.consumer_key_secret, tokenSecret : this.tokenSecret};
    this.message = {method: this.method, action: this.url, parameters: OAuth.decodeForm(params)};
    this.message.parameters.push(['oauth_consumer_key',this.consumer_key]);
    this.message.parameters.push(['oauth_token',this.token]);
    this.message.parameters.push(['oauth_nonce',nonce]);
    this.message.parameters.push(['oauth_timestamp',timestamp]);
    this.message.parameters.push(['oauth_signature_method','HMAC-SHA1']);
    this.message.parameters.push(['oauth_version','1.0']);
    OAuth.SignatureMethod.sign(this.message, this.accessor);
    this.authHeader=OAuth.getAuthorizationHeader("", this.message.parameters);
    Mojo.Log.info('HEADER!!!!!!!!!', this.authHeader);
    return true;
}
OauthAssistant.prototype.requestToken = function (){
  Mojo.Log.info('Attempting to request token');
    this.url=this.requestTokenUrl;
    this.method='GET';
    this.signHeader();
    Mojo.Log.info('Setting up Ajax request');
    new Ajax.Request(this.url,{
    	method: this.method,
    	encoding: 'UTF-8',
    	requestHeaders:['Authorization', this.authHeader],
    	onComplete:function(response){
    	  Mojo.Log.info('Ajax request completed');
    	    var response_text = response.responseText;
    	    var responseVars = response_text.split("&");
    	    var auth_url = this.authorizeUrl+"?"+responseVars[0];
    	    var oauth_token = responseVars[0].replace("oauth_token=","");
    	    var oauth_token_secret = responseVars[1].replace("oauth_token_secret=","");
    	    this.requested_token = oauth_token;
    	    this.token = this.requested_token;
    	    this.tokenSecret = oauth_token_secret;
    	    this.controller.stageController.pushScene({name: 'oauthbrowser', transition: Mojo.Transition.crossFade}, auth_url, TM.prefs.username);
    	}.bind(this)
    });
}

OauthAssistant.prototype.exchangeToken = function (token){
    this.url=this.accessTokenUrl;
    this.method='POST';
    this.signHeader("oauth_verifier="+token);
    new Ajax.Request(this.url,{
    	method: this.method,
    	encoding: 'UTF-8',
    	evalJSON: "force",
    	requestHeaders:['Authorization', this.authHeader],
    	onComplete:function(response){
    	  if (response.status === 200) {
    	    // Here, you should do something with the response content
    	    Mojo.Log.info('Response is!!!', response.responseText);
    	    var params = response.responseText.toQueryParams();
    	    TM.helpers.debug(params, 'Parameters returned!!!!!!!!!!!!!!!!!');
    	    var successFunction = function (transport){
    	      if (transport) {
    	        TM.prefs.userInfo = transport.responseJSON;
    	        Mojo.Log.info('about to add a new user');
    	        Account.addAccount(transport.responseJSON, TM.prefs.oauthTokenSecret, TM.prefs.oauthAccessToken);
    	      }
    	      TM.prefStorage.storePrefs(function (){
    	        this.controller.stageController.popScenesTo({name: '', transition: Mojo.Transition.crossFade});
    	        this.controller.stageController.pushScene({name: 'home', transition: Mojo.Transition.crossFade});
    	      }.bind(this));
    	    }.bind(this);
    	    var failedFunction = function (){
    	      Mojo.Controller.getAppController().showBanner("Couldn't log in. Close and try again", '', '');
    	    }
    	    if (params && !Object.isString(params) && params.oauth_token) {
    	      Mojo.Log.info('****attempting to add the user');
    	      
    	      TM.prefs.oauthTokenSecret = params.oauth_token_secret;
    	      TM.prefs.oauthAccessToken = params.oauth_token;
    	      TM.prefs.username = params.screen_name;
    	      
    	      TM.prefStorage.storePrefs(this.pushHomeScene.bind(this, successFunction, failedFunction, params));
    	    } else {
    	      Mojo.Controller.getAppController().showBanner({messageText: 'Scroll down & sign in as @' + TM.prefs.username, icon: 'x-mini-icon.png'}, '', '');
    	      this.controller.stageController.popScenesTo({name: '', transition: Mojo.Transition.crossFade});
    	      this.controller.stageController.swapScene({name: 'oauth', transition: Mojo.Transition.crossFade}, TM.oauthConfig);
    	    }
    	  } else {
    	    Mojo.Controller.getAppController().showBanner('Twitter was down, try once more', '', '');
    	    Mojo.Log.error('Bad response text', params.responseText);
    	    Mojo.Log.error('HTTP status code is:', response.status);
    	    this.controller.stageController.popScenesTo({name: '', transition: Mojo.Transition.crossFade});
    	    this.controller.stageController.swapScene({name: 'oauth', transition: Mojo.Transition.crossFade}, TM.oauthConfig);
    	  }
    	}.bind(this)
    });
}

OauthAssistant.prototype.pushHomeScene = function (successFunction, failedFunction, params){
  //TM.prefStorage.initialize(); // Sets the token to the oauth object. I don't this this is needed anymore
  if (TM.prefs.userInfo) {
    successFunction();
  } else {
    // Get the user info, then push the scene
    Twitter.loadUserByScreenName(params.screen_name, {onSuccess: successFunction, onFail: {status: 401, functionToCall: failedFunction}});
  }
}

