//TweetMe namespace for all globally accessed information (usernames, preferences, etc)
var TM = {};

//Preferences namespace. Usernames, passwords, how much to load, etc.
// username, password, userInfo (full JSON user object)
TM.prefs = {};

//Version of TweetMe. Used for updating the cookie data when the app structure changes. See app/models/cookie.js for more info
TM.prefs.version = Mojo.appInfo.version;
TM.prefs.ssl = false; //Sets the default to ssl being off. Faster, but less secure. Check with users to see which they want.
TM.prefs.numTweetsToLoad = 25;
TM.prefs.notificationInterval = 30 * 60 * 1000; // 30 minutes
TM.prefs.displayName = 'screen_name';
TM.prefs.fontSize = 'normal'; // either 'normal' or 'large'. May add more font options soon.
TM.prefs.lastCheckedAt = 0;
TM.prefs.password = 'somepassword'; //now that we don't store it we can just add a filler. TODO: Remove all checks for TM.prefs.password and refactor those checks into a single function.
TM.prefs.postOnEnter = false;
TM.prefs.accounts = {};
TM.unreadItemsStructure = {
  mentions: {hasUnread: false, lastId: 1, functionName: 'mentions', shouldCheck: true},
  messages: {hasUnread: false, lastId: 1, functionName: 'directMessages', shouldCheck: true},
  home: {hasUnread: false, lastId: 1, functionName: 'homeTimeline', shouldCheck: false}
};

//TM oauth oject. Has all the keys necessary
/*
TM.oauthConfig = {
  requestTokenUrl:'https://api.twitter.com/oauth/request_token',
  authorizeUrl:'https://api.twitter.com/oauth/authorize',
  accessTokenUrl:'https://api.twitter.com/oauth/access_token',
  oauth_realm: 'http://api.twitter.com/',
  serviceProvider:
    { signatureMethod     : "HMAC-SHA1"
    , requestTokenURL     : "https://api.twitter.com/oauth/request_token"
    , accessTokenURL      : "https://api.twitter.com/oauth/access_token"
    , echoURL             : "http://www.google.com"
    }
};
*/
TM.oauthConfig = {
  requestTokenUrl:'https://api.twitter.com/oauth/request_token',
  authorizeUrl:'https://api.twitter.com/oauth/authorize',
  accessTokenUrl:'https://api.twitter.com/oauth/access_token',
  oauth_realm: 'http://api.twitter.com/',
  serviceProvider:
    { signatureMethod     : "HMAC-SHA1"
    , requestTokenURL     : "https://api.twitter.com/oauth/request_token"
    , accessTokenURL      : "https://api.twitter.com/oauth/access_token"
    , echoURL             : "http://www.google.com"
    }
};

// TM.oauthConfig.oauthAccessToken is added from the prefs object.


//Helpers functions I use frequently for TweetMe
TM.helpers = {};

//Namespace for background notification. Checks timelines, creates dashboard stages, etc.
TM.notifications = {};

//Namespace for dashboard helper
TM.dashboard = {};

TM.dashboard.key = 'tweet_fetch';
TM.dashboardStageName = 'TweetMe_Dashboard';

//Namespace for all the base Twitter API functions
var Twitter = {};

// Stores recent users in here (for now)
Twitter.recentUsers = [];

//For use with automatically showing dialogs for certain errors in
//Passed the currentAssistant so you can call methods in that scene for failed responses, going over the rate limit etc.
//
//DEPRECATED: Decided not to use in case it intereferes when I have multi stages or dashboards for instance.
//Also there is a method to grab the current app controller and the current stage!
//Twitter.currentAssistant = undefined;

Twitter.requests = {}; // Stores requests in case they need to be retried. Automatically clears when done.

