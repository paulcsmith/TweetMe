function UserInfoAssistant(userInfo, options) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	this.userInfo = userInfo;
	this.opts = Object.isUndefined(options) ? {} : options;
	this.opts.section = this.opts.section || 'info';
	this.opts.fromGoToUser = this.opts.fromGoToUser || false; // Boolean
	// If a screen name is passed in TODO: or the screen name is the current user's screenname
	if (Object.isString(this.userInfo)) {
		this.mustLoadUser = true;
		Mojo.Log.info('User must be loaded from Twitter');
	}
	// If a full user object is passed in, then we don't have to load it
	else if (!Object.isString(this.userInfo) && this.opts.section === 'info') {
		Mojo.Log.info('Full user object provided, dont need to load bio');
		this.setupBioAndCounts.call(this);
	}
}

// Just makes sure it doesn't do the weird flicker before loading
UserInfoAssistant.prototype.aboutToActivate = function (){
    
}

UserInfoAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	TM.helpers.setupDefaultMenu.call(this);
	this.sections = ['info', 'tweets', 'favorites', 'mentions'];
	this.followToggleHandler = this.followToggle.bind(this);
  this.pushSceneHandler = this.pushSceneTo.bind(this); //Used later to push scenes
	this.setupPageHandler = this.setupPage.bind(this);
	if (this.mustLoadUser) {
		this.setupHeader.call(this); //Sets up the blank header while loading
		Twitter.loadUserByScreenName(this.userInfo, {onSuccess: this.setupPageHandler, onFail: {status: 404, functionToCall: this.userNotFound.bind(this)}});
	}	else {
		this.setupPageHandler();
	}
	this.setupActions();
}








UserInfoAssistant.prototype.setupActions = function (){
	this.mentionHandler = this.mention.bind(this);
	this.directMessageHandler = this.directMessage.bind(this);
	var actions = [
		{text: 'Mention', class: 'mention', onTap: this.mentionHandler},
		{text: 'Direct Message', class: 'direct-message', onTap: this.directMessageHandler}
	];
	Mojo.Log.info('Length of actions', actions.length);
	this.actions = {items: actions};
	this.controller.setupWidget("divActions",
		{ 
			itemTemplate: "partials/action-item", 
			swipeToDelete: false, 
			reorderable: false,
			hasNoWidgets: true,
			fixedHeightItems: true,
			renderLimit: 10,
			lookahead: 20
		}, 
		this.actions);
	this.actionTapHandler = this.actionTapped.bindAsEventListener(this);
	this.controller.listen("divActions", Mojo.Event.listTap, this.actionTapHandler);
}

UserInfoAssistant.prototype.actionTapped = function (event){
	event.item.onTap();
}

UserInfoAssistant.prototype.mention = function (){
	this.controller.stageController.pushScene('compose', '@' + this.getUserInfoObject().screen_name + ' ');
}

UserInfoAssistant.prototype.directMessage = function (){
  if (this.notFollowedBack) {
    Mojo.Controller.getAppController().showBanner({messageText: "They must be following you to message", icon: "x-mini-icon.png"}, '', ''); //Can't message someone that's not following you
  } else {
  	this.controller.stageController.pushScene('compose', '', { tweetInfo: {type: 'message', user: this.getUserInfoObject()} });
  }
}

// Makes sure an object is returned. If there isn't a full object it returns an object with just the screen_name. Used for mentions and direct messages
UserInfoAssistant.prototype.getUserInfoObject = function (){
  Mojo.Log.info('Getting userInfo object');
  var userInfo = this.userInfo;
  if (Object.isString(userInfo)) {
    Mojo.Log.info('The user object is a string');
    // User was not fully loaded
    userInfo = {screen_name: this.userInfo};
  }
  return userInfo;
}







UserInfoAssistant.prototype.userNotFound = function (transport){
	Mojo.Controller.getAppController().showBanner({messageText: "Couldn't find " + this.userInfo, icon: "x-mini-icon.png"}, '', '');
	setTimeout((function(){
//		this.controller.stageController.popScenesTo('go-to-user');
    this.controller.stageController.popScene();
	}).bind(this), 1500);
}

