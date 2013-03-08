function ConversationAssistant(originalTweetInfo) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	this.originalTweetInfo = originalTweetInfo;
}

ConversationAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	TM.helpers.setupDefaultMenu.call(this);
	var shortHeader = Mojo.View.render({object: {icon: 'show-conversation', mainText: 'Twitter Conversation'}, template: 'partials/short-header'});
	this.controller.get('divShortHeader').innerHTML = shortHeader;
	var baseLayout = Mojo.View.render({template: 'partials/base-layout'});
	this.controller.get('divBaseLayout').innerHTML = baseLayout;
	this.controller.get('divNavActionsWrapper').remove();
	TM.helpers.setupBaseTimeline.call(this);
	this.tweets = [this.originalTweetInfo];
	this.timelineModel.items = TM.helpers.filterTweets(this.tweets);
	this.tweetsAdded = 0;
	// Remember on actvate it shows the first tweet
	var replyToId = this.originalTweetInfo.in_reply_to_status_id;
	this.addStatusToThreadHandler = this.addStatusToThread.bind(this);
	Mojo.Log.info('Getting the first "in reply to" tweet');
	Twitter.getTweet(replyToId, {onSuccess: this.addStatusToThreadHandler, onFail: {status: 404, functionToCall: this.setupConversationTimeline.bind(this, true)}});
};

// Shows the newest tweet
ConversationAssistant.prototype.showNewestTweet = function (){
  Mojo.Log.info('Tweet to show', this.tweetsAdded);
  this.listWidget.mojo.getNodeByIndex(this.tweetsAdded).addClassName('show');
}

ConversationAssistant.prototype.addStatusToThread = function(transport) {
	var tweetInfo = transport.responseJSON;
	this.tweets.push(tweetInfo);
	if (tweetInfo.in_reply_to_status_id) {
	  Twitter.getTweet(tweetInfo.in_reply_to_status_id, {onSuccess: this.addStatusToThread.bind(this), onFail: {status: 404, functionToCall: this.setupConversationTimeline.bind(this, true)}});
	} else {
	  this.setupConversationTimeline();
	}
	this.timelineModel.items = TM.helpers.filterTweets(this.tweets);
	this.listWidget.mojo.noticeUpdatedItems(this.tweetsAdded, this.timelineModel.items.slice(this.tweetsAdded));
	this.showNewestTweet();
	this.tweetsAdded += 1;
};

// @param atLeastOneTweetDeleted {boolean} pass true if one of the tweets was deleted to inform the user of that fact. That way if there is just one tweet they know why.
ConversationAssistant.prototype.setupConversationTimeline = function(atLeastOneTweetDeleted) {
  if (atLeastOneTweetDeleted === true) { // TODO: Consider adding this back:  &&  this.tweets <= 1 so that it only displays the alert if there's just one tweet
//    Mojo.Controller.getAppController().showBanner('1 or more tweets no longer exist.', '', '');
//    Mojo.Controller.getAppController().showBanner('Last posted tweet no longer exists', '', '');
    this.controller.get('divTweetsNoLongerExist').style.display = 'block';
  }
  this.controller.get('divBigLoader').addClassName('pop');
  this.controller.get('divLoadingConversation').style.display = 'none';
	//this.timelineModel.items = TM.helpers.filterTweets(this.tweets);
	// this.listWidget.mojo.noticeUpdatedItems(0, this.timelineModel.items);
	//this.controller.modelChanged(this.timelineModel);
	Mojo.Log.info('Should have changed the model for the timeline');
	//TM.helpers.setupPolledReparseDatesForTimeline.call(this); // Don't reparse. Convo views are usually not open long enough to warrant this
};

ConversationAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	TM.helpers.handleActivate.call(this, event);
	this.showNewestTweet();
	this.tweetsAdded += 1;
	this.controller.get('divLoadingConversation').style.display = 'block';
	// this.controller.get('divBigLoader').addClassName('show');
};

ConversationAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

ConversationAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
};
