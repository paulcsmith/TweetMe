function AppAssistant(controller) {
	this.appController = controller;
}

AppAssistant.prototype.setup = function() {
	
};

AppAssistant.prototype.handleLaunch = function(args) {
	// This function is required for a light-weight application to be
	// able to open a window of its own. It is not required if the app
	// is always launched from another application cross-app.
	Mojo.Log.info('********* Launch args are:', args);
	try {
  	Data.initialize(function (){
  	  TM.prefStorage.initialize(this.handleLaunchCommands.bind(this, args)); // Needs a delay or it will not launch the first time
  	}.bind(this));
  } catch(e) {
    // Sometimes it just needs a second. Very weird bug that seems to occur at random
    setTimeout(function (){
      Data.initialize(function (){
        TM.prefStorage.initialize(this.handleLaunchCommands.bind(this, args)); // Needs a delay or it will not launch the first time
      }.bind(this));
    }.bind(this), 300);
    Mojo.Log.error("Couldn't initialize data. Trying again");
    Mojo.Log.error(e);
    Mojo.Log.error(e.stack);
  }
};

AppAssistant.prototype.handleLaunchCommands = function (args){
  Mojo.Log.info('Handling launch now');
  Mojo.Log.info(Object.inspect($H(args)));
	
	// when a user comes to this app via Just Type while the app is launched but inactive
	if (args.quickActionStr && args.quickActionStr.length > 0) {
		var stageController = this.appController.getStageController('TweetMe');
		if (stageController) {
			stageController.activate();
			stageController.pushScene('compose', args.quickActionStr);
	    } else {
			this.openChildWindow(args);
		}
	}
	
	// Exhibition mode - create a dock Stage
	else if (args.dockMode || args.touchstoneMode) {
		var dockStage = this.controller.getStageController('dock');
		if (dockStage) {
			dockStage.activate();
		} else {
			var f = function(stageController) {
				stageController.pushScene('exhibition', {dockmode:true});
			}.bind(this);
			this.controller.createStageWithCallback({name: 'dock', lightweight: true}, f, "exhibition");	
		}
	}
	
 	else if (!Object.isUndefined(args) && !Object.isUndefined(args.deleteDraftKey)) {
	    Data.drafts.remove(args.deleteDraftKey);
	    Mojo.Controller.getAppController().showBanner({messageText: 'Draft deleted', icon: "checkmark-mini-icon.png"}, '', 'drafts');
	  } else if (!Object.isUndefined(args) && args.action === 'check_for_new_tweets') {
	    Mojo.Log.info('Checking Twitter in the background');
	    Mojo.Log.info('Trying tohecking timelines');
	    TM.notifications.checkTimelines();
	  } else if (args.action && args.action === 'show-splash-menu') {
	    var stageController = this.appController.getStageController('TweetMe');
	    if (stageController) {
	      stageController.activate();
	      TM.helpers.popToBottomScene(args);
	    } else {
	  	  args.delay = 250; // Delay until the menu displays
	  	  args.mustHaveUnreadItems = true;
	  	  this.openChildWindow(args);
	    }
	  } else if (args.action && args.action === 'show-sharing-options') {
	    Mojo.Controller.getAppController().removeBanner('sharing-options');
	    var stage = Mojo.Controller.getAppController().getStageController('TweetMe')
	    var scene = stage.activeScene().assistant;
	    if (stage.getScenes().length >= 2 && scene) {
	      // Only show if we're not on the bottom level, main scene
	      scene.controller.stageController.popScenesTo('tweet-view', {command: 'show-sharing-options'});
	    }
	  } else if (args.action && args.action === 'reply-to-all') {
	    var stage = Mojo.Controller.getAppController().getStageController('TweetMe')
	    var scene = stage.activeScene();
	    Mojo.Log.info('Scene name is', scene.sceneName);
	    if (scene && scene.sceneName === 'compose') {
	      scene.assistant.replyToAll();
	    }
	  } else {
	  	this.openChildWindow();	
	  }

};

