// This scene is also used to create a new direct message because it uses the almost exact same style, but just uses a different button name and swaps to a different scene.
// @param opts {object} options go in this object
// @param opts.goToDirectMessage {boolean} Pass true if this will go to a direct message when pushed.
function GoToUserAssistant(opts) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	if (!opts) {
	  opts = {};
	}
	this.opts = opts;
}

GoToUserAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	TM.helpers.setupDefaultMenu.call(this);
	if (this.opts.showDirectMessage !== true) {
	  // Regular go to user scene
	  TM.helpers.setupBaseLayout.call(this, 'go-to-user')
	} else {
	  // For composing a new direct message
	  this.controller.get('divEntryPane').addClassName('message-this-user');
	}

	this.userNameModel = {value: this.opts.defaultUser};
	this.userNameAttr = {
		hintText: "Type a username...",
		autoFocus: true,
		autoReplace: false,
		requiresEnterKey: true,
		textCase: Mojo.Widget.steModeLowerCase};
	this.controller.setupWidget("username", this.userNameAttr, this.userNameModel);
	this.submitHandler = this.handleSubmit.bindAsEventListener(this);
	this.controller.listen('username', Mojo.Event.propertyChange, this.submitHandler);
	
	this.buttonModel = {label: $L('Go to User'), disabled: false};
	this.controller.setupWidget("go-to-user-button", {}, this.buttonModel);
	
	this.usersModel = { items: [] };
	this.controller.setupWidget("listWidget",
		{ 
			itemTemplate: "partials/timeline-row", 
			listTemplate: "partials/timeline-list", 
			swipeToDelete: false, 
			reorderable: false,
			renderLimit: 100,
			lookahead: 20
		}, 
		this.usersModel);		
	this.showUserHandler = this.pushUser.bindAsEventListener(this);
	this.controller.listen('go-to-user-button', Mojo.Event.tap, this.showUserHandler);
}

GoToUserAssistant.prototype.handleSubmit = function (event) {
//	If enter is pressed, pretend the go to user button was tapped.
//	Remember that requiresEnterKey must be set to true in the textfield's attributes
	if (event && Mojo.Char.isEnterKey(event.originalEvent.keyCode)) {
		Mojo.Log.info('Enter was pressed');
		Event.stop(event);
		this.showUserHandler();
	}
}

GoToUserAssistant.prototype.pushUser = function (){
  if (this.userNameModel.value.length > 0) {
    if (this.opts.showDirectMessage !== true) {
      // Go to user
    	this.controller.stageController.pushScene('user-info', this.userNameModel.value, {fromGoToUser: true}); //True will make it so that the user is saved to the recent users
    } else {
      this.controller.stageController.swapScene('compose', this.opts.startTweetWith, {tweetInfo: {type: 'message', user: {screen_name: this.userNameModel.value.replace(/@| /gi, '')}}});
    }
	} else {
	  Mojo.View.advanceFocus(this.controller.get('divEntryPane'));
	}
}

GoToUserAssistant.prototype.handleCommand = function (event){
  if (this.opts.showDirectMessage !== true) {
    TM.helpers.handleCommand.call(this, event);
  }
}

GoToUserAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	TM.helpers.handleActivate.call(this, event);
	Mojo.View.advanceFocus(this.controller.get('divEntryPane'));
}


GoToUserAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

GoToUserAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	TM.helpers.defaultCleanup.call(this);
}
