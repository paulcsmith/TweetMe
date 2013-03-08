function PictureViewAssistant(url) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	this.url = url;
	// When previewing twitpic photos use this URL http://twitpic.com/show/full/<image_id> // In place of full you can use mini, or thumb. Full is the fullsize image
}

PictureViewAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events handleWindowResize widgets */
	this.handleWindowResizeHandler = this.handleWindowResize.bindAsEventListener(this);
	this.controller.listen(this.controller.window, 'resize', this.handleWindowResizeHandler);
	this.imageViewer = this.controller.get('divImageViewer');
	this.controller.setupWidget('divImageViewer',
    this.attributes = {
      noExtractFS: true
    },
    this.model = {
      onLeftFunction: function (){
        
      },
      onRightFunction: function (){
        
      }
    }
  ); 
};

PictureViewAssistant.prototype.handleWindowResize = function (event){
  try {
    if (this.imageViewer && this.imageViewer.mojo && this.controller && this.controller.window) {
    	this.imageViewer.mojo.manualSize(this.controller.window.innerWidth,	this.controller.window.innerHeight);
    }
  } catch(e) {
    Mojo.Log.info('Couldnt resize the image viewer for some reason');
    Mojo.Log.info(e);
  }
}


PictureViewAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	this.controller.enableFullScreenMode(true);
	this.controller.stageController.setWindowOrientation('free');
	if (Object.isArray(this.url)) {
	  this.imageViewer.mojo.centerUrlProvided(this.url[0]);
	  this.imageViewer.mojo.rightUrlProvided(this.url[1]);
	} else {
	  this.imageViewer.mojo.centerUrlProvided(this.url);
	}
  this.imageViewer.mojo.manualSize(Mojo.Environment.DeviceInfo.screenWidth, Mojo.Environment.DeviceInfo.screenHeight);
//  this.imageViewer.mojo.manualSize(this.controller.stageController.document.body.clientWidth, this.controller.stageController.document.body.clientHeight);
};

PictureViewAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	this.controller.stageController.setWindowOrientation('up');
};

PictureViewAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	this.controller.stopListening(this.controller.window, 'resize', this.handleWindowResizeHandler);
};