/* 
    Method for making an authorized request to twitter
    
    @params path REQUIRED the path to request
    @params params is optional as it may not be required for some methods.
    @params	method is also optional as the default will be 'get'
    @params postbody (for puts/posts), custom method onsuccess, failure etc, or make the requests https for instance
    @params opts.onFail = Object containing the status code to check for and the function to call if the error is that status code. Right now can only accept one error.
*/
Twitter.request = function(path, opts, params, httpMethod) {
    // Deletes old requests and removes some if there are too many!
    Twitter.handleTooManyRequests();
    // sets default variables 
    opts = opts || {};
    params = params || {};
    httpMethod = httpMethod || 'get';
    opts.subdomain = opts.subdomain || '';
    if (Object.isUndefined(opts.postBody)) {
        opts.postBody = ' '; // Must be a space for post requests to work. This is a webOS specific bug. 
    }
    if (Object.isUndefined(opts.ssl)) {
        opts.ssl = TM.prefs.ssl;
    }
    opts.ssl = opts.ssl === true ? opts.ssl = "s" : opts.ssl = '';
    var base64credentials = Base64.encode(TM.prefs.username + ':' + TM.prefs.password);
    if (opts.noAuth) {
        base64credentials = '';
    }
    // FIxes a weird bug where it won't authenticate unless postbody is null. so lame
    if (httpMethod == 'post' || httpMethod == 'POST' && !opts.postBody) {
      opts.postBody = null;
    }
    var fullPath = "http" + opts.ssl + "://" + opts.subdomain + "twitter.com" + path;
    
    var accessor = TM.oauthConfig;
    var message = {
        method: httpMethod, action: fullPath
      , parameters: params
    };

    // All the code above changes the params object that is used in the Ajax Request. I had no idea Twitter accepted Oauth in the params instead of the header, but it does. Sweet.
    if (opts.oldAuth !== true) {
      base64credentials = '';
    }
    
    var token = new Date().getTime(); // Token to be used to reference the correct request
    Twitter.requests[token] = {};
    Twitter.requests[token].request = null;
    Twitter.requests[token].request = function() {
      // Generates auth and nonce everytime! This must be done in case phone loses connection mid-request. If that happens and it retires it needs a new nonce and timestamp
      OAuth.SignatureMethod.sign(message, TM.oauthConfig);
      OAuth.completeRequest(message, TM.oauthConfig);
      params.oauth_nonce = OAuth.nonce(Math.floor(Math.random()*20) + 10);
      OAuth.SignatureMethod.sign(message, TM.oauthConfig);
      Mojo.Log.info('Nonce is', params.oauth_nonce);
      
      //authorization = OAuth.getAuthorizationHeader("", params);
      
      var authSignature = OAuth.getAuthorizationHeader("", message.parameters);
      var request = new Ajax.Request(fullPath, {
          method: httpMethod,
          evalJSON: "force",
          postBody: opts.postBody,
          parameters: params,
          requestHeaders: {
            'Last-Modified': '', 
            Authorization: 'Basic ' + base64credentials//this.authSignature
          },        
          onSuccess: this.successfulRequest.bind(this, opts.onSuccess, token),
          onFailure: this.failedRequest.bind(this, opts.onFail, token)
      });
      return request;
    }.bind(this);
    Twitter.requests[token].retryCount = 0; // Some possible race conditions, but generally only one request is sent at a time and we'll cancel other requests later so only one is running. This should suffice.
    return Twitter.requests[token].request(); // Used to abort the request later. Make sure to keep mem usage low and stop using the CPU on requests we don't care about any more.
}

Twitter.generateSignature = function (params, method, accessor, message){
  if(params == undefined)
    params = {};
  if(method == undefined) {
    method = 'GET';
  }
  var timestamp=OAuth.timestamp();
  var nonce=OAuth.nonce(14);
  message.parameters.push(['oauth_consumer_key', accessor.consumer_key]);
  message.parameters.push(['oauth_token', accessor.token]);
  message.parameters.push(['oauth_nonce', nonce]);
  message.parameters.push(['oauth_timestamp', timestamp]);
  message.parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
  message.parameters.push(['oauth_version', '1.0']);
  OAuth.SignatureMethod.sign(this.message, accessor);
  var authHeader = OAuth.getAuthorizationHeader("", this.message.parameters);
  return authHeader;
}

// Called from Twitter.request when the request was successful. Also called from any other AJAX function to test if there was no internet connection.
// onSuccess is a function that is called when the request is successful
Twitter.successfulRequest = function (onSuccess, token, transport) {
    if (!transport.responseJSON) {
//      Mojo.Controller.getAppController().showBanner('No internet connection', '', '');
      Twitter.retryIfFailedToConnect('Bad connection to Twitter. Retrying', token);
    }
    else {
      delete Twitter.requests[token]; // Removes the request once it's completed
        if (onSuccess) {
          // Custom onSuccess function
            // Mojo.Log.logProperties(transport.responseJSON);
            var successFunction = onSuccess.curry(transport); //Leaves OG argument intact, and adds the AJAX transport to the end.
            successFunction();
        } else {
          // Default onSuccess
            Mojo.Controller.getAppController().showBanner('Success!', '', '');
            // Mojo.Log.logProperties(transport.responseJSON);
        }
      Mojo.Controller.getAppController().removeBanner('badConnection');
    }
}

