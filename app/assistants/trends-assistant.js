function TrendsAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

TrendsAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	TM.helpers.setupDefaultMenu.call(this);
	TM.helpers.setupBaseLayout.bind(this, 'trends')();
	
	this.currentTrendsModel = { items: [] };
	this.controller.setupWidget("listWidget",
		{ 
			itemTemplate: "partials/regular-list-item", 
			swipeToDelete: false, 
			hasNoWidget: true,
			fixedHeightItems: true,
			reorderable: false,
			renderLimit: 30,
			lookahead: 20
		}, 
		this.currentTrendsModel);
	
	this.showTrendHandler = this.showTrend.bindAsEventListener(this);
	this.controller.listen('listWidget', Mojo.Event.listTap, this.showTrendHandler);
	
	this.successfulFetchHandler = this.successfulFetch.bind(this);
	var request = new Ajax.Request("http://letsbetrends.com/api/current_trends", {
		method: 'get',
		evalJSON: "force",       
		onSuccess: this.successfulFetchHandler//,
//		onFailure: this.failedRequest.bind(this, opts.onFail)
	});
}

TrendsAssistant.prototype.successfulFetch = function (transport){
	Mojo.Log.info('Successfully fetched current trends and descriptions');
	this.controller.get('divBigLoader').addClassName('pop');
	this.currentTrendsModel.items = transport.responseJSON.trends;
	this.controller.modelChanged(this.currentTrendsModel);
}

TrendsAssistant.prototype.showTrend = function (event){
	Mojo.Log.info('Query is', event.item.query);
	var description = undefined;
	if (event.item.description) {
		description = event.item.description.text;
	}
	this.controller.stageController.pushScene('search-results', event.item.query, 'trends', description);
}

TrendsAssistant.prototype.handleCommand = function (event){
	TM.helpers.handleCommand.bind(this, event)();
}

TrendsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	this.controller.get('divBigLoader').addClassName('show');
	TM.helpers.handleActivate.call(this, event);
}

TrendsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

TrendsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	TM.helpers.defaultCleanup.call(this);
}
