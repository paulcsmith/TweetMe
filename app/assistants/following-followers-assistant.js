function FollowingFollowersAssistant(userInfo, whichPeopleToLoad) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	this.userInfo = userInfo;
	this.whichPeopleToLoad = whichPeopleToLoad;
	Mojo.Log.info('Which people should I load?', this.whichPeopleToLoad);
}

FollowingFollowersAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	TM.helpers.setupDefaultMenu.call(this);
	this.TOP_MENU = {
	  loadFollowing: {command: 'loadFollowing', target: this.swapTo.bind(this)},
	  loadFollowers: {command: 'loadFollowers', target: this.swapTo.bind(this)}
	};
	
	this.topMenuModelItems = [
    {label:'Following/Followers List', toggleCmd: this.whichPeopleToLoad, items:[
      {label:$L('Following'), command: this.TOP_MENU.loadFollowing.command, width:160},
      {label:$L('Followers'), command: this.TOP_MENU.loadFollowers.command, width:160}
    ]}
  ]; 
	  
	this.topMenuModel = {
		visible: true,
		items: this.topMenuModelItems
	}; 
	this.controller.setupWidget(Mojo.Menu.viewMenu, {menuClass: 'no-fade'}, this.topMenuModel);
	
	this.peopleModel = {items: []};
	this.controller.setupWidget('listWidget', {
		listTemplate: 'partials/regular-list',
		itemTemplate: 'partials/person-list-item',
		renderLimit: 40,
		lookAhead: 20, //TODO: Tweak these values until I get it performing well!
		swipeToDelete: false,
		reorderable: false,
		fixedHeightItems: true,
		hasNoWidgets: true
		}, this.peopleModel);
	
	this.successfulFetchHandler = this.successfulFetch.bind(this);
	if (this.whichPeopleToLoad === this.TOP_MENU.loadFollowing.command) {
		Twitter.friends( this.userInfo.id, {onSuccess: this.successfulFetchHandler}); //, onFail: {status: 401, functionToCall: this.protectedUserHandler} 
	}
	else if (this.whichPeopleToLoad === this.TOP_MENU.loadFollowers.command) {
		Twitter.followers( this.userInfo.id, {onSuccess: this.successfulFetchHandler});
	}
	
	this.baseLayout = this.controller.get('divBaseLayout');
	this.loadButton = this.controller.get('divLoadMore');
	this.bigLoader = this.controller.get('divBigLoader');
	this.listWidget = this.controller.get('listWidget');
	
	this.pushUserHandler = this.pushUser.bind(this);
	this.controller.listen(this.listWidget, Mojo.Event.listTap, this.pushUserHandler);
	this.updateListHandler = this.updateList.bind(this);
	this.loadMoreHandler = this.loadMore.bind(this);
}

// Called when the initial request is successful
FollowingFollowersAssistant.prototype.successfulFetch = function (transport){
	this.bigLoader.addClassName('pop');
	this.peopleModel.items = transport.responseJSON.users;
	this.controller.modelChanged(this.peopleModel);
	/* Testing performance of just rendering the whole list of 100 all at once. 
	this.peopleHTML = '<div class="palm-list">';
	for (var i = 0; i < this.peopleModel.items.length; i++) {
	  this.peopleHTML += Mojo.View.render({object: this.peopleModel.items[i], template: 'partials/person-list-item'});
	}
	this.peopleHTML += '</div>';
	this.controller.get('listWidget').innerHTML = this.peopleHTML;
	*/
	this.nextCursor = transport.responseJSON.next_cursor;
	this.setupLoadButton.call(this);
}

// Updates lists, sets the next cursor value and sets up the load more button
FollowingFollowersAssistant.prototype.updateList = function (transport){
	this.loadButton.removeClassName('selected');	
	this.peopleModel.items.push.apply(this.peopleModel.items, transport.responseJSON.users);
	this.listWidget.mojo.noticeAddedItems(this.peopleModel.items.length - 1, transport.responseJSON.users);
	Mojo.Log.info('Length after adding', this.peopleModel.items.length);
	this.nextCursor = transport.responseJSON.next_cursor;
	Mojo.Log.info('Next cursor is', this.nextCursor);
	TM.helpers.unblockTaps(this);
	this.setupLoadButton.call(this);
}

//  Similar to the one in twitter-helper.js, but not similar enough to warrant DRY'ing it up, at least not yet
FollowingFollowersAssistant.prototype.setupLoadButton = function (){
	if (this.nextCursor === 0) { // Hides button if there is nothing else to load
		Mojo.Log.info('On last page, nothing to load. Hide load more button');
		this.baseLayout.removeClassName('show-more');
	}
	else {
		this.baseLayout.addClassName('show-more');
		this.controller.listen(this.loadButton, Mojo.Event.tap, this.loadMoreHandler);
	}
}

// When load more is pushed it loads more people and then updates the list
FollowingFollowersAssistant.prototype.loadMore = function (){
	TM.helpers.blockTaps(this);
	this.controller.get('divLoadMore').addClassName('selected');
	if (this.whichPeopleToLoad === this.TOP_MENU.loadFollowing.command) {
		Twitter.friends( this.userInfo.id, {onSuccess: this.updateListHandler}, {cursor: this.nextCursor} );
	}
	else if (this.whichPeopleToLoad === this.TOP_MENU.loadFollowers.command) {
		Twitter.followers( this.userInfo.id, {onSuccess: this.updateListHandler}, {cursor: this.nextCursor});
	}
}

// When user is tapped it pushes to that user's info screen
FollowingFollowersAssistant.prototype.pushUser = function (event){
	Mojo.Log.info('User was pushed');
	this.controller.stageController.pushScene('user-info', event.item);
}

// Used for toggling between following and followers
FollowingFollowersAssistant.prototype.handleCommand = function (event){
	if (event.type === Mojo.Event.command) {
		var menu = $H(this.TOP_MENU);
		menu.keys().each(function(key) {
	      var menuCommand = menu.get(key);
	      if (menuCommand.command == event.command) {
	        menuCommand.target.curry(menuCommand.command)();
	        event.stop();
	        throw $break;
	      }
		});	
  }
}

// Called from handleCommand when top menu is tapped so swap to a different scene
FollowingFollowersAssistant.prototype.swapTo = function (whichPeopleToLoad){
	Mojo.Log.info('What should I load', whichPeopleToLoad);
	this.controller.stageController.swapScene({name: 'following-followers', transition: Mojo.Transition.crossFade}, this.userInfo, whichPeopleToLoad);
}

FollowingFollowersAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	this.bigLoader.addClassName('show');
}


FollowingFollowersAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

FollowingFollowersAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	this.controller.stopListening(this.loadButton, Mojo.Event.tap, this.loadMoreHandler);
	this.controller.stopListening(this.listWidget, Mojo.Event.listTap, this.pushUserHandler);
	TM.helpers.closeStage();
}