// Called from Twitter.request when the request failed for some reason
Twitter.failedRequest = function (onFail, token, transport) {
    status = transport.status;
    var  message;
    var errorMessage = transport.responseJSON.error;
    Mojo.Log.error('Error message is:', errorMessage);
    Mojo.Log.error('Failed status code is', status);
    try {
      if (onFail && Object.isArray(onFail.status) === true) {
        // If the status is an array and one of the status in the fail function matches, then set that as the status.
        // That way in the next if check it doesn't have to know whether it's an array or not
        onFail.status = onFail.status.include(status) ? status : onFail.status; 
      }
    } catch(e) {
      Mojo.Log.info("Had issues parsing the failure stuff");
      Mojo.Log.info(e);
    }
    // if the error is the same as the status code for the custom onfailure method then perform that and not the default
    if (onFail && onFail.status == status){//onFail && onFail.first() === status
        onFail.functionToCall(transport, status); // Pass status back so if the function wants it can check what the status was
    }
    //default error messages
    else {
        var retryRequest = false; // Is either true or false. If true it retries, and posts a banner saying retryng. Doesn't display error dialog
        // FROM: http://apiwiki.twitter.com/HTTP-Response-Codes-and-Errors
        if (status == 304){ // Not Modified: There was no new data to return.
            message = "Please contact catalystmediastudios@gmail.com with subject \"304 returned\"";
        }
        else if (status == 400){// Bad Request: The request was invalid.  An accompanying error message will explain why. This is the status code will be returned during rate limiting.
            message = "We're sorry, Twitter doesn't like what we sent them. " + transport.responseJSON.error;
        }
        else if (status == 401){// Not Authorized: Authentication credentials were missing or incorrect.
            //TODO: Try the request again and if that still doesn't work THEN automatically take them to the sign in page.
            Mojo.Log.info('Status in 401 is', errorMessage);
            if (/nonce/gi.match(errorMessage)) {
              message = "Connection interrupted. Trying again.";
              retryRequest = true;
            } else if (errorMessage == "Not authorized") {
              message = "What you were trying to view was probably protected and can't be viewed.";
            } else {
              // No loner authorized, probably...
              retryRequest = true;
              message = "Could not connect. Please try again or you may need to sign out and back in.";
            }
            // message = "Not Authorized. Try tapping \"TweetMe\" in the top left menu and tapping sign out. Then sign in again.";
        }
        else if (status == 403){// Forbidden: Request understood, but has been refused.  Accompanying error message will explain why. Used when requests are being denied due to update limits.
            message = transport.responseJSON.error;
        }
        else if (status == 404){// Not Found: The URI requested is invalid or the resource requested, such as a user, does not exist
            message = "What you wanted to see is no longer on Twitter, or does not exist.";
        }
        else if (status == 500){// Internal Server Error: Something is broken.  Please post to the group so the Twitter team can investigate.
            message = "We're so sorry. Twitter is temporarily down.";
            retryRequest = true;
        }
        else if (status == 502) {// Bad Gateway: Twitter is down or being upgraded.
            message = "Twitter is down for a short bit. Try again soon.";
            retryRequest = true;
        }
        else if (status == 503){//Service Unavailable: The Twitter servers are up, but overloaded with requests. Try again later. The search and trend methods use this to indicate when you are being rate limited.
            message = "Twitter is having trouble keeping up with all the Tweeters, or you've been searching Twitter and Twitter trends too much. Try again in a bit.";
            retryRequest = true;
        }
        else {
            //Shouldn't ever get this.
            message = "You may not have a data connection right now, or Twitter may be down.";
        }
        if (retryRequest) {
//            setTimeout(function(){
//                Twitter.sceneAssistant.request();
//                Twitter.retryCount += 1;
//            }, (Twitter.retryCount * 200) + 350); // slight delay in case the server just needs a sec
//            Mojo.Controller.getAppController().showBanner('Twitter is down temporarily. Retrying', '', '');
          Twitter.retryIfFailedToConnect('Twitter is down temporarily. Retrying', token, message);
        }
        else if (message) {
            Mojo.Log.logProperties(transport);
            Mojo.Log.logProperties(transport.request, 'request');
            Mojo.Log.logProperties(transport.responseJSON);
            Mojo.Controller.errorDialog(message, Mojo.Controller.getAppController().getStageController('TweetMe').window);
            TM.helpers.unblockTaps(Mojo.Controller.getAppController().getStageController('TweetMe').assistant);
            Mojo.Log.info('XHR status', transport.request.parameters);
        }
    }
}


