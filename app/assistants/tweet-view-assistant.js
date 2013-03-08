function TweetViewAssistant(tweetInfo, tweetIndex) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	this.tweetInfo = tweetInfo;
	this.originalTweetText = this.tweetInfo.text + ""; // Probably not needed
	// Can probably remove this now that tweet-view uses, "formatted text" instead of just "text"
	this.originalTweetInfo = Object.clone(tweetInfo); // Doesn't have the parsing for usernames, hastags, etc. Used for passing to convo view
	this.originalTweetInfo.checkedAt = null; // So conversation view doesn't get timeline dividers
	this.tweetIndex = tweetIndex;
}

TweetViewAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	// Sets up the app menu
	this.menuItems = TM.menuModel.addItems([
	  {label: 'Share via SMS', command: 'share-via-sms'},
	  {label: 'Share via Email', command: 'share-via-email'},
	  {label: 'Copy Tweet', command: 'copy-tweet'}
	]);
	this.controller.setupWidget(Mojo.Menu.appMenu, TM.menuAttr, this.menuItems);
	// this.controller.assistant.parentScene.assistant
	this.parentScene = this.controller.stageController._sceneStack._sceneStack.last().assistant;
	
	this.tweetInfo.formattedText = TM.helpers.autoFormat(this.tweetInfo.text);
//	Aug 8, 5:43pm
//	this.tweetInfo.prettyTime = new Date(Date.parse(this.tweetInfo.created_at)).strftime("%b %d, %I:%M%p");
//	TODO: Convert to exact date, but first must put in current phone's timezone. Actually I kind of like the relative dates. Probably leave them.
	this.tweetInfo.prettyTimeLong = DateHelper.time_ago_in_words_with_parsing(this.tweetInfo.created_at, 'long');
	this.findAndSetupImages();
	if (this.hasImages == true) {
	  this.tweetInfo.prettyTimeLong += " &middot";
	  this.tweetInfo.prettyTimeLong = this.tweetInfo.prettyTimeLong.replace('minutes', 'mins');
	} else if (this.tweetInfo.type != "message") {
	  // regular tweet without a photo
	  this.tweetInfo.prettyTimeLong += " from";
	}
	var tweetInfo = Mojo.View.render({object: this.tweetInfo, template: 'tweet-view/tweet'});
	this.controller.get('divSingleTweetWrapper').innerHTML = tweetInfo;
	this.thumbnailTappedHandler = this.thumbnailTapped.bind(this);
	this.controller.listen('divImageWrapper', Mojo.Event.tap, this.thumbnailTappedHandler);
	this.setupActions();
	this.setupHeaderHandler = this.setupHeader.bind(this);
	// If no user object
	if (this.tweetInfo.no_user_object) {
		this.setupHeaderHandler();
		Mojo.Log.info('Loading user! Will then store user info');
		var logFail = (function(){Mojo.Log.info('Failed to load user');}); //Just need to log. Not that important
		Twitter.loadUserByScreenName(this.tweetInfo.user.screen_name, {onSuccess: this.setupHeaderHandler, onFail: {status: 404, functionToCall: logFail}});
	}
	// Has full user object
	else {
		this.setupHeaderHandler();
	}
	
	
	// geo

	if(this.tweetInfo.geolocation.place) {
		if(this.tweetInfo.geolocation.latitude) {
			var google_url = 'http://maps.google.com/maps/api/staticmap?zoom=13&size=280x75&markers=color:blue|size:mid|'+ this.tweetInfo.geolocation.latitude +','+ this.tweetInfo.geolocation.longitude +'&sensor=false';
		} else if (this.tweetInfo.geolocation.bounding_box) {
			var p1 = this.tweetInfo.geolocation.bounding_box[0][1]+','+this.tweetInfo.geolocation.bounding_box[0][0]+'|';
			var p2 = this.tweetInfo.geolocation.bounding_box[1][1]+','+this.tweetInfo.geolocation.bounding_box[1][0]+'|';
			var p3 = this.tweetInfo.geolocation.bounding_box[2][1]+','+this.tweetInfo.geolocation.bounding_box[2][0]+'|';
			var p4 = this.tweetInfo.geolocation.bounding_box[3][1]+','+this.tweetInfo.geolocation.bounding_box[3][0];
			var bounding = p1 + p2 + p3 + p4;
			var google_url = 'http://maps.google.com/maps/api/staticmap?zoom=13&size=280x75&sensor=false&path='+ bounding;
			Mojo.Log.info(google_url);
		}
		var map_src = "<img src=\""+ google_url +"\" />";
		this.controller.get('mapImage').innerHTML = map_src;
	} else {
		this.controller.get('location-info').style.display = 'none';
	}
	
}

