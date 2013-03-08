TM.notifications.key = 'tweet_fetch';

// assistant is the scene assistant. It is optional. It is used if checking from within the app. This allows the notification to set the unread dots on icons
// Pass boolean:true to force to force an update. Used when first launching the app
TM.notifications.checkTimelines = function (assistant, sceneName, force){
  Mojo.Log.info('Attempting to check timelines');
  var timeBetweenLastCheck = new Date().getTime() - TM.prefs.lastCheckedAt;
  // (timeBetweenLastCheck >= TM.prefs.notificationInterval && TM.prefs.notificationInterval !== 0) || force === true Makes sure it only checks at the set interval
  if (TM.notifications.canCheckAgain() || force === true) { 
    Mojo.Log.info('!!!!!Actually checking timeline in background!!!!!');
    var successfulFetchHandler = TM.notifications.successfulFetch;
    for (key in Account.getDefault().unreadItems) {
      var value = Account.getDefault().unreadItems[key];
      if (value.shouldCheck === true && value.hasUnread === false && key !== sceneName) { //key.shouldCheck === true && key !== sceneName
        // functionName is just a string that can be used to call a Twitter function.
        Twitter[value.functionName]({onSuccess: successfulFetchHandler.curry(key, assistant)}, {since_id: value.lastId, count: 1, rrp: 1, per_page: 1});
      }
    }
    TM.prefs.lastCheckedAt = new Date().getTime();
    TM.notifications.setAlarm(assistant); //Sets a new alarm so it checks again
  } else if (!sceneName) {
    // Checking from an alarm, not a scene, so we need to make sure to set a new alarm
    // If there is a sceneName and it's not time to check then don't set an alarm because there is still one runing on the background
    TM.notifications.setAlarm(assistant); //Sets a new alarm so it checks again
  }
}

// Call this to check to see if the set time interval has passed.
// Can probably be removed
TM.notifications.canCheckAgain = function (){
  var canCheckAgain = false;
  var timeBetweenLastCheck = new Date().getTime() - TM.prefs.lastCheckedAt;
  Mojo.Log.info('Time between last check', timeBetweenLastCheck);
  Mojo.Log.info('Notification interval', TM.prefs.notificationInterval);
  if (timeBetweenLastCheck >= TM.prefs.notificationInterval && TM.prefs.notificationInterval != 0 && TM.prefs.oauthTokenSecret) {
    Mojo.Log.info('Enough time has passed. Can check again');
    canCheckAgain = true;
  }
  return canCheckAgain;
}

// whichTimeline {String} is a string that says which "timeline"/"unreadItems key" this response is for
TM.notifications.successfulFetch = function (whichTimeline, assistant, transport){
  Mojo.Log.info('Timeline for response is', whichTimeline);
  var response = transport.responseJSON;
  if (response.length >= 1) {
    Mojo.Log.info(whichTimeline, 'has UNREAD ITEMS!!!');
    var account = Account.getDefault();
    // This may be making it so that background notifications do not work...check into it. It may be because Twitter was having massive errors this morning when it was reported 6/23/10
    if (account.unreadItems[whichTimeline].lastId < response[0].id) {
      // Only update when the newly fetched tweet is truly newer. Fixes a race condition with the blue dot where if you open the app, switch to mentions/messages and it
      // checks for new tweets right after you've loaded new mentions or messages
      account.unreadItems[whichTimeline].hasUnread = true;
      account.unreadItems[whichTimeline].lastId = response[0].id;
    }
    
    // TODO: Make sure there are no crazy race conditions where multiple timeline checks return near the same time and overwrite the preferences
    TM.prefStorage.storePrefs(function (){
      var stage = Mojo.Controller.getAppController().getStageController('TweetMe');
      Mojo.Log.info('Got stage controller');
      if (stage && Object.isUndefined(assistant)) {
        Mojo.Log.info('Setting the assistant to the currently active scene');
        assistant = stage.activeScene().assistant;
      }
      try {
        var scenes = assistant.controller.stageController.getScenes();
      } catch (e) {
        Mojo.Log.info("Can't get any scenes. Stage not active or doesn't exist");
        var scenes;
      }
      // If the stage is closed, the stage is not active or the stage is active, but not on a bottom level scene
      if (!assistant || (assistant && assistant.stageController && assistant.stageController.isActiveAndHasScenes() === false) ||  (scenes && scenes.length > 1)) {
        // Either not open or not on a bottom level scene/
        Mojo.Log.info('Showing dashboard');
        Mojo.Log.info('Has unread tweets, attempting to display dashboard');
        TM.notifications.showDashboard();
      }
  
      // If you are on a higher level scene, this will make it still show the dashboard notification, but will also update the icons with blue dots on the lower level scene!
      // If there is a stage and there are scenes.
      if (assistant && scenes) {
        Mojo.Log.info('Trying to update unread dots!!!!!!!!!!!!!');
        TM.notifications.updateUnreadDotsDeferred(scenes[0].assistant);
      }
    });
  }
}

// Defers for just a bit, because sometimes it won't update on time and won't show the blue dot
TM.notifications.updateUnreadDotsDeferred = function (assistant){
  TM.notifications.updateUnreadDots.defer(assistant);
}

