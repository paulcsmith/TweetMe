// @param whatToLoad {string} either 'inbox' or 'sent'
function MessagesAssistant(whatToLoad) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	 Mojo.Log.info('What to load', whatToLoad);
	 this.whatToLoad = whatToLoad;
	 if (Object.isUndefined(whatToLoad)) {
	   this.whatToLoad = 'directMessages';
	 }
}

MessagesAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	TM.helpers.setupDefaultMenu.call(this);
	TM.helpers.setupTimeline.call(this, 'messages', Twitter[this.whatToLoad]);
	// Note on how tweet view knows what actions to display
//	 Remember, it uses the default showTweetView, but knows the tweet is a message, because it filters it in TM.helpers.filterTweets and sets the type to message.

//  this.TOP_MENU = {
//    loadInbox: {command: 'directMessages', target: this.swapTo.bind(this)},
//    loadSent: {command: 'sentMessages', target: this.swapTo.bind(this)}
//  };  
//  this.topMenuModelItems = [
//    {label:'Inbox/Send menu', toggleCmd: this.whatToLoad, items:[
//      {label: $L('Inbox'), command: this.TOP_MENU.loadInbox.command, width:160},
//      {label: $L('Sent'), command: this.TOP_MENU.loadSent.command, width:160}
//    ]}
//  ]; 
//    
//  this.topMenuModel = {
//  	visible: true,
//  	items: this.topMenuModelItems
//  }; 
//  this.controller.setupWidget(Mojo.Menu.viewMenu, {menuClass: 'no-fade'}, this.topMenuModel);
};

MessagesAssistant.prototype.handleCommand = function (event){
	TM.helpers.handleCommand.call(this, event);
	
	// Loads the correct scene
	if (event.type === Mojo.Event.command) {
		var menu = $H(this.TOP_MENU);
		menu.keys().each(function(key) {
	      var menuCommand = menu.get(key);
	      if (menuCommand.command == event.command) {
	        menuCommand.target.curry(menuCommand.command)();
	        event.stop();
	        throw $break;
	      }
		});	
	}
}

// Called from handleCommand when top menu is tapped so swap to a different scene
MessagesAssistant.prototype.swapTo = function (whatToLoad){
	Mojo.Log.info('What should I load', whatToLoad);
	this.controller.stageController.swapScene({name: 'messages', transition: Mojo.Transition.crossFade}, whatToLoad);
}

MessagesAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	TM.helpers.handleActivate.call(this, event);
	this.controller.get('divBigLoader').addClassName('show');
};

MessagesAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

MessagesAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	TM.helpers.defaultCleanup.call(this);
};
