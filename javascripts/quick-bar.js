var QuickBar = {};

// Used as the event handler for shaking
// event is either the keyDown event or a boolean set to true (when used for the forward swipe gesture on bottom level scenes
// Modified slightly to a double tap can also show other quick actions that aren't on every view. For instance, sharing options on the tweet view, 
// and the more options on compose views and user info views, coming soon
// TODO: Rename or refactor later so the name makes more sense
QuickBar.showQuickActions = function (event, stageController){
  var topScene = stageController.topScene().assistant;
  // if (event.magnitude >= 1.6 || event === true) { // Used to be trigger by a shake event, but it was unreliable and annoying in my opinion
  // Define quickAction in the assistant. Just make it a function. It can simply call another function if needed.
  if (event.metaKey === true || event === true) {
    var elapsedTime = 2000; // Just a placeholder;
    if (QuickBar.lastTimePressed) {
      elapsedTime = new Date().getTime() - QuickBar.lastTimePressed;
    }
    if ((elapsedTime <= 350 && elapsedTime > 130) || event === true) {
      var topScene = stageController.topScene().assistant;
      if (!topScene.quickBar) {
        topScene.quickBar = topScene.controller.get('divQuickBarWrapper');
        QuickBar.setupEvents.call(topScene);
      }
      if (topScene.quickAction) {
        // If there is a quick action use it. It takes precedence.
        topScene.quickAction();
      } else {
        // Otherwise try to show the quick bar
        if (topScene.quickBar && !topScene.quickBar.hasClassName('appear') && topScene.timelineModel) {
          if (topScene.bottomActionsWrapper) {
            topScene.bottomActionsWrapper.addClassName('hide');
            this.bottomActionsWrapper.removeClassName('show-accounts');
            //TM.helpers.hideNav.call(topScene);
          }
          if (topScene.navActionsWrapper) {
            topScene.navActionsWrapper.removeClassName('appear');
          }
          setTimeout(function (){
            topScene.quickBar.addClassName('appear');
          }, 190);
        } else if (topScene.quickBar && topScene.timelineModel) {
          // Has quickBar, but it's already up
          QuickBar.hide.call(topScene);
        }
      }
    }
    QuickBar.lastTimePressed = new Date().getTime();
  }
}

QuickBar.actions = ['Refresh', 'JumpTop', 'JumpBottom'];

// Make sure to call the function and bind it to the top scene (or the scene with the quick bar) bound
QuickBar.setupEvents = function (){
  Mojo.Log.info('Setting up quick bar events');
  for (var i = 0; i < QuickBar.actions.length; i++) {
    TM.helpers.setupButton('quick' + QuickBar.actions[i], this, QuickBar[QuickBar.actions[i]].bind(this));
  }
}

QuickBar.JumpTop = function (){
  if (this.quickBar && !this.quickBar.hasClassName('loading')) {
    Mojo.Log.info('Jumping to the top');
    try {
      this.controller.getSceneScroller().mojo.scrollTo(0, 0);
      QuickBar.hide.call(this);
    } catch(e) {
      Mojo.Log.error("Couldn't scroll to top");
      Mojo.Log.error(e);
    }
  }
}

QuickBar.JumpBottom = function (){
  if (this.quickBar && !this.quickBar.hasClassName('loading')) {
    Mojo.Log.info('Jumping to the bottom');
    if (this.listWidget && this.timelineModel) {
      // Calls reveal bottom a few times so that it jumps all the way to the bottom
      for (var i = 0; i < (this.timelineModel.items.length / TM.helpers.maxTweetsToRender); i++) {
        this.controller.getSceneScroller().mojo.revealBottom();
      }
      this.controller.getSceneScroller().mojo.revealBottom(); // Once more just in case
      Mojo.Log.info();
    }
    QuickBar.hide.call(this);
  }
}

QuickBar.Refresh = function (){
  Mojo.Log.info('refreshing');
  if (this.refreshButton && this.quickBar && !this.quickBar.hasClassName('loading')) {
    this.quickBar.addClassName('loading');
    TM.helpers.loadMore.call(this, 'New');
  }
}

QuickBar.hide = function (){
  this.quickBar.removeClassName('loading');
  // Delay slightly so everything can catch up before showing the bar
  setTimeout(function (){
    if (this.quickBar) {
      if (this.bottomActionsWrapper) {
        setTimeout(function (){
          this.bottomActionsWrapper.removeClassName('hide');
          this.bottomActionsWrapper.removeClassName('show-accounts');
        }.bind(this), 190);
      }
      this.quickBar.removeClassName('appear');
    }
  }.bind(this), 100);
}