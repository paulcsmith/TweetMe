function ComposeAssistant(startTweetWith, opts) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	if (startTweetWith) {
	    this.startTweetWith = startTweetWith;
	} else {
    	this.startTweetWith = '';
  }
  opts = opts || {};
  this.opts = opts;
  if (this.opts.draft) {
    this.opts.in_reply_to_status_id = this.opts.draft.in_reply_to_status_id;
  }
  this.opts.inReplyToTweet = opts.inReplyToTweet;
  this.draftKey = new Date().toUTCString();
  if (this.opts.draft) {
    Mojo.Log.info('Draft key is', this.opts.draft.key);
    this.draftKey = this.opts.draft.key;
    this.inReplyToUser = this.opts.draft.inReplyToUser;
    this.opts.tweetInfo = this.opts.draft.tweetInfo;
    this.opts.inReplyToTweet = this.opts.draft.inReplyToTweet;
    if (this.opts.inReplyToTweet) {
      // Reparses the relative date
      this.opts.inReplyToTweet.prettyTime = DateHelper.time_ago_in_words_with_parsing(this.opts.inReplyToTweet.created_at, 'short');
    }
  }
  
  Mojo.Log.info('Draft key saved to compose view is', this.draftKey);
}

// Makes sure the scene is fully rendered. Problem is it takes too long :S
//ComposeAssistant.prototype.aboutToActivate = function (){
//
//}

ComposeAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	TM.helpers.setupDefaultMenu.call(this);
	var mainText = 'What\'s happening?';
	var lighterText = '';
	if (this.opts.tweetInfo && this.opts.tweetInfo.user) {
	  mainText = 'message:';
	  try {
	    lighterText = '@' + this.opts.tweetInfo.user.screen_name;
	  } catch (e) {}
	}
	var shortHeader = Mojo.View.render({object: {icon: 'write-tweet', mainText: mainText, lighterText: lighterText, headerClass: 'compose'}, template: 'partials/short-header'});
	this.controller.get('divShortHeader').innerHTML = shortHeader;
	try {
		var composeAvatar = Mojo.View.render({object: {userInfo: TM.prefs.userInfo}, template: 'compose/compose-avatar'});
		this.controller.get('divComposeAvatarWrapper').innerHTML = composeAvatar;
		this.buttonModel = {label: $L('Tweet'), disabled: false};
		this.controller.setupWidget("tweet-button", {}, this.buttonModel);
	} catch (e) {
		Mojo.Controller.errorDialog(e,  this.controller.window);
	}
	
	this.composeArea = this.controller.get('composeTextArea');
	this.pencilIcon = this.controller.get('divShortHeaderIcon');
	this.charCounter = this.controller.get('divCharCounter');
	this.headerText = this.controller.get('divShortHeaderText');
	this.sendButton = this.controller.get('divButtonWrapper');
	this.sendTweetHandler = this.sendTweet.bind(this);
	this.controller.listen(this.sendButton, Mojo.Event.tap, this.sendTweetHandler);
	this.updateCharsHandler = this.updateCharCountDeferred.bindAsEventListener(this);
	
	// Changes text to say 'send message' instead of tweet this
	if (this.opts.tweetInfo && this.opts.tweetInfo.type === 'message') {
	  this.sendButton.addClassName('message');
	}
	
	// Must use all of these events, because the property change event is not supported with regular textareas.
	// The reason a regular text area is used is because the Mojo TextFields are way too hard to style, and because I wanted to make mine grow with an animation
	// Could make it grow with the Mojo TextField widget, by just setting a css transition property, but not worth the hassle to try to style the thing
	this.controller.listen(this.composeArea, 'keydown', this.updateCharsHandler);
	this.controller.listen(this.composeArea, 'cut', this.updateCharsHandler);
	this.controller.listen(this.composeArea, 'paste', this.updateCharsHandler);
	this.controller.listen(this.composeArea, 'keypress', this.updateCharsHandler);
	
	// Saves the draft on deactivate, cleanup will just show a message because it cleans up the window before the async save request is finished :C
	this.saveDraftOnDeactivate = this.saveDraft.bind(this, false);
	this.controller.listen(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.saveDraftOnDeactivate);
	Widget.autoResize.bind(this, this.composeArea)();
	this.composeArea.value = this.startTweetWith;
	this.composeArea.value = this.startTweetWith; // Does it twice to remove a weird bug where scrolling immediately by holding the orange key adds a weird "H" character at the end
	this.setupActions();
	
	if (this.startTweetWith.length > 0 ) {
	  this.updateCharCount();
		if (this.startTweetWith.startsWith('RT ')) {
	  		Mojo.Controller.getAppController().showBanner({messageText: 'Tap here for other sharing options'}, {action: 'show-sharing-options'}, 'sharing-options');
		}
	}
	// Sets up a Spaz File Uploader for uploading...images
	this.SFU = new SpazFileUploader();
	this.setupInReplyToTweet();
	
	// for Add Location
	var defaultList = [];
	this.locationSelectorModel = {
	   value: 0,
	   choices: defaultList
	};
	this.controller.setupWidget('locationPicker', {}, this.locationSelectorModel);
	this.attachLocationTapHandler = this.attachLocation.bindAsEventListener(this);
	Mojo.Event.listen(this.controller.get("locationPicker"), Mojo.Event.propertyChange, this.attachLocationTapHandler);
};