Twitter.retryIfFailedToConnect = function (message, token, defaultMessage){
  Mojo.Log.error('Retrying request');
  Mojo.Log.info('Token is', token);
  var appController = Mojo.Controller.getAppController();
  var stage = appController.getStageController('TweetMe');
  var scenes;
  var firstSceneName;
  if (stage) {
    scenes = stage.getScenes();
    firstSceneName = scenes[0].sceneName
  }
  if (!defaultMessage) {
    var defaultMessage = "Couldn't connect to Twitter.";
  }
  if ((TM.prefs.username && TM.prefs.password && TM.prefs.oauthTokenSecret) || (scenes && (firstSceneName === 'sign-in'))) {
    if (Twitter.requests[token].retryCount < 3) {
      setTimeout(function(){
        try {
          Twitter.requests[token].request();
          Twitter.requests[token].retryCount += 1;
        } catch(e) {
          Mojo.Log.error("Probably couldn't connect because there were too many requests and this one was delete");
          Mojo.Log.error(e);
        }
      }, (Twitter.requests[token].retryCount * (300 * Twitter.requests[token].retryCount)) + 250); // slight delay in case the Twitter servers just needs a sec
      if (stage && stage.isActiveAndHasScenes() && Twitter.requests[token].retryCount > 1) {
        Mojo.Controller.getAppController().showBanner(message, '', 'badConnection');
      }
    } else {
      Mojo.Log.info('Retried 3 times and no response');
      // TODO: make it so that a refresh icon appears and calls this funtion again. Make sure to check the length and delete unused requests! Like so:
  //    var count = 0;
  //    for (k in Twitter.requests) if (Twitter.requests.hasOwnProperty(k)) count++;
      delete Twitter.requests[token]; // Removes the request once it's completed
      if (stage && stage.isActiveAndHasScenes() && defaultMessage && TM.prefs.oauthTokenSecret) {
        Mojo.Controller.errorDialog(defaultMessage, stage.getScenes().last().window);
      }
    }
  }
}

// If there are too many requests in the queue it will delete some.
// Just makes sure no requests sneak by and the old ones are deleted if they run too long
Twitter.handleTooManyRequests = function (){
  var count = 0;
  for (k in Twitter.requests) if (Twitter.requests.hasOwnProperty(k)) count++;
  Mojo.Log.info('******Number of requests pending/failed requests', count);
  var maxRequests = 3;
  // TOD): Streamline this code. It's horrible convuluted
  if (count > maxRequests) {
    requestsArray = [];
    $H(Twitter.requests).each(function (pair){
      requestsArray.push(pair.key);
    });
    // Sorts so the oldest requests are at the end
    requestsArray.sort(function (a, b){
      return b - a;
    });
    // requestsArray.splice(maxRequests, 100); // Deletes the oldest requests. No, it doesn't
    Mojo.Log.info('******REMOVING OLD REQUESTS****');
    for (var i = (maxRequests + 1); i < requestsArray.length; i++) {
      try {
        delete Twitter.requests[requestsArray[i]];
      } catch (e) {
        Mojo.Log.error("Couldn't delete old requests");
        Mojo.Log.error(e);
      }
    } 
  }
}

