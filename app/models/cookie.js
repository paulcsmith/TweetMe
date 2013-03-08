//	Version 1.0 prefs
//  Prefs defined in twitter.js
//  prefs.version = version of preferences
//  prefs.ssl = true or false - sets whether ssl should be used for requests or not
//  prefs.numTweetsToLoad = int - How many tweets to load per request
//	prefs.username = Twitter username
//	prefs.password = Twitter password
//	prefs.version = version of preferences so we can successfully migrate if they have an older version of prefs
//	prefs.userInfo = the entire JSON user info object returned by Twitter's verify_credentials method
//  prefs.notificationInterval = milliseconds between checking for new mentions and messages
//  prefs.displayName = 'screen_name' || 'real_name' = what name to display on tweets
//  prefs.lastCheckedAt {integer} = the time that TweetMe has checked for new mentions, messages, etc. (in milliseconds)
//  prefs.unreadItems {object} Object has keys of, unreadMentions, unreadMessage, unreadTweets. The values of the keys are objects that look like: {hasUnread: false, lastId: 1, functionName: 'homeTimeline', shouldCheck: false}

// TODO: Rename this file. Cookie.js doesn't make sense now that it's stored in a legit database


TM.prefStorage = {
	initialize: function (successFunction){
	  Mojo.Log.info('Initializing');
		Data.prefs.get(TM.prefStorage.key, TM.prefStorage.initializePreferences.curry(successFunction));
	},
	initializePreferences: function (successFunction, oldTMPrefs){
	  if (oldTMPrefs) {
	    Mojo.Log.info('Preferences were already stored in the database');
	    TM.prefStorage.massagePreferences(oldTMPrefs);
	  }
	  else {
	    Mojo.Log.info('Preferences were stored in a cookie, or were not in the database yet');
	    try {
  	  	var cookieData = new Mojo.Model.Cookie("TMprefs");
  	  	oldTMPrefs = cookieData.get();
  	  	TM.prefStorage.massagePreferences(oldTMPrefs);
  	  	if (oldTMprefs) {
  	  	  Mojo.Log.info('Should reinitialize');
  	  	  TM.prefStorage.initialize(successFunction);
  	  	} else {
  	  	  successFunction(); // Just go to the sign in page. No prefs stored before
  	  	}
  	  	return
  	  } catch(e) {
  	    Mojo.Log.error("Couldn't read cookie data, or data was not there yet");
  	    Mojo.Log.error(e.stack);
  	    new Mojo.Model.Cookie("TMprefs").remove();
  	    TM.prefStorage.storePrefs(successFunction); // Delete bad cookie data, save new default prefs and start from scratch and go to sign in page
  	    return
  	  }
	  }
	  if (successFunction) {
	    successFunction();
	  }
	},
	massagePreferences: function (oldTMPrefs){
	  //TM.helpers.debug(oldTMPrefs, 'Old TM prefs');
	  try {
  	  if (oldTMPrefs) {
  	    if (oldTMPrefs.version === TM.prefs.version) {
  	      //If data is already in the newest format/current version
  	    	TM.prefs = oldTMPrefs;
  	    } else {
  	      oldTMPrefs.version = TM.prefs.version; //Sets to the new version
  	      TM.prefs = $H(TM.prefs).merge(oldTMPrefs); // Old prefs overwrite new prefs (as long as they already existed in the old prefs) new prefs stay intact with set defaults.
  	      TM.prefs = TM.prefs.toObject(); // Then convert back into a normal javascript object to save to database
  	    }
  	    
  	    // Massage data
  	    if (Account.numberOfAccounts() <= 0 && TM.prefs.userInfo) {
  	      //If they have the old account structure stored, convert the single user to the new multi user account structure
  	      Mojo.Log.info('*********Converting from old account structure to new account structure');
  	      var oldUnreadItems = TM.prefs.unreadItems;
  	      Account.addAccount(TM.prefs.userInfo, TM.prefs.oauthTokenSecret, TM.prefs.oauthAccessToken);
  	      Account.get(TM.prefs.userInfo.id).unreadItems = oldUnreadItems;
  	    }
  	    var account = Account.getDefault();
  	    if (account) {
  	      Account.setToCurrent(account.userInfo.id);
  	    }
  	    TM.prefStorage.storePrefs();
  	    new Mojo.Model.Cookie("TMprefs").remove(); // Removes the cookie just in case it's still there.
  	  }
  	} catch(e) {
  	  Mojo.Log.error("Couldn't massage preferences correctly");
  	  Mojo.Log.error(e.stack);
  	}
	},
	storePrefs: function (successFunction){
	  Mojo.Log.info('******Saving preferences');
		if (TM.prefs.numTweetsToLoad < 20) {
			TM.prefs.numTweetsToLoad = 20;
		}
		if (successFunction) {
		  Data.prefs.add(TM.prefStorage.key, TM.prefs, successFunction);
		} else {
  		Data.prefs.add(TM.prefStorage.key, TM.prefs);
  	}
	},
	key: 'tm-preferences'
};