ComposeAssistant.prototype.setupInReplyToTweet = function (){
  this.inReplyToTweetWrapper = this.controller.get('divInReplyToTweetWrapper');
  if (this.opts.inReplyToTweet) {
    try{
      this.inReplyToTweetWrapper.style.display = 'block';
      var tweet = Mojo.View.render({object: this.opts.inReplyToTweet, template: 'partials/timeline-row'});
      this.controller.get('divTweetWrapper').innerHTML = tweet;
      this.inReplyToTweetWrapper.style.display = 'block';
      this.controller.stageController.document.getElementsByClassName('tweet')[0].removeAttribute('x-mojo-tap-highlight');
      this.screennames = TM.helpers.getTwitterScreennames(this.opts.inReplyToTweet.text);
      Mojo.Log.info('this.screennames are:', this.screennames);
      if (this.screennames && this.screennames.length && this.screennames.length >= 2) {
        Mojo.Controller.getAppController().showBanner({messageText: 'Tap here to reply to all ' + (this.screennames.length + 1) + ' people' }, {action: 'reply-to-all'}, 'reply-to-all');
      } else if (this.screennames && this.screennames.length && this.screennames.length >= 1) {
        Mojo.Controller.getAppController().showBanner({messageText: 'Tap here to add ' + this.screennames[0] }, {action: 'reply-to-all'}, 'reply-to-all');
      }
    } catch(e) {
      Mojo.Log.error("Couldn't setup in reply to tweet");
      Mojo.Log.error(e);
    }
  }
}

ComposeAssistant.prototype.handleCommand = function (event){
	if (event.type == "mojo-back") {
	  event.preventDefault();
	  event.stopPropagation();
    this.saveDraft.call(this, false);
    var popSceneObject;
    if (!Object.isUndefined(this.draft)) {
      Mojo.Log.info('Key should be', this.draftKey);
      Mojo.Log.info('Key is', this.draft.key);
      popSceneObject = {addDraft: Object.clone(this.draft), oldIndex: this.opts.draftIndex};
    }
    this.controller.stageController.popScene(popSceneObject);
  }
}