// Handles default application wide menu commands, like preferences and help. Handle scene specific commands in that scene's handleCommand function
AppAssistant.prototype.handleCommand = function (event){
  if (event.type === Mojo.Event.command) {
    var command = event.command;
    if (command === "sign-out") {
      Twitter.signOut({removeCredentials: true});
    } else if (command === "contact-us") {
      this.openSupportEmail();
    } else if (command === "show-preferences") {
      var stage = Mojo.Controller.getAppController().getStageController('TweetMe');
      stage.pushScene('preferences');
    } 
  }
  
  if (event.type === Mojo.Event.forward) {
    var stageController = Mojo.Controller.getAppController().getStageController('TweetMe');
    var sceneStack = stageController.getScenes();
    if (sceneStack.length > 1) {
      TM.helpers.popToBottomScene(true);
    } else {
      QuickBar.showQuickActions(true, stageController);
    }
  }
};

AppAssistant.prototype.openSupportEmail = function (){
  var controller = Mojo.Controller.getAppController().getStageController('TweetMe').activeScene();
  var text = '<br /><br /><br />The information below helps us figure out what\'s wrong<br /><br /> TweetMe version: ' + Mojo.appInfo.version + '<br />' + 'webOS version: ' + Mojo.Environment.DeviceInfo.platformVersion + '<br />' + 'Carrier: ' + Mojo.Environment.DeviceInfo.carrierName+ '<br />' + 'Model name: ' + Mojo.Environment.DeviceInfo.modelName + '<br />' + 'SDK version: ' + Mojo.Environment.build; 
  controller.serviceRequest("palm://com.palm.applicationManager", 
    {
      method: 'open',
      parameters: {
        id: 'com.palm.app.email',
        params: {
          summary: "Hello makers of TweetMe",
          text: text,
          recipients: [{type:"email",
                        role:1,
                        value:"tweetmeapp@gmail.com ",
                        contactDisplay:"TweetMe Support"
                       }]
        }
      }
    }
  );
};

// Params are passed to the activate function of the first pushed scene
AppAssistant.prototype.openChildWindow = function(params) {
	this.stageController = this.appController.getStageController('TweetMe');
	
	if (this.stageController){
		// app window is open, give it focus
		this.stageController.activate();
	} else {
		// otherwise create the app Stage, and set a new alarm for background checking
//		TM.notifications.setAlarm();
		this.stageController = this.appController.createStageWithCallback({name: 'TweetMe', lightweight: true}, this.pushTheScene.bind(this, params));		
	}
//	TM.notifications.showDashboard();
};

AppAssistant.prototype.pushTheScene = function(params, stageController) {
  //Initialize all the data stores I'll be using
//  Data.initialize(); // Added in handleLaunch instead
  // Mojo.Event.listen(stageController.document, 'shaking', QuickBar.show.bindAsEventListener(this, stageController));
  Mojo.Log.info('Pushing the first scene!!!!');
  Mojo.Event.listen(stageController.document, 'keydown', QuickBar.showQuickActions.bindAsEventListener(this, stageController));
  TM.helpers.setupFontSize(stageController);
  TM.helpers.setupMultiAccountStyles(stageController);
	if (TM.prefs.userInfo && TM.prefs.userInfo.name && TM.prefs.oauthAccessToken) {
		
		// Exhibition mode
		if (params && params.dockMode) {
			stageController.pushScene('exhibition', params.dockMode);
		}
		
		else {
			stageController.pushScene('home', params);
			// Force check timelines on start!
			setTimeout(function (){
			  TM.notifications.checkTimelines(undefined, undefined, true); //Forces a check on startup
			}, 8000);	
		
			if (params && params.quickActionStr && params.quickActionStr.length > 0) {
				stageController.pushScene('compose', params.quickActionStr);
			}	
		}
	} else {
		stageController.pushScene('oauth', TM.oauthConfig);
	}
};

AppAssistant.prototype.launchTouchstone = function(params) {
	var dockStageController = this.appController.getStageController('exhibition');
	if (dockStageController) {
		dockStageController.activate();
	} else {
		var pushDockScene = function(stageController) {
			stageController.pushScene('exhibition', params);
		}
		this.controller.createStageWithCallback({name: 'tweetMe', lightweight: true}, pushDockScene);		
	}
	
};