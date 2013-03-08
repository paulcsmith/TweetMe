function SearchAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

SearchAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	TM.helpers.setupDefaultMenu.call(this);
	TM.helpers.setupBaseLayout.call(this, 'search');
	
	this.searchModel = {value: ''};
	this.searchAttr = {
		hintText: "Type your search...",
		autoFocus: true,
		autoReplace: false,
		requiresEnterKey: true,
		textCase: Mojo.Widget.steModeLowerCase};
	this.controller.setupWidget("search-query", this.searchAttr, this.searchModel);
	this.submitHandler = this.handleSubmit.bindAsEventListener(this);
	this.controller.listen('search-query', Mojo.Event.propertyChange, this.submitHandler);
	
	this.buttonModel = {label: $L('Search'), disabled: false};
	this.controller.setupWidget("search-button", {}, this.buttonModel);
	
	this.savedSearchesModel = { items: [] };
	this.controller.setupWidget("listWidget",
		{ 
			itemTemplate: "partials/regular-list-item", 
			swipeToDelete: false, 
			reorderable: false,
			hasNoWidget: true,
			fixedHeightItems: true,
			renderLimit: 35,
			lookahead: 20
		}, 
		this.savedSearchesModel);
	
	this.showSearchResultsHandler = this.pushSearchResults.bindAsEventListener(this);
	this.controller.listen('search-button', Mojo.Event.tap, this.showSearchResultsHandler);
	
	this.successfulFetchHandler = this.successfulFetch.bind(this);
	Twitter.savedSearches({onSuccess: this.successfulFetchHandler});
}

SearchAssistant.prototype.handleSubmit = function (event) {
//	If enter is pressed, pretend the search button was tapped.
//	Remember that requiresEnterKey must be set to true in the textfield's attributes
	if (event && Mojo.Char.isEnterKey(event.originalEvent.keyCode)) {
		Mojo.Log.info('Enter was pressed');
		Event.stop(event);
		this.showSearchResultsHandler(event);
	}
}

SearchAssistant.prototype.handleCommand = function (event){
	TM.helpers.handleCommand.bind(this, event)();
}

SearchAssistant.prototype.successfulFetch = function (transport){
	this.controller.get('savedSearchLoader').addClassName('hide');
	this.savedSearchesModel.items = transport.responseJSON;
	this.controller.modelChanged(this.savedSearchesModel);
}

SearchAssistant.prototype.pushSearchResults = function(event){
	if (event.type === 'mojo-list-tap') {
	  Mojo.Log.info('Query for saerch is ..... ', event.item.query);
		this.controller.stageController.pushScene('search-results', event.item.query);
	}
	else if (this.searchModel.value.length > 0) {
	  Mojo.Log.info('Typed search query is', this.searchModel.value);
		this.controller.stageController.pushScene('search-results', this.searchModel.value);
	}
}

SearchAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	// this.pushedSavedHandler = this.pushSearchResults.bindAsEventListener(this);
	this.controller.listen('listWidget', Mojo.Event.listTap, this.showSearchResultsHandler);
	TM.helpers.handleActivate.call(this, event);
	Mojo.View.advanceFocus(this.controller.get('divEntryPane'));
}


SearchAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	this.controller.stopListening('listWidget', Mojo.Event.listTap, this.showSearchResultsHandler);
}

SearchAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	this.controller.stopListening('search-button', Mojo.Event.tap, this.showSearchResultsHandler);
	TM.helpers.defaultCleanup.call(this);
}