// @param showMessage {boolean}
ComposeAssistant.prototype.saveDraft = function (showMessage){
  try {
    if (this.composeArea.value.length > 0 && this.composeArea.value !== this.startTweetWith && this.tweetBeingSent !== true && this.deletingDraft !== true) {
      this.draft = {key: this.draftKey, isDraft: true, created_at: new Date().toUTCString(), text: this.composeArea.value, user: TM.prefs.userInfo, tweetInfo: this.opts.tweetInfo, in_reply_to_status_id: this.opts.in_reply_to_status_id, inReplyToTweet: this.opts.inReplyToTweet};
      Data.drafts.save(this.draft);
      if (showMessage !== false) {
        Mojo.Controller.getAppController().showBanner('Draft saved. Tap here to delete it', {deleteDraftKey: this.draftKey}, 'drafts');      
      }
      Mojo.Log.info('Key used to save the draft is', this.draftKey);
    }
  } catch (e) {
    Mojo.Log.info("Couldn't save the draft");
    Mojo.Log.info(e);
    TM.helpers.debug(e, 'the error when trying to save the draft');
  }
}

// Must be deferred before counting or else the value that it retrieves is incorrect. There must be a better way to do this, but it works well for now
ComposeAssistant.prototype.updateCharCountDeferred = function (event){
//    if (event && event.originalEvent && event.originalEvent.keyCode) {
        //Mojo.Log.error('Event object is:', Object.inspect($H(event)));
//    }
  if (TM.prefs.postOnEnter === true && event && event.keyCode && Mojo.Char.isEnterKey(event.keyCode)) {
    event.preventDefault();
    event.stopPropagation();
    this.sendTweet();
    return
  } else {
    this.updateCharCount.bind(this).defer();
  }
}

// The function that actually does the counting
ComposeAssistant.prototype.updateCharCount = function (){
   var length = this.composeArea.value.length;
   // Shows or hides the counter
   if (length <= 0) {
       // Removes counter
       this.charCounter.removeClassName('show');
       this.pencilIcon.removeClassName('hide');
       this.headerText.removeClassName('slide-over');
   } else if (length >= 1 && !this.pencilIcon.hasClassName('hide')) {
       // Shows the counter
       this.pencilIcon.addClassName('hide');
       this.charCounter.addClassName('show');
       this.headerText.addClassName('slide-over');
   }
   // Sets the counter
   if (length > 0) {
       this.charCounter.innerHTML = 140 - length;
   } 
   // Changes the counter to red when it gets near the limit or is past the limit
   if (length > 115 && !this.charCounter.hasClassName('orange')) {
//       Mojo.Log.error('Should change to RED');
       this.charCounter.addClassName('orange');
   } else if (length <= 115 && this.charCounter.hasClassName('orange')) {
       this.charCounter.removeClassName('orange');
   }
   if (length > 140) {
       this.sendButton.addClassName('disable');
       this.charCounter.addClassName('red');
   } else if (length <= 140 && this.sendButton.hasClassName('disable')) {
       this.sendButton.removeClassName('disable');
       this.charCounter.removeClassName('red');
   }
}

