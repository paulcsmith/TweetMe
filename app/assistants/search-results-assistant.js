function SearchResultsAssistant(query, icon, whatsThis) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	this.originalQuery = query;
	if (icon === 'trends') {
		this.query  = query.gsub(/#/, '');
		this.lighterText = '';
	}
	else {
		this.query  = '"' + query + '"';
		this.lighterText = 'results';
	}
	if (!Object.isUndefined(whatsThis)) {
		this.whatsThis = TM.helpers.autoFormat(TM.helpers.stripTags(whatsThis)); //Formats @usernames, links etc.
		this.hasWhatsThis = 'has-whats-this';
	}
	this.icon = icon || 'search';
	this.isWhatsThisClosed = true;
	Mojo.Log.info('whats this is...', whatsThis);
}

SearchResultsAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	TM.helpers.setupDefaultMenu.call(this);
	var shortHeader = Mojo.View.render({object: {icon: this.icon, mainText: this.query, lighterText: this.lighterText, hasWhatsThis: this.hasWhatsThis, whatsThis: this.whatsThis}, template: 'partials/short-header'});
	this.controller.get('divShortHeader').innerHTML = shortHeader;
	
	var baseLayout = Mojo.View.render({template: 'partials/base-layout'});
	this.controller.get('divBaseLayout').innerHTML = baseLayout;
	this.controller.get('divNavActionsWrapper').remove();
	TM.helpers.setupBaseTimeline.call(this);
	this.successfulFetchHandler = TM.helpers.successfulFetch.bind(this);
	Mojo.Log.info('Search query is', this.originalQuery);
	Twitter.searchTwitter(this.originalQuery, {onSuccess: this.successfulFetchHandler}, {rpp: TM.prefs.numTweetsToLoad}); // since_id is included because sometimes the search api bugs out and requires since_id to be zero or it does weird stuff like using some arbitrary number for the since_id. 
	this.handleSearch403s = true;
	this.twitterFunction = Twitter.searchTwitter.curry(this.originalQuery); // TODO: Check. Not sure if this is even needed.
	this.descriptionContainer = this.controller.get('divHeaderDescription');
	
	this.toggleWhatsThisHandler = this.toggleWhatsThis.bind(this);
	this.divWhatsThis = this.controller.get('divWhatsThis');
	this.controller.listen(this.divWhatsThis, Mojo.Event.tap, this.toggleWhatsThisHandler);
}

SearchResultsAssistant.prototype.toggleWhatsThis = function (){
	Mojo.Log.info("Toggling what's this");
	if (this.isWhatsThisClosed) {
		this.divWhatsThis.addClassName('selected');
		var height = this.descriptionContainer.firstDescendant().offsetHeight + 11; // was 11
		Mojo.Log.info('Height of paragraph is', height);
		this.descriptionContainer.style.height = height + 'px';
		this.isWhatsThisClosed = false;
	}
	else {
		this.divWhatsThis.removeClassName('selected');
		this.descriptionContainer.style.height = '0px';
		this.isWhatsThisClosed = true;
	}
}

SearchResultsAssistant.prototype.pushUser = function (event){
	this.controller.stageController.pushScene('user-info', event.target.getAttribute("username"));
}

SearchResultsAssistant.prototype.pushSearch = function (event){
	this.controller.stageController.pushScene('search-results', event.target.getAttribute("hashtag"));
}

SearchResultsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	TM.helpers.handleActivate.call(this, event);
	TM.helpers.setupUsernamesAndHashTags.call(this); //in case there are usernames or hastags in the description
	this.controller.get('divBigLoader').addClassName('show');
}


SearchResultsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

SearchResultsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	TM.helpers.closeStage();
}
