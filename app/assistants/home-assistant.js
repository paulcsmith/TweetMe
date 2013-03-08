function HomeAssistant(activateParams) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	this.activateParams = activateParams; // Used by TM.helpers.handleActivate in the activate function
}

HomeAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	try {
  	TM.helpers.setupDefaultMenu.call(this);
  	TM.helpers.setupTimeline.call(this, 'home', Twitter.homeTimeline);
  } catch(e) {
    Mojo.Log.error(e.stack);
  }
}

HomeAssistant.prototype.handleCommand = function (event){
	TM.helpers.handleCommand.bind(this, event)();
}

HomeAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	TM.helpers.handleActivate.call(this, event);
	this.controller.get('divBigLoader').addClassName('show');
	// Changes the scrolling speeds of the sroller with the list inside it
	// from UIWidgets sample app -- scrolling-assistant.js
	// this.controller.get('divScrollerPane').mojo.updatePhysicsParameters({ flickRatio: .7, flickSpeed: .08 });//defaults: flickRatio .5, flickSpeed: .06
}


HomeAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	//this.focusComposeArea();
}

HomeAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */	
//	This is supposed to be called to make sure the stage is killed... just in case there are handler leaks or leftover DOM nodes
	TM.helpers.defaultCleanup.call(this);
}