// Signs me out of TweetMe
// @param opts.removeCredentials {boolean} set to true to clear username/password/userINfo and permanaently sign them out.Leaves other prefs intact. Set to false or leave undefined to just show the sign-in scene
Twitter.signOut = function (opts){
  Mojo.Log.info('Signing out');
  if (!opts) {
    opts = {};
  }
  if (opts.removeCredentials === true) {
    TM.prefs.username = null;
    // TM.prefs.password = null;
    TM.prefs.userInfo = null;
    TM.prefs.oauthTokenSecret = null;
    TM.prefs.oauthAccessToken = null;
    TM.prefStorage.storePrefs();
    TM.prefStorage.initialize(); // Probably not needed
  }
  var appController = Mojo.Controller.getAppController();
  var stage = appController.getStageController('TweetMe');
  var scene = stage.getScenes()[0];
  if (scene && scene.sceneName !== 'sign-in') {
    if (opts.showMessage === true) {
      Mojo.Controller.getAppController().showBanner('Sorry! Not authorized. Sign in again.', '', '');
    }
    stage.popScenesTo('');
    stage.pushScene('oauth', TM.oauthConfig);
  }
}


//
//
// All the functions that Twitter uses in the API. Use these to call pretty much anything
//
//


Twitter.homeTimeline = function(opts, params) {
    opts = opts || {};
    opts.subdomain = 'api.';
    params = params || {};
    params.count = params.count || TM.prefs.numTweetsToLoad;
    Twitter.request('/1/statuses/home_timeline.json', opts, params);
}

Twitter.publicTimeline = function(opts, params)  {
    Twitter.request('/statuses/public_timeline.json', opts, params);
}

Twitter.userTimeline = function(user_id, opts, params)  {
    opts = opts || {};
    opts.subdomain = 'api.';
    params = params || {};
    params.count = params.count || TM.prefs.numTweetsToLoad;
    Twitter.request('/1/statuses/user_timeline/' + user_id + '.json', opts, params);
}

Twitter.myLists = function(opts, params) {
  //:user/lists/:id/statuses.format
  // http://api.twitter.com/version/:user/lists.format
  opts = opts || {};
  opts.subdomain = 'api.';
  Twitter.request('/1/' + TM.prefs.username +'/lists.json', opts, params);
}

Twitter.listsIFollow = function(opts, params) {
  //:user/lists/:id/statuses.format
  // http://api.twitter.com/version/:user/lists/subscriptions.format
  var path = '/1/' + TM.prefs.username +'/lists/subscriptions.json';
  Mojo.Log.info('Path is', path);
  opts = opts || {};
  opts.subdomain = 'api.';
  Twitter.request('/1/' + TM.prefs.username +'/lists/subscriptions.json', opts, params);
}

Twitter.getListTweets = function (listId, screenName, opts, params){
//  version/:user/lists/:id/statuses.format
  Twitter.request('/1/' + screenName +'/lists/' + listId + '/statuses.json', opts, params);
}

// Options: since_id, max_id, count, page, since
//Twitter.friends_timeline = function(opts, params) {
//  Twitter.request('/statuses/friends_timeline.json', opts, params)
//}

// Options: id, user_id, screen_name, since_id, max_id, page, since, count
Twitter.myTweets = function(opts, params) {
  Twitter.request('/statuses/user_timeline.json', opts, params);
}
//
//Twitter.status(id)
//  Twitter.request("/statuses/show/#{id}.json")
//}
//
// Options: count
//Twitter.retweets(id, query={ })
//  Twitter.request("/statuses/retweets/#{id}.json", opts, params)
//}
//
// Options: in_reply_to_status_id
Twitter.sendTweet = function(tweet, opts, params) {
    params = params || {};
    opts = opts || {};
    params.status = tweet.status;
	params.place_id = tweet.place_id;
	params.lat = tweet.lat;
	params.long = tweet.long;

    opts.postBody = null; // Weird bug in the Twitter API requires this to be null or it doesn't see the status paramter
    Twitter.request("/statuses/update.json", opts, params, 'post');
}

Twitter.getTweet = function(status_id, opts, params) {
    params = params || {};
    opts = opts || {};
    opts.noAuth = true; //Saves it from killing the authenticated user's API requests. Logs against IP, and not account this way.
    Twitter.request("/statuses/show/" + status_id + ".json", opts, params);
}

// TODO: Rename this to deleteTweet to go along with the sendTweet and getTweet functions
Twitter.deleteStatus = function(id, opts, params) {
  opts = opts || {};
  opts.postBody = null;
  Twitter.request('/statuses/destroy/' + id + '.json', opts, params, 'post');
}

