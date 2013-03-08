function ListsAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

ListsAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	TM.helpers.setupDefaultMenu.call(this);
	var shortHeader = Mojo.View.render({object: {icon: 'lists', mainText: 'Your Lists'}, template: 'partials/short-header'});
	this.controller.get('divShortHeader').innerHTML = shortHeader;
	TM.helpers.setupBaseLayout.call(this, 'lists');
	
	this.listsModel = { items: [] };
	this.controller.setupWidget("listWidget",
		{ 
		  listTemplate: "lists/list-template",
			itemTemplate: "lists/list-item", 
			swipeToDelete: false, 
			reorderable: false,
			hasNoWidget: true,
			fixedHeightItems: true,
			renderLimit: 30,
			lookahead: 20
		}, 
		this.listsModel);
	this.pushListTweetsHandler = this.pushListTweets.bindAsEventListener(this);
	this.controller.listen('listWidget', Mojo.Event.listTap, this.pushListTweetsHandler);
	
	this.successfulFetchHandler = this.successfulFetch.bind(this);
	Twitter.myLists({onSuccess: this.successfulFetchHandler});
	
	this.loader = this.controller.get('divBigLoader');
};

ListsAssistant.prototype.successfulFetch = function (transport){
  Mojo.Log.info('Sucessfully fetched');
  this.loader.addClassName('pop');
  // TM.helpers.debug(Object.clone(transport.responseJSON.lists.last()), 'My lists::::');
  this.listsModel.items = this.filterLists(transport.responseJSON.lists);
  Mojo.Log.info('Lists filtered');
  // TM.helpers.debug(this.listsModel.items[0], 'First item');
  this.controller.modelChanged(this.listsModel);
  // Get lists I follow
  this.listIFollowLoader = this.controller.get('divLoadingListIFollow');
  this.listIFollowLoader.style.display = 'block';
  this.ListIFollowFetchHandler = this.successfulListIFollowFetch.bind(this);
  Twitter.listsIFollow({onSuccess: this.ListIFollowFetchHandler});
}

ListsAssistant.prototype.successfulListIFollowFetch = function (transport){
  Mojo.Log.info('Attempting to add the lists that I follow');
  this.listIFollowLoader.style.display = 'none';
  var filteredLists = this.filterLists(transport.responseJSON.lists);
  this.listsModel.items.push.apply(this.listsModel.items, filteredLists);
  this.listWidget.mojo.noticeUpdatedItems(0, this.listsModel.items);
  TM.helpers.showEmptyList.call(this, this.listsModel.items, 'Lists');
}

ListsAssistant.prototype.pushListTweets = function (event){
  this.controller.stageController.pushScene('list-tweets', event.item.id, event.item.user.screen_name, event.item.full_name);
}

// Any processing I want to do on the list
ListsAssistant.prototype.filterLists = function (lists){
  for (var i = 0; i < lists.length; i++) {
    lists[i].list_name = lists[i].full_name;
  }
  return lists
}

ListsAssistant.prototype.handleCommand = function (event){
	TM.helpers.handleCommand.bind(this, event)();
}

ListsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	TM.helpers.handleActivate.call(this, event);
	this.loader.addClassName('show');
};

ListsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

ListsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
};