TM.notifications.updateUnreadDots = function (assistant){
  try {
    if (!assistant) {
      assistant = Mojo.Controller.getAppController().getStageController('TweetMe').getScenes()[0].assistant;
    }
  } catch(e) {
    Mojo.Log.error(e.stack);
  }
  if (TM.helpers.hasUnreadItems()) {
    assistant.controller.get('divNavIcon').addClassName('has-unread-items');
  } else {
    assistant.controller.get('divNavIcon').removeClassName('has-unread-items');
  }
  TM.helpers.filterUnreadItems.call(assistant);
  assistant.controller.modelChanged(assistant.navActions);
}

TM.notifications.showDashboard = function (){
  Mojo.Log.info('Attempting to check for dashboard and then display it');
  try {
    var appController = Mojo.Controller.getAppController(); 
    var stageController = appController.getStageProxy('TweetMe'); 
    Mojo.Log.info('About to get dashboard. Stage name is...', TM.dashboardStageName);
    var dashboardStageController = appController.getStageController(TM.dashboardStageName);
    if (!dashboardStageController) {
      Mojo.Log.info('No Dashboard exists yet, creating one now');
      Mojo.Controller.getAppController().playSoundNotification('vibrate', '', '');
      var pushDashboard = function (stageController){
        Mojo.Log.info('Pushing dashboard scene 1!');
        try {
          Mojo.Controller.getAppController().showBanner('You have new tweets', {action: 'show-splash-menu'}, '');
          stageController.pushScene("dashboard");
        } catch(e) {
          Mojo.Log.error(e);
        }
      }
      appController.createStageWithCallback({ 
                                              name: TM.dashboardStageName, 
                                              lightweight: true 
                                            }, pushDashboard, "dashboard");
                                            
    } else {
      Mojo.Log.info("Existing Dashboard Stage"); 
      // dashboardStageController.delegateToSceneAssistant("updateDashboard", 
    }
  } catch(e) {
    Mojo.Log.error("Couldn't create the dashboard");
    Mojo.Log.error(e);
  }
}

// I think I can remove the assistant param. Not used anywhere in this function
// Interval is a double or int that is passed to generate a date in the future
TM.notifications.setAlarm = function (assistant, interval){
  Mojo.Log.info('Setting new alarm RING RING RING RING');
  Mojo.Log.info('Notifications key is', TM.notifications.key);
  //var myDateString = TM.notifications.getShortFutureDate(0.45);
  if (!interval) {
    interval = TM.prefs.notificationInterval / 60 / 1000;
  }
  if (interval === 0) {
    interval = 500000;
  }
  Mojo.Log.info('INTERVAL IS:', interval);
  var myDateString = TM.notifications.getShortFutureDate(interval); // Leave blank to use the notification interval in preferences
	try {
    new Mojo.Service.Request('palm://com.palm.power/timeout', {
      method: "set",
      parameters: {			
        'key':  TM.notifications.key,//  TM.notifications.key
        //'in': '00:05:00', // See every 5 minutes if TweetMe should check for new tweets. If it hasn't been enough time it won't check, but will just set another alarm.
        'at': myDateString,
        'wakeup': false,
        'uri': "palm://com.palm.applicationManager/open",
        params: {id: 'com.catalystmediastudios.tweetme', params: {action: 'check_for_new_tweets'}} 
      }
    });
    Mojo.Log.info('Alarm setup correctly');
  } catch (e) {
    Mojo.Log.error('Alarm not setup properly');
    Mojo.Log.error('Alarm error is', e);
  }
}

// Helpful for setting short delays to test the alarm service
// Pass in a multiplier to multiple by minutes.
// Example: Passing in .45 will set it for 45 seconds in the future, .30 will be half a minute, etc.
// Leave multiplier blank to use the set notification interval
TM.notifications.getShortFutureDate = function (multiplier){
  d = new Date();
  Mojo.Log.info('Multiplier is', multiplier);
  d.setTime(d.getTime() + multiplier * 60 * 1000);

  
  mo = d.getUTCMonth() + 1;
  if (mo < 10) {
  	mo = '0' + mo;
  }
  date = d.getUTCDate();
  if (date < 10) {
  	date = '0' + date;
  }
  yr = d.getUTCFullYear();
  //get hours according to GMT
  hrs = d.getUTCHours();
  if (hrs < 10) {
  	hrs = '0' + hrs;
  }
  mins = d.getUTCMinutes();
  if (mins < 10) {
  	mins = '0' + mins;
  }
  secs = d.getUTCSeconds();
  if (secs < 10) {
  	secs = '0' + secs;
  }
  myDateString = mo + "/" + date + "/" + yr + " " + hrs + ":" + mins + ":" + secs;
  Mojo.Log.info("Date String", myDateString);
  return myDateString;
}


// Pass last tweet id and the sceneName
TM.notifications.saveLastLoadedId = function (id, sceneName, refreshDots){
  Mojo.Log.info('Attempting to saveLastLoadedId');
  if (Account.getCurrent() && Account.getCurrent().unreadItems[sceneName]) {
    if (id > Account.getCurrent().unreadItems[sceneName].lastId) {
      Account.getCurrent().unreadItems[sceneName].hasUnread = false;
    }
    Account.getCurrent().unreadItems[sceneName].lastId = id;
    if (refreshDots) {
      Mojo.Log.info('Updating dots');
      TM.prefStorage.storePrefs(TM.notifications.updateUnreadDotsDeferred);
    } else {
      Mojo.Log.info('Just saving new prefs');
      TM.prefStorage.storePrefs();
    }
  }
}