TweetViewAssistant.prototype.findAndSetupImages = function (){
  this.siu = new SpazImageURL();
	this.hasImages = false;
	this.largeImageUrls = [];
	this.imageUrls = this.siu.getThumbsForUrls(this.tweetInfo.text);
	// Figure out how to handle multiple images later.
	// For now just store the last picture posted
	var count = 0;
	if (this.imageUrls) {
	  this.hasImages = true;
	  for (var key in this.imageUrls) {
	    count++;
	    // Stored in tweetInfo so it's available to Mojo.Render when rendering the tweet. We'll use this for the src attribute for the image
	    this.largeImageUrls.push(this.siu.getImageForUrl(key)); // passed to the picture view assistant so if there are multiple photos it will show them (only shows up to 2, the most I've ever seen on Twitter)
	    this.originalImageUrl = key;
	  	this.tweetInfo.imageUrl = this.imageUrls[key];
	  	if (this.tweetInfo.hasPhoto !== true) {
	  	  this.tweetInfo.hasPhoto = true;
	  	  this.tweetInfo.metadata += " has-photo";
	  	}
	  }
	}
	Mojo.Log.info('!!!There should be', count, 'images');
	// TM.helpers.debug(this.imageUrls, 'Image URLS');
	Mojo.Log.info('thumbnail image url is', this.tweetInfo.imageUrl);
}

TweetViewAssistant.prototype.thumbnailTapped = function (){
//  var imageUrl = this.siu.getImageForUrl(this.originalImageUrl);
//  Mojo.Log.info('Large image url is', imageUrl);
//  this.controller.stageController.pushScene('picture-view', imageUrl);
  Mojo.Log.info('Image urls', this.largeImageUrls);
  this.controller.stageController.pushScene('picture-view', this.largeImageUrls);
}

TweetViewAssistant.prototype.handleCommand = function (event){
  if (event.type === Mojo.Event.command) {
    var command = event.command;
    if (command === 'share-via-email' || command === 'share-via-sms' || command === 'copy-tweet') {
      TM.helpers.share.call(this, this.tweetInfo.text, this.tweetInfo.user.screen_name, command);
    }
  }/* else if (event.type === Mojo.Event.back) {
    // Just a test to see if manually calling popScene was faster
    this.controller.stageController.popScene();
  }
  */
}

TweetViewAssistant.prototype.setupHeader = function (transport){
	if (transport) {
		// Saves user object so when they tap "info" it will load instantly, assuming the request is finished.
		Mojo.Log.info('Storing newly loaded user info');
		this.tweetInfo.user = transport.responseJSON;
		this.tweetInfo.user.display_name = transport.responseJSON.screen_name; // Must set this to screen_name because the search api doesn't return real names :( at least not yet
		this.tweetInfo.no_user_object = false;
	}
	var headerInfo = Mojo.View.render({object: this.tweetInfo, template: 'tweet-view/header'});
	this.userHeader = this.controller.get('divUserHeader');
	this.userHeader.innerHTML = headerInfo;
	this.infoTapHandler = this.infoButtonTapped.bindAsEventListener(this);
	this.controller.listen("divInfoButton", Mojo.Event.tap, this.infoTapHandler);
	this.bigAvatar = this.controller.get('bigAvatar');
	this.controller.listen(this.bigAvatar, Mojo.Event.tap, this.enlargeProfilePic.bind(this));
}

TweetViewAssistant.prototype.enlargeProfilePic = function (){
  this.controller.stageController.pushScene('picture-view', this.tweetInfo.user.profile_image_url.replace("_normal.", "."));
}

