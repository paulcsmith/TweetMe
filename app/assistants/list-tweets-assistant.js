function ListTweetsAssistant(listId, listScreenName, listName) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	this.listId = listId;
	this.listName = listName;
	this.listScreenName = listScreenName;
	Mojo.Log.info('List name is', this.listName);
}

ListTweetsAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
  TM.helpers.setupDefaultMenu.call(this);
  var shortHeader = Mojo.View.render({object: {icon: 'lists', mainText: this.listName}, template: 'partials/short-header'});
  this.controller.get('divShortHeader').innerHTML = shortHeader;
  
  var baseLayout = Mojo.View.render({template: 'partials/base-layout'});
  this.controller.get('divBaseLayout').innerHTML = baseLayout;
  this.controller.get('divNavActionsWrapper').remove();
  TM.helpers.setupBaseTimeline.call(this);
  this.successfulFetchHandler = TM.helpers.successfulFetch.bind(this);
  
  Twitter.getListTweets(this.listId, this.listScreenName, {onSuccess: this.successfulFetchHandler}, {per_page: TM.prefs.numTweetsToLoad});
  
  this.twitterFunction = Twitter.getListTweets.curry(this.listId, this.listScreenName); // Not sure if this is needed. Same as in search.
};

ListTweetsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	TM.helpers.handleActivate.call(this, event);
	this.controller.get('divBigLoader').addClassName('show');
};

ListTweetsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

ListTweetsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
};