// Sets up the page once the user is loaded or immediately if a full suer object is passed in
UserInfoAssistant.prototype.setupPage = function (transport){
  Mojo.Log.info('Attempting to set up page');
	if (transport) {
		this.userInfo = transport.responseJSON;
		this.setupBioAndCounts.call(this);
		this.controller.get('divBigLoader').addClassName('pop');
		if (this.opts.fromGoToUser === true) {
//			Twitter.recentUsers.removeByName(this.userInfo.screen_name);
//			Twitter.recentUser.unshift(this.userInfo.screen_name);
		}
	}
	this.mustLoadUser = false;
	// If this is the current user...
	if (this.userInfo.id == TM.prefs.userInfo.id) {
		this.currentUser = true;
	}
	else { //If not...
		this.currentUser = false;
		this.setupFollowHandler = this.setupFollow.bind(this);
		if (this.userInfo && this.userInfo.friendshipStatus) {
//		  this.setupFollowHandler();
      this.setupFollowOnActivate = true;
		} else {
  		Twitter.showFriendship(TM.prefs.userInfo.id, this.userInfo.id, {onSuccess: this.setupFollowHandler});
  	}
	}
	Mojo.Log.info('Attempting to set up header');
	this.setupHeader.call(this);
	this.successfulFetchHandler = TM.helpers.successfulFetch.bind(this);
	var section = this.opts.section; // Shorter
  if (section === 'info') {
    this.setupBioAndCountsPane.call(this);    
  } else {
    var twitterFunc;//Just used for local use
    if (section === 'tweets') {
      twitterFunc = Twitter.userTimeline.curry(this.userInfo.screen_name, {onSuccess: this.successfulFetchHandler, user_id: this.userInfo.screen_name}, {rpp: 35});
      this.twitterFunction = Twitter.userTimeline.curry(this.userInfo.screen_name);
    } else if (section === 'favorites') {
      twitterFunc = Twitter.userFavorites.curry(this.userInfo.screen_name, {onSuccess: this.successfulFetchHandler}, {count: 35});
      this.twitterFunction = Twitter.userFavorites.curry(this.userInfo.screen_name);
    } else if (section === 'mentions') {
      twitterFunc = Twitter.searchTwitter.curry('@' + this.userInfo.screen_name, {onSuccess: this.successfulFetchHandler}, {rpp: 35});
      this.twitterFunction = Twitter.searchTwitter.curry('@' + this.userInfo.screen_name);
    }
    this.setupTweets(twitterFunc);
  }
  for (var i = 0; i < this.sections.length; i++) {
    TM.helpers.setupButton('user-' + this.sections[i] + '-button', this, this.pushSceneHandler.curry('user-info', {section: this.sections[i]}));
  }
}

UserInfoAssistant.prototype.setupTweets = function (twitterFunction){
  this.controller.get('divDarkUserPane').remove();
  var baseLayout = Mojo.View.render({template: 'partials/base-layout'});
  this.controller.get('divBaseLayout').innerHTML = baseLayout;
  this.controller.get('divNavActionsWrapper').remove();
  TM.helpers.setupBaseTimeline.call(this);
  twitterFunction();
}

// Sets actual HTML for the bio, counts, etc
UserInfoAssistant.prototype.setupBioAndCountsPane = function (){
  var userInfoPane = Mojo.View.render({object: this.userInfo.info, template: 'user-info/user-info-pane'});
  var userIndent = Mojo.View.render({object: this.userInfo, template: 'user-info/user-indent'});
  this.controller.get('divUserInfoPane').innerHTML = userInfoPane;
  this.controller.get('divUserIndent').innerHTML = userIndent;
  
  TM.helpers.setupButton('following', this, this.pushSceneHandler.curry('following-followers', 'loadFollowing'));
  TM.helpers.setupButton('followers', this, this.pushSceneHandler.curry('following-followers', 'loadFollowers'));
  TM.helpers.setupButton('tweets', this, this.pushSceneHandler.curry('user-info', {section: 'tweets'}));
}

// sets up the location and descriptions
UserInfoAssistant.prototype.setupBioAndCounts = function (){
	this.userInfo = TM.helpers.filterCounts(this.userInfo);
	this.userInfo.info = {};
	if (this.userInfo.location) {
		this.userInfo.info.location = '<span class="title">location:</span>' + TM.helpers.sanitizeHTML(this.userInfo.location);
	}
	if (this.userInfo.url) {
		this.userInfo.info.url = '<span class="title">web:</span><a href="' + TM.helpers.sanitizeHTML(this.userInfo.url) + '">' + TM.helpers.sanitizeHTML(this.userInfo.url) + "</a>";
	}
	if (this.userInfo.description) {
		this.userInfo.info.bio = '<span class="title">bio:</span>' + TM.helpers.sanitizeHTML(this.userInfo.description);
	}
}
// opts can be which people to load in String form ('following' || 'followers') or any object that will be passed to the next next scene
UserInfoAssistant.prototype.pushSceneTo = function (sceneName, opts) {
	Mojo.Log.info('FROM USER VIEW Scene name is', sceneName);
	Mojo.Log.info('FROM USER VIEW I\'m passing in this to whichPeopleToLoad', opts);
	this.controller.get('user-' + this.opts.section + '-button').removeClassName('selected');
	if (sceneName !== 'following-followers') {
	  this.controller.stageController.swapScene({name: sceneName, transition: Mojo.Transition.crossFade}, this.userInfo, opts);
	} else {
    this.controller.stageController.pushScene(sceneName, this.userInfo, opts);
  }
}