ComposeAssistant.prototype.setupActions = function (){
	this.attachPhotoHandler = this.choosePhoto.bind(this);
	this.addLocationHandler = this.addLocation.bind(this);
	this.shortenLinksHandler = this.shortenLinks.bind(this);
	this.deleteDraftHandler = this.deleteDraft.bind(this, true);
	var actions = [
		{text: 'Attach Photo', class: 'attach-photo', onTap: this.attachPhotoHandler},
		{text: 'Shorten Links', class: 'shorten-links', onTap: this.shortenLinksHandler},
		{text: 'Add Location', class: 'add-location', onTap: this.addLocationHandler},
	];
	if (this.opts.draft) {
	  actions.push({text: 'Delete Draft', class: 'delete', onTap: this.deleteDraftHandler});
	}
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

ComposeAssistant.prototype.actionTapped = function (event){
	event.item.onTap();
}

/**
 * opens the file picker for images, and passes a callback to change the post scene state to reflect
 * the new "email and image" mode 
 * Original params were posting_address, message, filepath
 */
ComposeAssistant.prototype.choosePhoto = function() {
  if (this.attachingPhoto !== true) {
    var params = {
        kinds: ['image'],
        actionType: 'attach',
        onSelect: this.uploadPhoto.bind(this)
    };
    Mojo.FilePicker.pickFile(params, this.controller.stageController);
  }
};

// Actually uploads the photo and inserts the image url
ComposeAssistant.prototype.uploadPhoto = function (file){
  TM.helpers.debug(file, 'File object');
  this.focusComposeArea();
	this.attachmentPath = file.fullPath;
	this.attachmentIconPath = file.iconPath;
	
	//Upload the photo immediately
	this.SFU.setAPI('twitpic');
	// If it's the pikchur uploader do some pikchur specific stuff
//	if (this.imageUploaderModel['image-uploader'] === 'pikchur') {
//		this.SFU.setAPIKey(sc.app.prefs.get('services-pikchur-apikey'));
//		source = sc.app.prefs.get('services-pikchur-source');
//	}
  this.attachingPhoto = true;
	this.SFU.upload(this.attachmentPath, {
		'username' : TM.prefs.username,
		'password' : TM.prefs.password,
		//'source'   : source,
		//'message'  : status,
		'platform' : {
			'sceneAssistant' : this
		},
		'onComplete': function (event, data){
		  Mojo.Log.info('Completely uploaded');
		  Mojo.Log.info('URL returned is', data.url);
		  this.controller.get('divActionattach-photo').removeClassName('loading');
		  TM.helpers.debug(data, 'event data');
		  this.composeArea.value = this.composeArea.value + ' ' + data.url;
		  this.focusComposeArea(data.url.length + 1);
		  this.updateCharCountDeferred();
		  this.attachingPhoto = false;
		}.bind(this),
		'onFailure': function (event, data){
		  Mojo.Log.info('Failed uploaded');
		  this.controller.get('divActionattach-photo').removeClassName('loading');
		  Mojo.Controller.getAppController().showBanner('Photo failed to upload. Try again.', '', '');
		  TM.helpers.debug(event);
		}.bind(this),
		'onStart': function (event, data){
		  //this.composeArea.blur(); // TODO: Get this working when the upload starts and not just whenever you hit attach photo so that if you backswipe without attaching you can tye where you left off.
		  this.focusComposeArea();
		  this.controller.get('divActionattach-photo').addClassName('loading');
		}.bind(this)
	});
	
	this.returningFromFilePicker = true;
}

ComposeAssistant.prototype.addLocation = function () {
	this.geoData = {};
	this.controller.get('divActionadd-location').addClassName('loading');
	this.controller.get('divActionadd-location').getElementsByTagName('span')[0].innerHTML = 'Getting GPS data...';
	
  	this.controller.serviceRequest('palm://com.palm.location', {
	    method:"getCurrentPosition",
	    parameters:{},
	    onSuccess: this.getLocationData.bind(this),
	    onFailure: function(result) {
			this.controller.get('divActionadd-location').removeClassName('loading');
			this.controller.get('divActionadd-location').getElementsByTagName('span')[0].innerHTML = 'Add Location';
			var message = Twitter.showLocationError(result.errorCode);
			Mojo.Controller.getAppController().showBanner({messageText: message, icon: "x-mini-icon.png"}, '', '');
		}.bind(this)
	});
};

ComposeAssistant.prototype.getLocationData = function(result) {
	this.geoData = {
		latitude: result.latitude, 
		longitude: result.longitude
	};
	Mojo.Log.info('GPS Data: ' + this.geoData.latitude + ' ' + this.geoData.longitude);
	
	// twitter api call
	Twitter.getPlaces(this.geoData.latitude, this.geoData.longitude, {
      	onSuccess: this.displayGeoSelector.bind(this),
		onFail: {status: [403, 404], functionToCall: this.sendLocationFailure.bind(this)}
    });
};

ComposeAssistant.prototype.sendLocationFailure = function (transport) {
	this.controller.get('divActionadd-location').removeClassName('loading');
	this.controller.get('divActionadd-location').getElementsByTagName('span')[0].innerHTML = 'Add Location';
	// twitter doesn't have a custom error msg???
  	Mojo.Controller.getAppController().showBanner({messageText: 'Invalid location', icon: 'x-mini-icon.png'}, '', '');
}

ComposeAssistant.prototype.displayGeoSelector = function (transport) {
	Mojo.Log.info('**** ', Object.keys(transport.responseJSON));
	this.controller.get('divActionadd-location').getElementsByTagName('span')[0].innerHTML = 'Getting your location...';
		
	var place_choices = [];
	var results = transport.responseJSON.result.places;
	
	for (var i=0; i<results.length; i++) {
		place_choices.push({
			value: results[i].id, 
			label: results[i].full_name
		});
		Mojo.Log.info('*** '+i+': '+place_choices[i].label);
	}
	
	this.locationSelectorModel.choices = place_choices; 
	this.locationSelectorModel.value = place_choices[0].label; 
	this.controller.modelChanged(this.locationSelectorModel);
	this.controller.get('divActionadd-location').removeClassName('loading');
	this.controller.get('divActionadd-location').style.display = 'none';
	this.controller.get('locationList').style.display = 'block';
}

ComposeAssistant.prototype.attachLocation = function(event) {
	Mojo.Log.info('**** ',event.value);
	this.geoData.placeId = event.value;
}

ComposeAssistant.prototype.shortenLinks = function(event) {
	var surl = new SpazShortURL(SPAZCORE_SHORTURL_SERVICE_BITLY);
	var longurls = TM.helpers.extractURLs(this.composeArea.value);

	/*
		check URL lengths
	*/
	var reallylongurls = [];
	for (var i=0; i<longurls.length; i++) {
		if (longurls[i].length > 21) { // only shorten links longer than 25chars
			reallylongurls.push(longurls[i]);
		}
	}
	
	
	function onShortURLSuccess(data) {
    TM.helpers.unblockTaps(this);
    this.controller.get('divActionshorten-links').removeClassName('loading');
		Mojo.Log.info('Data to be passed and replaced is', Object.inspect($H(data)));
		this.composeArea.value = TM.helpers.replaceMultiple(this.composeArea.value, data);
		this.focusComposeArea();
		this.updateCharCountDeferred();
	}
	
	if (reallylongurls.length > 0) {
	    TM.helpers.blockTaps(this);
	    this.composeArea.blur();
	    this.controller.get('divActionshorten-links').addClassName('loading');
		surl.shorten(reallylongurls, {
			apiopts: {
				'version':'2.0.1',
				'format':'json',
				//'login':'spazcore',
				//'apiKey':'R_f3b86681a63a6bbefc7d8949fd915f1d'
				login: 'catalystmediastudios',
				apiKey: 'R_2a39e056c64bd66cd01f0309d18910e4'
			},
			onSuccess: onShortURLSuccess.bind(this)
		});
	} else {
	    Mojo.Controller.getAppController().showBanner({messageText: 'No links to shorten', icon: "x-mini-icon.png"}, '', '');
	}
	
};

ComposeAssistant.prototype.replyToAll = function (){
  Mojo.Log.info('Attempting to reply to all');
  Mojo.Controller.getAppController().removeBanner('reply-to-all');
  var screennameString = this.screennames.join(' ') + ' ';
  if (this.composeArea.value.endsWith(' ')) {
    this.composeArea.value += screennameString;
  } else {
    this.composeArea.value += " " + screennameString;
  }
}

// @param popSceneAndDelete {boolean} - Tells whether to pop the scene or not. Don't pop if it's already popped because tweet was sent
ComposeAssistant.prototype.deleteDraft = function (popScene){
  Data.drafts.remove(this.draftKey);
  this.deletingDraft = true;
  Mojo.Log.info('Deleted draft with key', this.draftKey);
  if (popScene === true) {
    this.controller.stageController.popScene({'deleted': this.opts.draftIndex});
  }
}

ComposeAssistant.prototype.sendTweet = function (){
	var tweet = {};
    tweet.status = this.composeArea.value;

	// location data
	if (this.geoData) {
		tweet.lat = this.geoData.latitude;
		tweet.long = this.geoData.longitude;
		tweet.display_coordinates = true;
		tweet.place_id = this.geoData.placeId;
			Mojo.Log.info('****',tweet.place_id);
	}

    if (this.tweetBeingSent !== true && this.attachingPhoto !== true) {
      	if (tweet.status.length <= 140 && tweet.status.length != 0) {
	    	this.tweetSentHandler = this.tweetSent.bind(this);
		    //this.sendButton.addClassName('show-loader');
		    //TM.helpers.blockTaps(this);
			
	    if (this.opts.tweetInfo && this.opts.tweetInfo.type === 'message') {
	     	 // Send direct message
		      Mojo.Log.info('Status to post to message is', status);
		      Twitter.sendMessage(tweet, this.opts.tweetInfo.user.screen_name, {
		        onSuccess: this.tweetSentHandler.curry('Message'),
		        onFail: {status: [403, 404], functionToCall: this.sendDMFailure.bind(this)}
		      });
		      Mojo.Controller.getAppController().showBanner({messageText: 'Sending message...'}, '', 'sending');
	    } else {
	      	// Send regular status
		      Twitter.sendTweet(tweet, {
		          onSuccess: this.tweetSentHandler.curry('Tweet'),
		          onFail: {status: 403, functionToCall: this.sendFailure.bind(this)}
		        },
		        {in_reply_to_status_id: this.opts.in_reply_to_status_id});
		      Mojo.Controller.getAppController().showBanner({messageText: 'Sending tweet...'}, '', 'sending');
	    }

          this.saveDraft(false); // Saves draft in case connection drops, phone blows up, etc. Delete draft when successful response is returned.
          this.tweetBeingSent = true;
          this.popComposeScene();
      }
      else if (status.length > 140) {
          Mojo.Controller.getAppController().showBanner({messageText: 'Tweet is too big', icon: "x-mini-icon.png"}, '', '');
          this.focusComposeArea();
      } 
      else {
          Mojo.Controller.getAppController().showBanner({messageText: 'Type something first', icon: "x-mini-icon.png"}, '', '');
          this.focusComposeArea();
      }
    } else if (this.attachingPhoto === true) {
      Mojo.Controller.getAppController().showBanner('Attaching a photo. Try when done.', '', '');
    } else {
      Mojo.Controller.getAppController().showBanner('Tweet already being sent.', '', '');
    }
}

ComposeAssistant.prototype.popComposeScene = function (){
  // If we passed in a draft then make sure to remove the draft from the draft view.
  var popSceneObject;
  Mojo.Log.info('Draft index is', this.opts.draftIndex);
  if (!Object.isUndefined(this.opts.draftIndex)) {
    popSceneObject = {'deleted': this.opts.draftIndex, sent: true};
  }
  var scenes = this.controller.stageController.getScenes();
  Mojo.Log.info('Length of scenes', scenes.length);
  // TM.helpers.debug(scenes.slice(scenes.length - 2, scenes.length - 1)[0], '!!!!second to last scene');
  // If you are replying from a tweet view scene pop back two scenes
  if (scenes.length >= 3 && scenes.slice(scenes.length - 2, scenes.length - 1)[0].sceneName === 'tweet-view') {
    this.controller.stageController.popScenesTo(scenes.slice(scenes.length - 3, scenes.length - 2)[0].sceneName,popSceneObject);
  } else {
    this.controller.stageController.popScene(popSceneObject);
  }
}

// Called when the tweet was successfully sent
// @param {String} what type of message was sent. Could be 'Tweet', 'Message', 'Reply', etc.
ComposeAssistant.prototype.tweetSent = function (whatWasSent, transport){
  if (transport.responseJSON.user) {
    TM.prefs.userInfo = transport.responseJSON.user;
    TM.prefStorage.storePrefs();
  } else if (transport.responseJSON.sender) {
    TM.prefs.userInfo = transport.responseJSON.sender;
    TM.prefStorage.storePrefs();
  }
  Mojo.Controller.getAppController().showBanner({messageText: whatWasSent + ' sent', icon: "checkmark-mini-icon.png"}, '', 'sending');
  //this.sendButton.removeClassName('show-loader');
  Data.drafts.remove(this.draftKey);
  //TM.helpers.unblockTaps(this);
  //this.popComposeScene();
}

ComposeAssistant.prototype.sendDMFailure = function (transport, status){
  this.tweetBeingSent = false;
  Mojo.Controller.getAppController().removeBanner('sending');
  if (status == 403) {
    // Usually because the user is not following you
    Mojo.Controller.errorDialog(transport.responseJSON.error + " Your message was saved to drafts for later.",  Mojo.Controller.getAppController().getStageController('TweetMe').topScene().window); // this.controller.window
    Mojo.Controller.getAppController().showBanner({messageText: "Message saved to drafts for later."}, '', '');
    //TM.helpers.unblockTaps(this);
  } else {
    Mojo.Controller.getAppController().showBanner({messageText: "User doesn't exist. Try another.", icon: 'x-mini-icon.png'}, '', '');
    //TM.helpers.unblockTaps(this);
    Mojo.Log.info('About to push the go-to-user scene');
    try {
      Mojo.Controller.getAppController().getStageController('TweetMe').pushScene('go-to-user', {showDirectMessage: true, defaultUser: this.opts.tweetInfo.user.screen_name, startTweetWith: this.composeArea.value});
    } catch(e) {
      Mojo.Log.error(e.stack);
    }
    Data.drafts.remove(this.draftKey);
  }
  //TM.helpers.unblockTaps(this);
  //this.sendButton.removeClassName('show-loader');
}

// Usually because of duplicates
ComposeAssistant.prototype.sendFailure = function (transport){
  //this.tweetBeingSent = false;
  //this.sendButton.removeClassName('show-loader');
  Mojo.Controller.getAppController().showBanner({messageText: transport.responseJSON.error, icon: 'x-mini-icon.png'}, '', '');
  //TM.helpers.unblockTaps(this);
}

ComposeAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	this.focusComposeArea();
};


