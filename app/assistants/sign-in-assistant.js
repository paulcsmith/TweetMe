function SignInAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

SignInAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	//this.userNameModel = {value: TM.prefs.username};
	this.userNameModel = {value: ''};
	this.userNameAttr = {
		hintText: "Type your username...",
		autoFocus: true,
		autoReplace: false,
		enterSubmits: false,
		textCase: Mojo.Widget.steModeLowerCase};
	this.controller.setupWidget("username", this.userNameAttr, this.userNameModel);
	this.passwordAttr = {
		hintText: "Password...",
		autoReplace: false,
//		changeOnKeyPress: true,
		requiresEnterKey: true,
		enterSubmits: true};
	this.passwordModel = {value: ""}
	this.controller.setupWidget("password", this.passwordAttr, this.passwordModel);
	this.buttonModel = {label: $L('Sign In'), disabled: false};
	this.controller.setupWidget("sign-in-button", {}, this.buttonModel);
	this.signInHandler = this.signIn.bind(this);
	this.controller.listen(this.controller.get("sign-in-button"), Mojo.Event.tap, this.signInHandler);
	this.submitHandler = this.handleSubmit.bindAsEventListener(this);
	this.controller.listen('password', Mojo.Event.propertyChange, this.submitHandler);
}

SignInAssistant.prototype.handleSubmit = function (event) {
//	If enter is pressed, pretend the sign me in button was tapped.
//	Remember that requiresEnterKey must be set to true in the textfield's attributes
	if (event && Mojo.Char.isEnterKey(event.originalEvent.keyCode)) {
		Mojo.Log.info('Enter was pressed');
		Event.stop(event);
		this.signInHandler();
	}
}

SignInAssistant.prototype.signIn = function() {
  Mojo.Log.info('Username is', this.userNameModel.value);
  Mojo.Log.info('password is', this.passwordModel.value);
	this.controller.get('password').blur();
	TM.helpers.blockTaps(this);
	this.controller.get('divButtonWrapper').addClassName('show-loader');
	TM.prefs.username = this.userNameModel.value;
	TM.prefs.password = this.passwordModel.value;
	this.successfulSignInHandler = this.signInSuccess.bind(this);
	this.failedSignInHandler = this.signInFailure.bind(this);
	Twitter.verifyCredentials({onSuccess: this.successfulSignInHandler, onFail: {status: 401, functionToCall: this.failedSignInHandler}});
}

SignInAssistant.prototype.signInSuccess = function (transport){
  Mojo.Log.info('Usernamme/password is correct');
	this.controller.get('divButtonWrapper').removeClassName('show-loader');
	//Saves the user object for later use if needed.
	if (!transport.responseJSON.error) {
	  TM.prefs.userInfo = transport.responseJSON;
	}
	TM.helpers.debug(transport.responseJSON, 'Response returned when signing in');
	TM.prefs.userInfo = transport.responseJSON;
	Mojo.Log.info('About to clone the object');
	TM.prefs.username = Object.clone(transport.responseJSON).screen_name;
	Mojo.Log.info('About to store preferences');
	TM.prefStorage.storePrefs(function (){
	  TM.prefStorage.initialize();
	  //this.controller.showBanner('Thanks for signing in!', '', '');
	  //this.controller.stageController.swapScene('home');
	  Mojo.Log.info('About to push the oauth scene');
	  this.controller.stageController.pushScene('oauth', TM.oauthConfig);
	}.bind(this));
}

SignInAssistant.prototype.signInFailure = function (transport){
  TM.prefs.username = this.userNameModel.value;
  TM.prefs.password = this.passwordModel.value;
  TM.prefStorage.storePrefs(function (){
    TM.helpers.unblockTaps(this);
    this.controller.get('divButtonWrapper').removeClassName('show-loader');
    this.controller.showBanner({messageText: 'Check your username/password', icon: 'x-mini-icon.png'}, '', '');
    Mojo.View.advanceFocus(this.controller.get('divSignInFormWrapper'));
  }.bind(this));
//  if (transport.responseJSON.error.startsWith('Could not authenticate you')) {
    // When basic auth is no longer accepted
//    TM.prefStorage.storePrefs();
//    this.signInSuccess(transport);
//  } else {
  	
//  }
}

SignInAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	this.controller.listen('password', Mojo.Event.propertyChange, this.submitHandler);
}


SignInAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	this.controller.stopListening(this.controller.get("password"), Mojo.Event.propertyChange, this.signInHandler);
}

SignInAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	this.controller.stopListening(this.controller.get("sign-in-button"), Mojo.Event.tap, this.signInHandler);
//	This is supposed to be called to make sure the stage is killed... just in case there are handler leaks or leftover DOM nodes
	TM.helpers.closeStage();
}
