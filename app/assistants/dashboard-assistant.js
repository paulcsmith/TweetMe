function DashboardAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

DashboardAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	try {
  	Mojo.Log.info('Setting up dashboard');
  	this.title = this.controller.get('divDashboardTitle');
  	this.openSplashMenuHandler = this.openSplashMenu.bind(this);
  	this.controller.listen('divNotificationWrapper', Mojo.Event.tap, this.openSplashMenuHandler);
  } catch(e) {
    Mojo.Log.error("Couldn't set up dashboard notification properly");
    Mojo.Log.error(e);
    Mojo.Log.error(e.stack);
  }
};

DashboardAssistant.prototype.openSplashMenu = function(event) {
  //this.appController = Mojo.Controller.getAppController();
  //this.stageController = this.appController.getStageController('TweetMe');
	new Mojo.Service.Request('palm://com.palm.applicationManager', {
	    method: 'open',
	    parameters: {
	        id: 'com.catalystmediastudios.tweetme',
	        params: {action: 'show-splash-menu', delay: 400}
	    }
	});
	setTimeout(function (){
	  //this.controller.window.close();
	}.bind(this), 350); // light delay to window close so the notification area doesn't "jump"
};


DashboardAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	try {
	  this.title.innerHTML = 'Hello ' + TM.prefs.userInfo.name;
	} catch(e) {
	  Mojo.Log.error("Couldn't set notifcation title");
	  Mojo.Log.error(e);
	}
};

DashboardAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

DashboardAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	//this.controller.stopListening('divNotificationWrapper', Mojo.Event.tap, this.openSplashMenuHandler);
};