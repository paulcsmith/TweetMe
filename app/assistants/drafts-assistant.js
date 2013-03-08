function DraftsAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

DraftsAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	TM.helpers.setupDefaultMenu.call(this);
	TM.helpers.setupBaseLayout.call(this, 'drafts');
	this.timelineModel = { items: [] };
	TM.helpers.setupList.call(this);
	this.setupTimelineHandler = this.setupTimeline.bind(this);
	Data.drafts.all(function (drafts) {this.setupTimelineHandler(drafts)}.bind(this));
};

DraftsAssistant.prototype.handleCommand = function (event){
	TM.helpers.handleCommand.call(this, event);
}

// Passed an array of drafts (filteredTweets)
DraftsAssistant.prototype.setupTimeline = function (drafts){
  this.timelineModel.items = TM.helpers.filterTweets(drafts);
  Mojo.Log.info('Number of drafts is', this.timelineModel.items.length);
  this.listWidget.mojo.noticeUpdatedItems(0, this.timelineModel.items);
  TM.helpers.showEmptyList.call(this, this.timelineModel.items, 'Drafts');
  this.showDraftHandler = this.showDraft.bindAsEventListener(this);
  this.controller.listen(this.listWidget, Mojo.Event.listTap, this.showDraftHandler);
}

DraftsAssistant.prototype.showDraft = function (event){
  this.controller.stageController.pushScene('compose', TM.helpers.stripTags(event.item.text), {draft: event.item, draftIndex: event.index});
}

DraftsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	Mojo.Log.info('Event object returned to activate is', Object.inspect($H(event)));
	TM.helpers.handleActivate.call(this, event);
	if (event && event.addDraft) {
	  Mojo.Log.info('Draft key in activate is', event.addDraft.key);
	  this.timelineModel.items[event.oldIndex] = null;
	  this.timelineModel.items = this.timelineModel.items.compact();
	  this.timelineModel.items.unshift(TM.helpers.filterTweets(event.addDraft)[0]);
//	  this.listWidget.mojo.noticeUpdatedItems(0, this.timelineModel.items);
    this.controller.modelChanged(this.timelineModel);
	  TM.helpers.reparseDates.call(this);
	}
};

DraftsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

DraftsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	this.controller.stopListening(this.listWidget, Mojo.Event.listTap, this.showDraftHandler);
	TM.helpers.defaultCleanup.call(this);
};