// If there is text it will make sure the cursor goes after the text
ComposeAssistant.prototype.focusComposeArea = function (subtractFromEnd){
  if (Object.isUndefined(subtractFromEnd)) {
    subtractFromEnd = 0;
  }
  // Sets focus to the end of the text, if there is text
  this.composeArea.focus();
  if (this.composeArea.value && this.composeArea.value.length > 0) {
    this.composeArea.selectionStart = this.composeArea.value.length;
    this.composeArea.selectionEnd = this.composeArea.value.length - subtractFromEnd;
  }
}

ComposeAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

ComposeAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	this.controller.stopListening('divButtonWrapper', Mojo.Event.tap, this.sendTweetHandler);
	this.controller.stopListening(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.saveDraftOnDeactivate);
	this.controller.stopListening(this.sendButton, Mojo.Event.tap, this.sendTweetHandler);
	this.controller.stopListening(this.composeArea, 'keydown', this.updateCharsHandler);
	this.controller.stopListening(this.composeArea, 'cut', this.updateCharsHandler);
	this.controller.stopListening(this.composeArea, 'paste', this.updateCharsHandler);
	this.controller.stopListening(this.composeArea, 'keypress', this.updateCharsHandler);
	// If the stage has been flicked off
//	if (!TM.helpers.isStageActive()) {
    this.saveDraft();
//	}
  Mojo.Controller.getAppController().removeBanner('reply-to-all');
  TM.helpers.closeStage.call(this);
};