UserInfoAssistant.prototype.setupHeader = function (){
	var headerInfo = Mojo.View.render({object: this.userInfo, template: 'user-info/header'});
	this.controller.get('divUserHeader').innerHTML = headerInfo;
	if (this.currentUser) {
		this.controller.get('divFollowButton').removeClassName('loading');
		this.controller.get('divFollowButton').addClassName('me');
	}
	this.controller.get('user-' + this.opts.section + '-button').addClassName('selected');
	this.controller.listen('bigAvatar', Mojo.Event.tap, this.enlargeProfilePic.bind(this));
	// Tap events for head icons are setup in the 'setupPage' function so they aren't setup until after the user has been loaded. Doesn't load tweets all if you tap the tweet icon before the user has laoded
}

UserInfoAssistant.prototype.enlargeProfilePic = function (){
  this.controller.stageController.pushScene('picture-view', this.userInfo.profile_image_url.replace("_normal.", "."));
}

// Called when the user has been loaded.
UserInfoAssistant.prototype.setupFollow = function (transport){
  // If this is being called after the AJAX request, then use that to fill in the relationship, if no transport from AJAX request then we already have the friendship status
  if (transport) {
  	this.userInfo.friendshipStatus = transport.responseJSON.relationship; // So you don't have to type relationship. I don't even know why Twitter does that.
  }
	this.followButton = this.controller.get('divFollowButton');
	this.followButton.removeClassName('loading');
	if (this.userInfo.friendshipStatus.source.following) {
		this.followButton.addClassName('unfollow');
	}
	else {
		this.followButton.addClassName('follow');
	}
	if (this.userInfo.friendshipStatus.source.followed_by === false) {
	  this.controller.get('divActions').addClassName('not-followed-back');
	  this.notFollowedBack = true;
	}
	this.controller.listen(this.followButton, Mojo.Event.tap, this.followToggleHandler);
}

// Called when the user clicks the follow/unfollow button
UserInfoAssistant.prototype.followToggle = function (){
    if (this.followButton.hasClassName('unfollow')) {
        Mojo.Log.info('Attempting to unfollow');
        this.followButton.removeClassName('unfollow');
        this.followButton.addClassName('loading');
        var unfollowHandler = this.onUnfollow.bind(this);
        Twitter.unfollow(this.userInfo.friendshipStatus.target.id, {onSuccess: unfollowHandler});
    } else if (this.followButton.hasClassName('follow')) { //Explicitly check for unfollow so that if it's just loading it does nothing when tapped
        Mojo.Log.info('Attempting to follow');
        this.followButton.removeClassName('follow');
        this.followButton.addClassName('loading');
        var followHandler = this.onFollow.bind(this);
        Twitter.follow(this.userInfo.friendshipStatus.target.id, {onSuccess: followHandler});
    }
}

// Makes the signed in user follow this person
UserInfoAssistant.prototype.onFollow = function (transport){
  if (transport) {
  	this.userInfo.friendshipStatus = transport.responseJSON.relationship; // So you don't have to type relationship. I don't even know why Twitter does that.
  }
  this.followButton.removeClassName('loading');
  this.followButton.addClassName('unfollow');
}

// Makes the signed in user follow this person
UserInfoAssistant.prototype.onUnfollow = function (transport){
  if (transport) {
  	this.userInfo.friendshipStatus = transport.responseJSON.relationship; // So you don't have to type relationship. I don't even know why Twitter does that.
  }
  this.followButton.removeClassName('loading');
  this.followButton.addClassName('follow');
}

UserInfoAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	 if (this.opts.section !== 'info') {
	   this.controller.get('divBigLoader').addClassName('show');
	 } else {
	   // It's the info section
	   this.controller.get('divDarkUserPane').style.display = 'block';
	 }
	 if (this.opts.section === 'info' && !this.currentUser){
	   // It is the info section and the it is not the current user
	   this.controller.get('divActions').style.display = 'block';
	 }
	 if (this.setupFollowOnActivate === true) {
	   this.setupFollowHandler();
	 }
	 TM.helpers.handleActivate.call(this, event);
}


UserInfoAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

UserInfoAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	try {
  	this.controller.stopListening('divFollowButton', Mojo.Event.tap, this.followToggleHandler);
  	this.controller.stopListening("divActions", Mojo.Event.listTap, this.actionTapHandler);
	} catch (e) {
	  Mojo.Log.error("Couldn't cleanup the follow button");
	  Mojo.Log.error(e.stack);
	}
	try {
  	TM.helpers.closeStage();
  } catch (e) {
    Mojo.Log.error("Couldn't call TM.helpers.closeStage() properly");
    Mojo.Log.error(e.stack);
  }
}
