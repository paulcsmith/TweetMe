function PreferencesAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

PreferencesAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	var shortHeader = Mojo.View.render({object: {icon: 'mini-me', mainText: 'TweetMe', lighterText: 'Preferences'}, template: 'partials/short-header'});
	this.controller.get('divShortHeader').innerHTML = shortHeader;
	Mojo.Log.info('Default notification interval is', TM.prefs.notificationInterval);
	Mojo.Log.info('Default num teets to load', TM.prefs.numTweetsToLoad);
	this.setupTimelineToggles();
	this.originalNotificationInterval = TM.prefs.notificationInterval;
	// Setup list selector for UPDATE INTERVAL 
  this.controller.setupWidget("checkIntervalList", 
    { 
      label: "Check every", 
      choices: [ 
        {label: "Only at App Start",     value: 0}, 
        {label: "5 Minutes",        value: 5 * 60 * 1000}, 
        {label: "15 Minutes",       value: 15 * 60 * 1000}, 
        {label: "30 Minutes",       value: 30 * 60 * 1000},
        {label: "1 Hour",           value: 60 * 60 * 1000}, 
        {label: "3 Hours",          value: 3 * 60 * 60 * 1000}
      ] 
    }, 
    this.notificationIntervalModel = { 
      value: TM.prefs.notificationInterval
    }); 
  this.controller.setupWidget("numTweetsToLoad", 
    { 
      label: "Max Tweets to load", 
      choices: [ 
        {label: "25",        value: 25}, 
        {label: "50",        value: 50},
        {label: "75",        value: 75},
        {label: "90",        value: 90},
      ] 
    }, 
    this.numTweetsToLoadModel = { 
      value: TM.prefs.numTweetsToLoad
    });
  this.controller.setupWidget("displayName", 
    { 
      label: "Display Name", 
      choices: [ 
        {label: "Screen Name",        value: 'screen_name'}, 
        {label: "Real Name",        value: 'real_name'}
      ] 
    }, 
    this.displayNameModel = { 
      value: TM.prefs.displayName
    });
    
  this['largeFontAttr'] = {
  		trueLabel:  'on' ,//if the state is true, what to label the toggleButton; default is 'On'
  		trueValue:  'large',//if the state is true, what to set the model[property] to; default if not specified is true
  		falseLabel:  'off', //if the state is false, what to label the toggleButton; default is Off
  		falseValue: 'normal', //if the state is false, , what to set the model[property] to; default if not specific is false],
  		fieldName:  'toggle' //name of the field; optional
  	}
  this['largeFontModel'] = {
  	value: TM.prefs.fontSize,   // Current value of widget, from choices array.
  	disabled: false //whether or not the checkbox value can be changed; if true, this cannot be changed; default is false
  }
  this.controller.setupWidget('large-font-toggle', this['largeFontAttr'], this['largeFontModel'] );
  
  this['postOnEnterAttr'] = {
  		trueLabel:  'on' ,//if the state is true, what to label the toggleButton; default is 'On'
  		trueValue:  true,//if the state is true, what to set the model[property] to; default if not specified is true
  		falseLabel:  'off', //if the state is false, what to label the toggleButton; default is Off
  		falseValue: false, //if the state is false, , what to set the model[property] to; default if not specific is false],
  		fieldName:  'toggle' //name of the field; optional
  	}
  this['postOnEnterModel'] = {
  	value: TM.prefs.postOnEnter,   // Current value of widget, from choices array.
  	disabled: false //whether or not the checkbox value can be changed; if true, this cannot be changed; default is false
  }
  this.controller.setupWidget('post-on-enter-toggle', this['postOnEnterAttr'], this['postOnEnterModel']);
  
  // Add account button
  this.addAccountButtonModel = {label: $L('Add An Account'), disabled: false};
  this.addAccountButton = this.controller.get("add-account-button");
  this.controller.setupWidget("add-account-button", {}, this.addAccountButtonModel);
  this.showOAuthHandler = this.showOAuthPage.bind(this);
  this.controller.listen(this.addAccountButton, Mojo.Event.tap, this.showOAuthHandler);
}

PreferencesAssistant.prototype.showOAuthPage = function (){
  delete TM.prefs.userInfo;
  delete TM.prefs.oauthTokenSecret;
  delete TM.prefs.oauthAccessToken;
  this.controller.stageController.popScenesTo('');
  this.controller.stageController.pushScene('oauth', TM.oauthConfig);
}

PreferencesAssistant.prototype.setupTimelineToggles = function (){
  this.togglesFor = ['mentions', 'messages', 'home']; // TODO: Grab this array from the keys in TM.prefs.unreadItems.
  this.togglesFor.each(function (section){
    // Will look something like this.mentionsAttr
    this[section + 'Attr'] = {
    		trueLabel:  'yes' ,//if the state is true, what to label the toggleButton; default is 'On'
    		trueValue:  true,//if the state is true, what to set the model[property] to; default if not specified is true
    		falseLabel:  'no', //if the state is false, what to label the toggleButton; default is Off
    		falseValue: false, //if the state is false, , what to set the model[property] to; default if not specific is false],
    		fieldName:  'toggle' //name of the field; optional
    	}
    this[section + 'Model'] = {
    	value: Account.getCurrent().unreadItems[section].shouldCheck,   // Current value of widget, from choices array.
    	disabled: false //whether or not the checkbox value can be changed; if true, this cannot be changed; default is false
    }
    this.controller.setupWidget(section + '-toggle', this[section + 'Attr'], this[section + 'Model'] );
  }.bind(this));
}

PreferencesAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}

PreferencesAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

PreferencesAssistant.prototype.savePreferences = function() {
	TM.prefs.notificationInterval = this.notificationIntervalModel.value;
	TM.prefs.numTweetsToLoad = this.numTweetsToLoadModel.value;
	TM.prefs.displayName = this.displayNameModel.value;
	TM.prefs.fontSize = this.largeFontModel.value;
	TM.prefs.postOnEnter = this.postOnEnterModel.value;
	TM.helpers.setupFontSize(this.controller.stageController);
	this.togglesFor.each(function (section){
	  Account.getCurrent().unreadItems[section].shouldCheck = this[section + 'Model'].value;
	}.bind(this));
	if (this.originalNotificationInterval !== this.notificationIntervalModel.value) {
	  // Set new alarm for set notification interval if the interval has changed
	  if (this.notificationIntervalModel.value === 0) {
	    TM.notifications.setAlarm(undefined, 0); // Puts interval very far into the future until I implement clearing hte alarm. Far future interval is set in the setAlarm function
	  } else {
  	  TM.notifications.setAlarm(undefined, this.notificationIntervalModel.value / 60 / 1000); // Resets the alarm with the new interval
  	}
	}
	TM.prefStorage.storePrefs();
}

PreferencesAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	this.savePreferences();
}