Twitter.retweet = function(status_id, opts, params) {
    params = params || {};
    opts = opts || {};
//    params['id'] = status_id;
    // params.source = 'TweetMe - Palm Pre, Palm Pixi'; // TODO Enable the source attribute when it accurately sets it to the TweetMe for webOS
    opts.postBody = null; // Weird bug in the Twitter API requires this to be null or it doesn't see the status paramter
    Twitter.request("/statuses/retweet/" + status_id + ".json", opts, params, 'post');
}


// Options: since_id, max_id, count, page
Twitter.mentions = function(opts, params) {
  Twitter.request('/statuses/mentions.json', opts, params);
}
//
// Options: since_id, max_id, count, page
//Twitter.retweeted_by_me = function(opts, params) {
//  Twitter.request('/statuses/retweeted_by_me.json', opts, params)
//}
//
// Options: since_id, max_id, count, page
//Twitter.retweeted_to_me = function(opts, params) {
//  Twitter.request('/statuses/retweeted_to_me.json', opts, params)
//}
//
// Options: since_id, max_id, count, page
//Twitter.retweets_of_me = function(opts, params) {
//  Twitter.request('/statuses/retweets_of_me.json', opts, params)
//}
//
//Twitter.status_destroy(id)
//  perform_post("/statuses/destroy/#{id}.json")
//}
//
//Twitter.retweet(id)
//  perform_post("/statuses/retweet/#{id}.json")
//}

// Options: id, user_id, screen_name, cursor
Twitter.friends = function(id, opts, params) {
    params = params || {};
    id = id || TM.prefs.userInfo.id;
    params.cursor = params.cursor || -1;
    Twitter.request('/statuses/friends/' + id + '.json', opts, params)
}

// Options: id, user_id, screen_name, cursor
Twitter.followers = function(id, opts, params) {
    params = params || {};
    id = id || TM.prefs.userInfo.id;
    params.cursor = params.cursor || -1;
    Twitter.request('/statuses/followers/' + id + '.json', opts, params)
}

Twitter.loadUserByID = function(id, opts, params) {
    Twitter.request("/users/show/" + id + ".json", opts, params);
}
Twitter.loadUserByScreenName = function(screenName, opts, params) {
    params = params || {};
    params.screen_name = screenName;
    Twitter.request("/users/show.json", opts, params);
}
//
// Options: page, per_page
//Twitter.user_search(q, query)
//  q = URI.escape(q)
//  Twitter.request("/users/search.json", :query => ({:q => q}.merge = function(opts, params) ))
//}

Twitter.directMessages = function(opts, params) {
  Twitter.request("/direct_messages.json", opts, params)
}
Twitter.sentMessages = function(opts, params) {
  Twitter.request("/direct_messages/sent.json", opts, params)
}

// message_id is an integer value for the ID of the DM
Twitter.deleteMessage = function(message_id, opts, params) {
  opts = opts || {};
  opts.postBody = null;
  Twitter.request("/direct_messages/destroy/" + message_id + ".json", opts, params, 'post')
}

// text is string with the message text. Screen name is the screen name of the user we're sending this message to
Twitter.sendMessage = function(text, screen_name, opts, params) {
  params = params || {};
  opts = opts || {};
  params['text'] = text;
  params.screen_name = screen_name;
  //params.source = 'TweetMe';
  opts.postBody = null; // Weird bug in the Twitter API requires this to be null or it doesn't see the status paramter
  Twitter.request("/direct_messages/new.json", opts, params, 'post')
}

//
// Options: since, since_id, page
//Twitter.direct_messages_sent = function(opts, params) {
//  Twitter.request("/direct_messages/sent.json", opts, params)
//}
//
//Twitter.direct_message_create(user, text)
//  perform_post("/direct_messages/new.json", :body => {:user => user, :text => text})
//}
//
//Twitter.direct_message_destroy(id)
//  perform_post("/direct_messages/destroy/#{id}.json")
//}
//
Twitter.follow = function(id, opts, params) {
  
  Twitter.request("/friendships/create/" + id + ".json", opts, params, 'post');
}

Twitter.unfollow = function(id, opts, params) {
    Twitter.request("/friendships/destroy/" + id + ".json", opts, params, 'post');
}

// Takes options for user_a and user_b
// I believe this isn't user and does not work
Twitter.friendshipExists = function(a, b, opts) {
    var params = {user_a: a, user_b: b};
    Twitter.request("/friendships/show.json", opts, params);
}