TweetViewAssistant.prototype.setupActions = function (){
	this.retweetHandler = this.retweet.bind(this);
	this.replyHandler = this.reply.bind(this);
	this.favoriteHandler = this.favorite.bind(this);
	this.unfavoriteHandler = this.unfavorite.bind(this);
	this.deleteHandler = this.deleteTweet.bind(this);
	this.showConversationHandler = this.showConversation.bind(this);
	this.actions = {items: [
		{text: 'Retweet', class: 'retweet', onTap: this.retweetHandler},
		{text: 'Reply', class: 'reply', onTap: this.replyHandler},
		{text: 'Delete', class: 'delete', onTap: this.deleteHandler},
		{text: ' Unfavorite', class: 'unfavorite', onTap: this.unfavoriteHandler},
		{text: ' Favorite', class: 'favorite', onTap: this.favoriteHandler}
		]};
	if (this.tweetInfo.conversation === true) {
	  Mojo.Log.info('About to add the "Conversation" menu item');
	  this.actions.items.splice(0, 0, {text: 'Conversation', class: 'show-conversation', onTap: this.showConversationHandler});
	}
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

TweetViewAssistant.prototype.infoButtonTapped = function (){
	var button = this.controller.get('divInfoButton').addClassName('selected');
	var header = this.userHeader.addClassName('selected');
	// TODO: Could probably use x-mojo-tap-highlight  instead.
	setTimeout(function() {
		button.removeClassName('selected');
		header.removeClassName('selected');
	}, 300);
	// If no user object
	if (this.tweetInfo.no_user_object) {
		Mojo.Log.info('Sending the screen name...');
		this.controller.stageController.pushScene('user-info', this.tweetInfo.user.screen_name);
	}
	else {
		Mojo.Log.info('Sending the whole user object....');
		this.controller.stageController.pushScene('user-info', this.tweetInfo.user);
	}
}

TweetViewAssistant.prototype.actionTapped = function (event){
	event.item.onTap();
}

TweetViewAssistant.prototype.showConversation = function(event) {
  Mojo.Log.info('About to show conversation');
  Mojo.Log.info('Original tweet info is', this.originalTweetInfo.text);
	this.controller.stageController.pushScene('conversation', this.originalTweetInfo);
}


TweetViewAssistant.prototype.retweet = function(event) {
  var retweetString = 'RT @' + this.tweetInfo.user.screen_name + ': ' + TM.helpers.stripTags(this.originalTweetText + "") + ' ';
	this.controller.stageController.pushScene('compose', retweetString);
}

// Called automatically when the gesture area is double tapped
TweetViewAssistant.prototype.quickAction = function (){
  this.showSharingOptions();
}

TweetViewAssistant.prototype.showSharingOptions = function() {
  if (this.showingMoreOptions !== true) {
    this.showingMoreOptions = true;
    this.controller.showAlertDialog({ 
        onChoose: function(command) {
          this.showingMoreOptions = false;
          if (command === 'retweet-new') {
            Mojo.Log.info('Status_id is', this.tweetInfo.id);
            TM.helpers.share.call(this, undefined, undefined, {action: 'retweet-new', status_id: this.tweetInfo.id, screen_name: this.tweetInfo.user.screen_name});
          } else if (command === 'share-via-email' || command === 'share-via-sms' || command === 'copy-tweet') {
            TM.helpers.share.call(this, this.originalTweetInfo.text, this.tweetInfo.user.screen_name, command); 
          }
        }.bind(this), 
        // message: "How would you like to share?", 
        choices:[ 
          {label: "Copy Tweet", value: "copy-tweet"},
          {label: "Share via Email", value: "share-via-email"},
          {label: "Share via SMS/Text", value: "share-via-sms"},
          {label: "Official Style Retweet", value: 'retweet-new'}/*,
          {label: "Nevermind", value: "cancel", type: "dismiss"}*/
        ]
    });
  }
}


TweetViewAssistant.prototype.reply = function(event) {
  if (this.tweetInfo.type === 'message') {
    this.controller.stageController.pushScene('compose', '', {tweetInfo: this.tweetInfo, inReplyToTweet: this.tweetInfo});
  } else {
  	this.controller.stageController.pushScene('compose', '@' + this.tweetInfo.user.screen_name + ' ', {in_reply_to_status_id: this.tweetInfo.id, inReplyToTweet: this.tweetInfo});
  }
}

TweetViewAssistant.prototype.favorite = function(event) {
	TM.helpers.blockTaps(this);
	
	this.parentScene.timelineModel.items[this.tweetIndex].favorite = 'favorited';
	this.tweetInfo.favorite = 'favorited';
	this.parentScene.listWidget.mojo.noticeUpdatedItems(this.tweetIndex, [this.tweetInfo]);
	
	this.controller.get('divActionfavorite').addClassName('loading');
	var successFunction = function (){
  	TM.helpers.unblockTaps(this);
  	this.controller.get('star').removeClassName('unfavorited').addClassName('favorited');
  	this.controller.get('divSingleTweet').removeClassName('unfavorited').addClassName('favorited');
  	this.controller.get('divActionfavorite').removeClassName('loading');
	}.bind(this);
	// Catches a 403. This is thrown if the status is alrady favorited. If that's the case just show the start anyway
	Twitter.favorite(this.tweetInfo.id, {onSuccess: successFunction, onFail: {status: 403, functionToCall: successFunction}});
}

TweetViewAssistant.prototype.unfavorite = function(event) {
	TM.helpers.blockTaps(this);
	
	this.parentScene.timelineModel.items[this.tweetIndex].favorite = 'unfavorited';
	this.tweetInfo.favorite = 'unfavorited';
	this.parentScene.listWidget.mojo.noticeUpdatedItems(this.tweetIndex, [this.tweetInfo]);
	
	this.controller.get('divActionunfavorite').addClassName('loading');
	var successFunction = function (){
		TM.helpers.unblockTaps(this);
		this.controller.get('star').removeClassName('favorited').addClassName('unfavorited');
		this.controller.get('divSingleTweet').removeClassName('favorited').addClassName('unfavorited');
		this.controller.get('divActionunfavorite').removeClassName('loading');
	}.bind(this);
	Twitter.unfavorite(this.tweetInfo.id, {onSuccess: successFunction, onFail: {status: 403, functionToCall: successFunction}});
}

TweetViewAssistant.prototype.deleteTweet = function(event) {
	TM.helpers.blockTaps(this);
	Mojo.Log.info('Deleting tweet');
	this.controller.get('divActiondelete').addClassName('loading');
	var successfulDelete = (function (transport, status){
	  TM.helpers.unblockTaps(this);
	  if (status == 403) {
	    Mojo.Controller.getAppController().showBanner({messageText: "Can't delete other people's status", icon: 'x-mini-icon.png'}, '', '');
	    this.controller.stageController.popScene();
	  } else {
	    this.controller.stageController.popScene({'deleted': this.tweetIndex});
	  }
	}).bind(this);
	if (this.tweetInfo.type === 'message') {
	  Twitter.deleteMessage(this.tweetInfo.id, {onSuccess: successfulDelete, onFail: {status: [403, 404], functionToCall: successfulDelete}});
	}	else {
  	Twitter.deleteStatus(this.tweetInfo.id, {onSuccess: successfulDelete, onFail: {status: 404, functionToCall: successfulDelete}});
  }
}

TweetViewAssistant.prototype.pushUser = function (event){
  this.controller.stageController.pushScene('user-info', event.target.getAttribute("username"));
}

TweetViewAssistant.prototype.pushSearch = function (event){
	this.controller.stageController.pushScene('search-results', event.target.getAttribute("hashtag"));
}

/*
TweetViewAssistant.prototype.handleCommand = function (event){
	Mojo.Log.info('handleCommand event');
	Mojo.Log.logProperties(event);
	if (event.type === 'mojo-back' && this.tweetInfo.deleted) {
		event.preventDefault();
		event.stopPropagation();
		Mojo.Log.info('Tweet was deleted');
		this.controller.stageController.popScene({'deleted': this.tweetIndex});
	}
}

//TODO setup aboutToActivate so the content doesn't flicker in. Nevermind, slows it down too much
TweetViewAssistant.prototype.aboutToActivate = function (){
	
}
*/

TweetViewAssistant.prototype.activate = function (event){
//	this.controller.get('divSingleTweet').addClassName('appear');
	TM.helpers.setupUsernamesAndHashTags.call(this);
	if (this.tweetInfo.imageUrl) {
	  this.controller.get('divPhotoThumbnailWrapper').style.display = 'block';
	  Mojo.Log.info('Metadata for this tweet is', this.tweetInfo.metadata);
	}
	if (event && event.command === 'show-sharing-options') {
	  this.showSharingOptions();
	}
}


TweetViewAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	for (var i = 0; i < this.tappableUsernames.length; i++) {
		this.controller.stopListening(this.tappableUsernames[i], Mojo.Event.tap, this.pushUserHandler);
	}
	for (var i = 0; i < this.tappableHashtags.length; i++) {
		this.controller.stopListening(this.tappableHashtags[i], Mojo.Event.tap, this.pushSearchHandler);
	}
}

TweetViewAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
  // Removes these properties because they're only useful for the tweet-view and will slow down list scrolling in the main timeline view if left there
  delete this.tweetInfo['formattedText'];
  delete this.tweetInfo['prettyLongTime'];
  Mojo.Controller.getAppController().removeBanner('sharing-options');
  this.controller.stopListening(this.bigAvatar, Mojo.Event.tap, this.enlargeProfilePic.bind(this));
	this.controller.stopListening('divImageWrapper', Mojo.Event.tap, this.thumbnailTappedHandler);
	this.controller.stopListening("divActions", Mojo.Event.listTap, this.actionTapHandler);
	this.controller.stopListening("divInfoButton", Mojo.Event.tap, this.infoTapHandler);
	delete this.originalTweetInfo;
	delete this.bigAvatar
	delete this.userHeader;
	delete this.parentScene;
	TM.helpers.closeStage();
}
