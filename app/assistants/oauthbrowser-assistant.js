function OauthbrowserAssistant(URL, force_user) {
  this.storyURL = URL;
  // Custom url stuff, forces the right user
  if (force_user) {
    this.storyURL += '&force_login=' + force_user;//'&x_auth_username=' + force_user + 
  }
  Mojo.Log.info('URL is', this.storyURL);
}

OauthbrowserAssistant.prototype.setup = function() {
  this.controller.setupWidget("browser", {url: this.storyURL}, this.storyViewModel = {});
  this.browser = this.controller.get('browser');
  this.controller.listen(this.browser, Mojo.Event.webViewTitleUrlChanged, this.titleChanged.bind(this));
  this.controller.listen(this.browser, Mojo.Event.webViewLoadProgress, this.hideLoader.bind(this, 'load started'));
  this.resourcesLoaded = 0; //Used for deciding whether to hide the spinner or not
  this.loader = this.controller.get('divBigLoader');
}

OauthbrowserAssistant.prototype.titleChanged = function(event) {
  var callbackUrl=event.url;
  Mojo.Log.info('Changed url to.....', event.url);
  var responseVars=callbackUrl.split("?");
  if(responseVars[0]=='http://www.google.com/' || responseVars[0]=='http://www.google.com'){
  	// Correct return url (hacked using google.com as callback url)
  	try {
    	var token = responseVars[1].replace("oauth_token=","");
    	this.controller.stageController.popScenesTo('oauth', responseVars[1]);
    } catch(e) {
      Mojo.Log.info("Couldn't log you in when authorized and redirecting to google.com");
      Mojo.Log.error(e);
      Mojo.Controller.getAppController().showBanner("That didn't work, close TweetMe & try again", '', '');
    }
  }
}

OauthbrowserAssistant.prototype.hideLoader = function (what, event, progress){
  this.resourcesLoaded += 1;
  if (this.resourcesLoaded >= 2 && !this.loader.hasClassName('pop')) {
    this.loader.addClassName('pop');
  }
}

OauthbrowserAssistant.prototype.handleCommand = function (event){
  // Blocks the backswipe so they can't mess up login!
  if (event.type == "mojo-back") {
    event.preventDefault();
    event.stopPropagation();
    Mojo.Controller.getAppController().getStageController('TweetMe').minimize();
  }
}

OauthbrowserAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	 this.controller.get('divBigLoader').addClassName('show');
}


OauthbrowserAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

OauthbrowserAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as
	   a result of being popped off the scene stack */
    //Mojo.Event.stopListening(this.controller.get('browser'), Mojo.Event.webViewTitleUrlChanged, this.titleChanged.bind(this));
}