// Takes options for user_a and user_b
Twitter.showFriendship = function(a, b, opts) {
    var params = {source_id: a, target_id: b};
    Twitter.request("/friendships/show.json", opts, params)
}
//
// Options: id, user_id, screen_name
//Twitter.fri}_ids = function(opts, params) {
//  Twitter.request("/friends/ids.json", opts, :mash => false)
//}
//
// Options: id, user_id, screen_name
//Twitter.follower_ids = function(opts, params) {
//  Twitter.request("/followers/ids.json", opts, :mash => false)
//}



Twitter.verifyCredentials = function (opts, params) {
  if (!opts) {
    opts = {};
  }
  if (Object.isUndefined(opts.oldAuth)) {
    //opts.oldAuth  = true;
  }
  Twitter.request("/account/verify_credentials.json", opts, params);
}


/*
// Device must be sms, im or none
Twitter.update_delivery_device(device)
  perform_post('/account/update_delivery_device.json', :body => {:device => device})
}

// One or more of the following must be present:
//   profile_background_color, profile_text_color, profile_link_color,
//   profile_sidebar_fill_color, profile_sidebar_border_color
Twitter.update_profile_colors(colors)
  perform_post('/account/update_profile_colors.json', :body => colors)
}

// file should respond to #read and #path
Twitter.update_profile_background(file, tile = false)
  perform_post('/account/update_profile_background_image.json', build_multipart_bodies(:image => file).merge(:tile => tile))
}

Twitter.rate_limit_status
  Twitter.request('/account/rate_limit_status.json')
}

// One or more of the following must be present:
//   name, email, url, location, description
Twitter.update_profile(body)
  perform_post('/account/update_profile.json', :body => body)
}
*/
// Options: id, page, user_id
Twitter.favorites = function(opts, params) {
  opts = opts || {};
  var user_id = '';
  if (opts.user_id) {
    user_id = '/' + opts.user_id;
  }
  Twitter.request('/favorites' + user_id + '.json', opts, params)
}

// Options: id, page, user_id
// More onvenient than the one above. Must pass user_id as the first paramater
Twitter.userFavorites = function(user_id, opts, params) {
  opts = opts || {};
  Twitter.request('/favorites/' + user_id + '.json', opts, params)
}

Twitter.favorite = function (id, opts, params) {
    Twitter.request("/favorites/create/" + id + ".json", opts, params, 'post');
}

Twitter.unfavorite = function (id, opts, params) {
    Twitter.request("/favorites/destroy/" + id + ".json", opts, params, 'post');
}
/*
Twitter.enable_notifications(id)
  perform_post("/notifications/follow/#{id}.json")
}

Twitter.disable_notifications(id)
  perform_post("/notifications/leave/#{id}.json")
}

Twitter.block(id)
  perform_post("/blocks/create/#{id}.json")
}

Twitter.unblock(id)
  perform_post("/blocks/destroy/#{id}.json")
}

Twitter.help
  Twitter.request('/help/test.json')
}

Twitter.list_create(list_owner_username, options)
  perform_post("/#{list_owner_username}/lists.json", :body => {:user => list_owner_username}.merge(options))
}

Twitter.list_update(list_owner_username, slug, options)
  perform_put("/#{list_owner_username}/lists/#{slug}.json", :body => options)
}

Twitter.list_delete(list_owner_username, slug)
  perform_delete("/#{list_owner_username}/lists/#{slug}.json")
}

Twitter.lists(list_owner_username=nil)
  path = "http://api.twitter.com/1"
  path += "/#{list_owner_username}" if list_owner_username
  path += "/lists.json"
  Twitter.request(path)
}

Twitter.list(list_owner_username, slug)
  Twitter.request("/#{list_owner_username}/lists/#{slug}.json")
}

Twitter.list_timeline(list_owner_username, slug)
  Twitter.request("/#{list_owner_username}/lists/#{slug}/statuses.json")
}

Twitter.memberships(list_owner_username)
  Twitter.request("/#{list_owner_username}/lists/memberships.json")
}

Twitter.list_members(list_owner_username, slug, cursor = nil)
  path = "/#{list_owner_username}/#{slug}/members.json"
  path += "?cursor=#{cursor}" if cursor
  Twitter.request(path)
}

Twitter.list_add_member(list_owner_username, slug, new_id)
  perform_post("/#{list_owner_username}/#{slug}/members.json", :body => {:id => new_id})
}

Twitter.list_remove_member(list_owner_username, slug, id)
  perform_delete("/#{list_owner_username}/#{slug}/members.json", :query => {:id => id})
}

Twitter.is_list_member?(list_owner_username, slug, id)
  Twitter.request("/#{list_owner_username}/#{slug}/members/#{id}.json").error.nil?
}

Twitter.list_subscribers(list_owner_username, slug)
  Twitter.request("/#{list_owner_username}/#{slug}/subscribers.json")
}

Twitter.list_subscribe(list_owner_username, slug)
  perform_post("/#{list_owner_username}/#{slug}/subscribers.json")
}

Twitter.list_unsubscribe(list_owner_username, slug)
  perform_delete("/#{list_owner_username}/#{slug}/subscribers.json")
}

Twitter.list_subscriptions(list_owner_username)
  Twitter.request("/#{list_owner_username}/lists/subscriptions.json")
}


Twitter.blocked_ids
  Twitter.request("/blocks/blocking/ids.json", :mash => false)
}

Twitter.blocking(options)
  Twitter.request("/blocks/blocking.json", options)
}
*/
Twitter.searchTwitter = function (query, opts, params){
    opts = opts || {};
    opts.subdomain = 'search.';
    opts.ssl = false;
    opts.noAuth = true;
    params = params || {};
    params.q = query || 'test';
    params.rpp = params.rpp || TM.prefs.numTweetsToLoad;
//	params.lang = params.lang || 'en';
    Twitter.request('/search.json', opts, params);
}

// Pass in the assistant, and then the same params as you would to regular search
Twitter.searchNearby = function (assistant, query, opts, params){
  Mojo.Log.info('Attempting to get a lock and search nearby');
  Mojo.Controller.getAppController().showBanner('Getting your location', '', 'location');
  try {
    assistant.controller.serviceRequest('palm://com.palm.location', {
      method:"getCurrentPosition",
      parameters:{accuracy: 3, maximumAge: 2 *60 * 60, responseTime: 2},
      onSuccess: Twitter.successfulGPSLock.curry(query, opts, params),
      onFailure: Twitter.successfulGPSLock.curry(query, opts, params)
      }
    ); 
  } catch (e) {
    Mojo.Log.error('GPS locating didn\'t work');
    Mojo.Log.error('error is', Object.inspect($H(e)));
  }
}

Twitter.successfulGPSLock = function (query, opts, params, data){
  Mojo.Log.info('Data returned by GPS Lock is', Object.inspect($H(data)));
  var errorCode = data.errorCode;
  var message = "";
  if (errorCode === 0) {
//    message = 'Location found. Now finding tweets';
    opts = opts || {};
    opts.subdomain = 'search.';
    opts.ssl = false;
    opts.noAuth = true;
    params = params || {};
    params.q = query || '';
    params.geocode = data.latitude + ',' + data.longitude + ',' + '15mi';
    params.rpp = params.rpp || TM.prefs.numTweetsToLoad;
    Twitter.request('/search.json', opts, params);
  } else {
	message = Twitter.showLocationError(errorCode);
  }
	Mojo.Controller.getAppController().showBanner({messageText: message, icon: "x-mini-icon.png"}, '', 'location');
}

Twitter.showLocationError = function (errorCode) {
	var message;
	switch(errorCode) {
    	case 1: message = 'Took too long to find you. Try again'; break;
		case 2: message = 'We couldn\'t find you. Try again'; break;
		case 3: message = 'Unknown error.'; break;
		case 5: message = 'Location services off. Please turn them on'; break;
		case 6: message = 'Please accept location services terms.'; break;
		case 7: message = 'Something may have gone wrong. Try again if needed.'; break;
		case 8: message = 'Twitter can\'t get a location right now.'; break;
    }
	return message;
};

Twitter.savedSearches = function (opts, params){
    Twitter.request('/saved_searches.json', opts, params);
};

// Geo data
Twitter.getPlaces = function (lat, lon, opts) {
	opts = opts || {};
	opts.subdomain = 'api.';
	params = {};
	params.lat = lat;
	params.long = lon;
	Twitter.request('/1/geo/search.json', opts, params);
}






















