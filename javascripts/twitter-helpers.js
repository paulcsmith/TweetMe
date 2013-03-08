/*
Copyright (c) 2007-2009, Edward Finkler, Funkatron Productions
 
All rights reserved.
 
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
 
        Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.
        
        Redistributions in binary form must reproduce the above
        copyright notice, this list of conditions and the following
        disclaimer in the documentation and/or other materials provided
        with the distribution.
        
        Neither the name of Edward Finkler, Funkatron Productions nor
        the names of its contributors may be used to endorse or promote
        products derived from this software without specific prior written
        permission.
 
 
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/


/**
 * This is a port of the CodeIgniter helper "autolink" to javaTMript
 * It finds and links both web addresses and email addresses
 * 
 * @param {string} str
 * @param {string} type  'email', 'url', or 'both' (default is 'both')
 * @param {boolean} extra_code  a string that will be inserted verbatim into <a> tag
 * @param {integer} maxlen  the maximum length the link description can be (the string inside the <a></a> tag)
 * @return {string}
 */
 
var minTweets = 7; // Used so that there must be at least 'minTweets' for the load more button to appear
var timeBetweenTimeReformat = 3 * 60 * 1000; // 5 * 60 * 1000 = 5 minutes
//timeBetweenTimeReformat = 4000; // For testing
 
// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

// Will be used for removing favorite users. Not used yet
Array.prototype.removeByName = function (objectToRemove){
	var objectPosition = this.indexOf(objectToRemove);
	// If the object was found in the array
	if (objectPostition !== -1) {
		this.remove(objectPosition);
	}
	return this;
}

String.prototype.capitalize = function(){
    return this.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
};

// Replaces dashes and underscores
String.prototype.humanize = function() {
    return this.replace(/[-'_']/g,' ');
};

// whatIsIt {String} = Description of what you're debugging
// error {boolean} set to true if you want it tolog the object as an error
TM.helpers.debug = function (object, whatIsIt, error){
  if (error === true) {
    Mojo.Log.error(whatIsIt, Object.inspect($H(object)));
  } else {
    Mojo.Log.info(whatIsIt, Object.inspect($H(object)));
  }
}

// Omits default items so I can do whatever I want in the menu
TM.menuAttr = {omitDefaultItems: true};

// Default menu items used throughout the application
TM.menuModel = { 
  visible: true, 
  items: [ 
    Mojo.Menu.editItem,
    //{label: "Sign Out", command: "sign-out"},
    {label: "Preferences & Accounts", command: "show-preferences"},
    {label: "Get Help & Contact Us", command: "contact-us"}
//    Mojo.Menu.helpItem
  ],
  addItems: function (menuItems){
    var offset = 1; // where to insert the new items. Using 1 right now so that it comes after the "Edit" menu item
    var items = this.items.slice(0, offset);
    items = items.concat(menuItems);
    Mojo.Log.info('Length of items', items.length);
    Mojo.Log.info('visibility', this.visible);
    return {visible: this.visible, items: items.concat(this.items.slice(offset))};
  }
};

// Uses default values from above to setup the default menu
TM.helpers.setupDefaultMenu = function (){
  this.controller.setupWidget(Mojo.Menu.appMenu, TM.menuAttr, TM.menuModel);
}

TM.helpers.setupFontSize = function (stageController){
  var path = 'stylesheets/large-fonts.css';
  if (!stageController) {
    stageController = Mojo.Controller.getAppController().getStageController('TweetMe');
  }
  if (TM.prefs.fontSize === 'normal') {
    stageController.unloadStylesheet(path);
  } else {
    stageController.loadStylesheet(path);
  }
}

TM.helpers.setupMultiAccountStyles = function (stageController){
  var path ='stylesheets/multi-accounts.css';
  if (!stageController) {
    stageController = Mojo.Controller.getAppController().getStageController('TweetMe');
  }
  if (Account.numberOfAccounts() > 1) {
    Mojo.Log.info('Has multi accounts. Loading stylesheet!!!');
    stageController.loadStylesheet(path);
  } else {
    Mojo.Log.info('Has one account. Unloading stylesheet!!!');
    stageController.unloadStylesheet(path);
  }
}

// Is the stage maximized and active?
TM.helpers.isStageActive = function (){
  var currentStageController = Mojo.Controller.getAppController().getStageController('TweetMe');
  var isStageActive = false;
  if (currentStageController.isActiveAndHasScenes()) {
  	isStageActive = true;
  }
  return isStageActive;
}

// Sets up a button tap that is really easy to use and auto cleans up
TM.helpers.setupButton = function (element, assistant, functionToCall){
	if (Object.isString(element)) {
		element = assistant.controller.get(element);
	}
	assistant.buttonTapHandlers = []; // So it can handle multiple button taps & clean them all up in one shot. Later in defaultCleanup method you can loop through the button handlers and stoplistening on them all
	assistant.buttonTapHandlers.push({element: element, functionToCall: TM.helpers.buttonTap.curry(functionToCall, element)});
	assistant.controller.listen(element, Mojo.Event.tap, assistant.buttonTapHandlers[assistant.buttonTapHandlers.length - 1].functionToCall);
}

// Automaticalls cleans up listeners for all buttons in a scene
// TODO: Fix cleanup code. May need to store buttonTapHandlers in the controller (assistant.controller in setupButton function)
// Or maybe bind a different object
TM.helpers.cleanupButtons = function (){
	try {
		Mojo.Log.info('Automatically cleaning up button handlers');
		//Mojo.Log.logProperties(this);
		// Don't think it's seeing them
		if (this.buttonTapHandlers) {
			for (var i = 0; i < this.buttonTapHandlers.length; i++) {
				Mojo.Log.info('About to clean a button');
				this.stopListening(this.buttonTapHandlers[i].element, Mojo.Event.tap, this.buttonTapHandlers[i].functionToCall);
				Mojo.Log.info('Cleaning up button called', this.buttonTapHandlers[i].element.getProperty('id'));
			}
		}
	} catch(e) {
		Mojo.Log.info(e);
	}
}

TM.helpers.buttonTap = function (functionToCall, element){
	element.addClassName('selected');
	Mojo.Log.info('Calling function for this button');
	functionToCall();
	setTimeout(function(){
	  try {
  		element.removeClassName('selected');
  	} catch(e) {
  	  Mojo.Log.info("That element doesn't exist. Couldn't remove class name, selected");
  	}
	}, 200);
}

TM.helpers.blockTaps = function (assistant){
  var blocker = assistant.controller.get('divBlockTaps');
	if (blocker) {
	  blocker.addClassName('block');
	}
}

TM.helpers.unblockTaps = function (assistant){
	var blockerDiv = assistant.controller.get('divBlockTaps');
	if (blockerDiv.hasClassName('block')) {
		blockerDiv.removeClassName('block');
	}
}
 
Object.extend(Date.prototype, {
  /**
   * @param format {String} The string used to format the date.
   * Example:  new Date().strftime("%A %I:%M %p")
   */
  strftime: function(format) {
    // var day = this.getUTCDay(), month = this.getUTCMonth();
    // var hours = this.getUTCHours(), minutes = this.getUTCMinutes();
    var day = this.getDay(), month = this.getMonth();
    var hours = this.getHours(), minutes = this.getMinutes();
    function pad(num) { return num.toPaddedString(2); };
 
    return format.gsub(/\%([aAbBcdDHiImMpSwyY])/, function(part) {
      switch(part[1]) {
        case 'a': return $w("Sun Mon Tue Wed Thu Fri Sat")[day]; break;
        case 'A': return $w("Sunday Monday Tuesday Wednesday Thursday Friday Saturday")[day]; break;
        case 'b': return $w("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec")[month]; break;
        case 'B': return $w("January February March April May June July August September October November December")[month]; break;
        case 'c': return this.toString(); break;
        case 'd': return this.getUTCDate(); break;
        case 'D': return pad(this.getUTCDate()); break;
        case 'H': return pad(hours); break;
        case 'i': return (hours === 12 || hours === 0) ? 12 : (hours + 12) % 12; break;
        case 'I': return pad((hours === 12 || hours === 0) ? 12 : (hours + 12) % 12); break;
        case 'm': return pad(month + 1); break;
        case 'M': return pad(minutes); break;
        case 'p': return hours > 11 ? 'pm' : 'am'; break;
        case 'S': return pad(this.getUTCSeconds()); break;
        case 'w': return day; break;
        case 'y': return pad(this.getUTCFullYear() % 100); break;
        case 'Y': return this.getUTCFullYear().toString(); break;
      }
    }.bind(this));
  }
});

var DateHelper = {
  // Takes the format of "Jan 15, 2007 15:45:00 GMT" and converts it to a relative time
  // Ruby strftime: %b %d, %Y %H:%M:%S GMT
  time_ago_in_words_with_parsing: function(from, length) {
  	if (length === 'short') {
//  		this.min = '<span class="number">minute</span>';
//  		this.hour = 'hour';
//  		this.day = 'day';
//  		this.month = 'month';
//  		this.year = 'year';
		this.lessThanAMinute = '<span class="number">&lt;1</span> minute'; // <1 minute
  		this.ago = '';
  	}
  	else {
//  		this.min = 'minute';
//  		this.hour = 'hour';
//  		this.day = 'day';
//  		this.month = 'month';
//  		this.year = 'years';
		this.lessThanAMinute = '&lt;1 minute';
  		this.ago = ' ago';
  	}
    var date = new Date; 
    date.setTime(Date.parse(from));
    return this.time_ago_in_words(date);
  },
  
  time_ago_in_words: function(from) {
    return this.distance_of_time_in_words(new Date, from);
  },
 
  distance_of_time_in_words: function(to, from) {
    var distance_in_seconds = ((to - from) / 1000);
    var distance_in_minutes = (distance_in_seconds / 60).floor();
 
    if (distance_in_minutes == 0) { return this.lessThanAMinute + this.ago; }
    if (distance_in_minutes == 1) { return '<span class="number">1</span> minute' + this.ago; }
    if (distance_in_minutes < 60) { return '<span class="number">' + distance_in_minutes + '</span> minutes' + this.ago; }
    if (distance_in_minutes < 90) { return '<span class="number">1</span> hour' + this.ago; }
    if (distance_in_minutes < 1440) { return '<span class="number">' + (distance_in_minutes / 60).round() + '</span>' + ' hours' + this.ago; }
    if (distance_in_minutes < 2880) { return '<span class="number">1</span> day' + this.ago; }
    if (distance_in_minutes < 43200) { return '<span class="number">' + (distance_in_minutes / 1440).round() + '</span>' + ' days' + this.ago; }
    if (distance_in_minutes < 86400) { return '<span class="number">1</span> month' + this.ago; }
    if (distance_in_minutes < 525960) { return '<span class="number">' + (distance_in_minutes / 43200).round() + '</span>' + ' months' + this.ago; }
    if (distance_in_minutes < 1051199) { return '<span class="number">1</span> year' + this.ago; }
 
    return 'over <span class="number">' + (distance_in_minutes / 525960).round() + '</span>' + ' years' + this.ago;
  }
};


TM.helpers.filterSearchTweets = function (tweets){	
	for (i = 0; i < tweets.length; i++) {
		tweets[i].favorite = false; //needs text value for use in templates
		//Sometimes this throws errors
		try {
			tweets[i].source = TM.helpers.fromHTMLSpecialChars(tweets[i].source);
		}
		catch (e) {
			Mojo.Log.info("Couldn't parse tweet source. Error is:", e);
		}
		tweets[i].from_search = true;

		tweets[i].user = {};
		tweets[i].user.profile_image_url = tweets[i].profile_image_url;
		tweets[i].user.screen_name = tweets[i].from_user;
		tweets[i].user.display_name = tweets[i].user.screen_name;
		tweets[i].no_user_object = true;
	}
	tweets = TM.helpers.filterTweets(tweets);
	return tweets;
}

// filters Tweets: marks them as favorites, whether they are mentions -- or the person's own tweets, whether they are conversations, LATER: Whether they have images, etc.
// @param firstFetch {boolean} set to true if this is the first fetch. That way it will hide the new divider
TM.helpers.filterTweets = function (tweets, firstFetch){
	// If you pass in just a tweet object, not wrapped in an array, it will wrap it in an array for you.
	
	var date = new Date();
	var checkedAt = date.strftime("%i:%M %p");
	var checkedAtMilli = date.getTime();
	if (firstFetch === true) {
	  //checkedAt = '<span style="display: none;">' + checkedAt + '</span>';
	}
	if (!Object.isArray(tweets)) {
	  tweets = [tweets];
	}
	var user = TM.prefs.userInfo;
	user.screen_name_regex = new RegExp("(^|\\s|\\(\\[|,|\\()" + RegExp.escape("@" + user.screen_name) + "([^a-zA-Z0-9_]|$)","i");
	
	for (i=0; i < tweets.length; i++) {
		tweets[i].type = ''; //Sets to default value
		if (tweets[i].sender) {
		    tweets[i].type = 'message';
		    tweets[i].user = tweets[i].sender;
		    tweets[i].sender = null;
		}
		// Checks if the tweet is in reply to the current user and sets type to mention if it is.
		try {
  			if ( tweets[i].in_reply_to_user_id === user.id || user.screen_name_regex.test(tweets[i].text) ) {
	  			tweets[i].type = 'mention';
	  		}
		} catch(e) {
		  	Mojo.Log.error('Error when parsing');
		  	Mojo.Log.error(e);
		}
		// Sets the display name based on preferences
		if (!tweets[i].user) {
		  	tweets[i].user = {};
		}
		try {
  			tweets[i].user.display_name = tweets[i].user.screen_name;
  		} catch(e) {
	  	  	Mojo.Log.info("Couldn't get screen_name, setting to signed in user's screen name");
	  	  	tweets[i].user.display_name = TM.prefs.username;
	  	}
		if (TM.prefs.displayName === 'real_name' && !Object.isUndefined(tweets[i].user.name)) {
		  	tweets[i].user.display_name = tweets[i].user.name;
		}

		// If the tweet if from the current user, set tweet type as my-tweet. Sets to my-tweet after mention because it has a higher priority. 
		// If you mention yourself you want to see you posted it, not a mention.
		if (!Object.isUndefined(tweets[i].user) && tweets[i].user.id === user.id) {
			tweets[i].type = 'my-tweet';
		}
		
		// add classes to the metadata of the tweet, like "photos", "conversation" etc. This will make certain icons appear in the timeline view if it has certain items in the tweet
		tweets[i].metadata = "";
    // If the tweet in in_reply_to_status_id it is a convo
		if (tweets[i].in_reply_to_status_id) {
		  tweets[i].conversation = true;
		  tweets[i].metadata += " conversation";
		}
		
		tweets[i].simpleFormattedText = TM.helpers.simpleFormat(tweets[i].text);
		
		tweets[i].favorite = 'unfavorited'; //needs text value for use in templates
		if (tweets[i].favorited === true) {
			tweets[i].favorite = 'favorited';
		}
		if (!tweets[i].checkedAt) {
		  tweets[i].checkedAt = checkedAt; // a string with the time ago in words
		  tweets[i].checkedAtMilli = checkedAtMilli;
		}
		tweets[i].prettyTime = DateHelper.time_ago_in_words_with_parsing(tweets[i].created_at, 'short');
		
		// location data
		var place = null;
		var bounding_box = null;
		var latitude = null; 
		var longitude = null;
		
		if(tweets[i].place != null) {
			place = tweets[i].place.full_name;
			bounding_box = tweets[i].place.bounding_box.coordinates[0];
		}
		if(tweets[i].geo != null) {
			latitude = tweets[i].geo.coordinates[0];
			longitude = tweets[i].geo.coordinates[1];
		}
		
		tweets[i].geolocation = {
			latitude: latitude, 
			longitude: longitude,
			bounding_box: bounding_box, // array
			place: place
		};
	}
	return tweets;
}

//Links screenames, urls, emails, and hastags
TM.helpers.autoFormat = function (str){
	//str = TM.helpers.autolink(str);
	str = PalmSystem.runTextIndexer(str);
	str = str.replace(/file:\/\/\/usr\/palm\/emoticons\/emoticon-/gi, "images/emoticons/"); // Replaces the path to the Palm versions of the emoticons with the path local to TweetMe
	str = TM.helpers.autolinkTwitterScreenname(str);
	str = TM.helpers.autolinkTwitterHashtag(str);
	return str;
}

//Just bolds screenames and hashtags
TM.helpers.simpleFormat = function (str){
	str = TM.helpers.autolinkTwitterScreenname(str, '<strong>@#username#</strong>');
	str = TM.helpers.autolinkTwitterHashtag(str, '<strong>##hashtag#</strong>');
	return str;
}
 
// Caches regexp
TM.helpers.re_noemail = /(^|\s|\(|:)((http(s?):\/\/)|(www\.))(\w+[^\s\)<]+)/gi;
TM.helpers.re_nourl = /(^|\s|\()([a-zA-Z0-9_\.\-\+]+)@([a-zA-Z0-9\-]+)\.([a-zA-Z0-9\-\.]*)([^\s\)<]+)/gi;

TM.helpers.autolink = function(str, type, extra_code, maxlen) {
	if (!type) {
		type = 'both';
	}

	var re_noemail = TM.helpers.re_noemail;
	var re_nourl   = TM.helpers.re_nourl;

	if (type != 'email')
	{
		while (ms = re_noemail.exec(str)) {
			var period = ''
			if ( /\.$/.test(ms[6]) ) {
				period = '.';
				ms[6] = ms[6].slice(0, -1);
			}
			
			/*
				sometimes we can end up with a null instead of a blank string,
				so we need to force the issue in javascript.
			*/
			for (var x=0; x<ms.length; x++) {
				if (!ms[x]) {
					ms[x] = '';
				}
			}

			if (extra_code) {
				extra_code = ' '+extra_code;
			} else {
				extra_code = ''
			}
			
			var desc = ms[5]+ms[6];

			if (maxlen && maxlen > 0 && desc.length > maxlen) {
				desc = desc.substr(0, maxlen)+'...';
			}

			var newstr = ms[1]+'<a href="http'+ms[4]+'://'+ms[5]+ms[6]+'"'+extra_code+'>'+desc+'</a>'+period;
			str = str.replace(ms[0], newstr);
		}
	}

	if (type != 'url')
	{
		while (ms = re_nourl.exec(str))
		{
			var period = ''
			if ( /\./.test(ms[5]) ) {
				period = '.';
				ms[5] = ms[5].slice(0, -1);
			}
			
			/*
				sometimes we can end up with a null instead of a blank string,
				so we need to force the issue in javascript.
			*/
			for (var x=0; x<ms.length; x++) {
				if (!ms[x]) {
					ms[x] = '';
				}
			}
			str = str.replace(ms[0], ms[1]+'<a href="mailto:'+ms[2]+'@'+ms[3]+'.'+ms[4]+ms[5]+'">'+ms[2]+'@'+ms[3]+'.'+ms[4]+ms[5]+'</a>'+period);
			//air.trace(str);
		}
	}

	return str;


}

/**
 * turns twitter style username refs ('@username') into links
 * by default, the template used is <a href="http://twitter.com/#username#">@#username#<a/>
 * pass the second param to give it a custom template
 * 
 * @param {string} str
 * @param {string} tpl  default is '<a href="http://twitter.com/#username#">@#username#</a>'
 * @return {string}
 */
// Caches regexp
TM.helpers.re_uname = /(^|\s|\(\[|,|\()@([a-zA-Z0-9_]+)([^a-zA-Z0-9_]|$)/gi;

TM.helpers.autolinkTwitterScreenname = function(str, tpl) {
	if (!tpl) {
		tpl = '<span class="tappable-username" username="#username#">@#username#</span>';
	}
	
	var re_uname = TM.helpers.re_uname;
	
	var ms = [];
	while (ms = re_uname.exec(str))
	{
		
		/*
			sometimes we can end up with a null instead of a blank string,
			so we need to force the issue in javascript.
		*/
		for (var x=0; x<ms.length; x++) {
			if (!ms[x]) {
				ms[x] = '';
			}
		}
		
		var repl_tpl = tpl.replace(/#username#/gi, ms[2]);
		str = str.replace(ms[0], ms[1]+repl_tpl+ms[3]);

	}
	return str;
}


// Pretty sef explanatory
TM.helpers.getTwitterScreennames = function (str){
  var re_uname = TM.helpers.re_uname;
	var currentUsername = '@' + TM.prefs.username;
	str = str.replace(new RegExp(RegExp.escape(currentUsername), 'gi'), '');
	var screennames = str.match(re_uname);
	if (!Object.isArray(screennames)) {
	  screennames = [];
	}
	for (var i = 0; i < screennames.length; i++) {
	  // screennames[i] = screennames[i].replace(/,|-|;| |:|\./gi, '');
	  // \W
	  screennames[i] = "@" + screennames[i].replace(/\W/gi, '');
	}
	return screennames;
}



/**
 * turns twitter style hashtags ('#hashtag') into links
 * by default, the template used is <a href="http://search.twitter.com/search?q=#hashtag_enc#">##hashtag#<a/>
 * pass the second param to give it a custom template
 * 
 * @param {string} str
 * @param {string} tpl  default is '<a href="http://search.twitter.com/search?q=#hashtag_enc#">##hashtag#<a/>'
 * @return {string}
 */
TM.helpers.autolinkTwitterHashtag = function(str, tpl) {
	if (!tpl) {
		tpl = '<span class="hashtag" hashtag="##hashtag#">##hashtag#</span>';
	}
	
	var re_hashtag = /(^|\s|\()#([a-zA-Z0-9\-_\.+:=]{1,}\w)([^a-zA-Z0-9\-_+]|$)/gi
	
	var ms = [];
	while (ms = re_hashtag.exec(str))
	{
		
		/*
			sometimes we can end up with a null instead of a blank string,
			so we need to force the issue in javascript.
		*/
		for (var x=0; x<ms.length; x++) {
			if (!ms[x]) {
				ms[x] = '';
			}
		}
		
		var repl_tpl = tpl.replace(/#hashtag#/gi, ms[2]);
		repl_tpl = repl_tpl.replace(/#hashtag_enc#/gi, encodeURIComponent(ms[2]));
		str = str.replace(ms[0], ms[1]+repl_tpl+ms[3]);

	}
	return str;
}

TM.helpers.filterCounts = function (userInfo){
	userInfo.condensed_friends_count = TM.helpers.condenseNumber(userInfo.friends_count);
	userInfo.condensed_followers_count = TM.helpers.condenseNumber(userInfo.followers_count);
	userInfo.condensed_statuses_count = TM.helpers.condenseNumber(userInfo.statuses_count);
	return userInfo;
}

//Pass in user object and it will return a user object with new properties for condensed counts for the user info scene
TM.helpers.condenseNumber = function (string){
	//starts as a number, but we need to convert to a string
	string = string + '';
	if (string.length <= 3) {
		//do nothing
	}
	else if (string.length <= 4) { //ex: 4,666 (without comma of course)
		string = string.truncate(1, '') + '<span class="comma">,</span>' + string.slice(1);
	}
	else if (string.length <= 5) { //ex: 54,666 (without comma of course)
		string = string.truncate(2, '') + 'k<span class="plus">+</span>';
	}
	else if (string.length <= 6) { //ex: 754,666 (without comma of course)
		string = string.truncate(3, '') + 'k<span class="plus">+</span>';
	}
	else if (string.length <= 7) { //ex: 1,754,666 (without commas of course)
		var afterDot = string.slice(1, 2); //second position
		if (afterDot != '0') {
			string = string.truncate(1, '') + '.' + afterDot + 'm';
		}
		else { //if the second position is something other than 0
			string = string.truncate(1, '') + 'm';
		}
	}
	Mojo.Log.info('Condensed string is.....', string);
	return string;
}


// For sharing via email and sms
// @param command {String} can be either "share-via-email" or "share-via-sms"
// Example TM.helpers.share("My cool tweet", "paulium89", "share-via-email");
// Example retweet TM.helpers.share(undefined, undefined, {action: 'retweet-new', status_id: 2314963293401, screen_name: });
TM.helpers.share = function(text, screen_name, command) {
  if (command && command.action === 'retweet-new') {
    Mojo.Log.info('Attempting new style retweet');
    this.controller.stageController.popScene();
    Mojo.Controller.getAppController().showBanner({messageText: 'Message was retweeted', icon: 'checkmark-mini-icon.png'}, '', '');
    Mojo.Log.info('Status id from command object is', command.status_id);
    Twitter.retweet(command.status_id, {onSuccess: function(){}});
  } else if (command === 'copy-tweet') {
    this.controller.stageController.setClipboard(TM.helpers.superSanitizeHTML(text), false);
    Mojo.Controller.getAppController().showBanner({messageText: "Tweet copied", icon: 'checkmark-mini-icon.png'}, '', '');
  } else {
    var appId = command === 'share-via-email' ? 'com.palm.app.email' : 'com.palm.app.messaging';
    var tweetText = command === 'share-via-email' ? text : TM.helpers.superSanitizeHTML(text);
    var fullText = '@' + screen_name + ' said "' + tweetText + '"';
    this.controller.serviceRequest("palm://com.palm.applicationManager", 
      {
        method: 'open',
        parameters: {
          id: appId,
          params: {
            summary: "A tweet that you might like from @" + screen_name,
            text: fullText,
            messageText: fullText
          }
        }
      }
    ); 
  }
}

//
// Helps to easily setup Timelines for the main scene. Used in home, mentions, favorites, searches etc.
//
TM.helpers.setupTimeline = function(sceneName, twitterFunction) {
	this.successfulFetchHandler = TM.helpers.successfulFetch.bind(this, sceneName);
	this.twitterFunction = twitterFunction;

	var statusCode = this.handleSearch403s === true ? 403 : 1000000; // Hanlde 403s for search if the assistant has handleSearch403s set to true. See nearby-assistant.js to see how it's used
	this.twitterFunction({onSuccess: this.successfulFetchHandler, onFail: {status: statusCode, functionToCall: TM.helpers.noMoreTweetsToLoad.bind(this)}}, {count: TM.prefs.numTweetsToLoad, rpp: TM.prefs.numTweetsToLoad});
	
	//Sets up the base layout, all the bottom nav and username icons.
	TM.helpers.setupBaseLayout.call(this, sceneName); //var setupBaseLayout = 
//	setupBaseLayout(sceneName);	
	
	//Sets up the timeline list. Will be updated with actualy tweets in the successfulHomeFetch method.
	TM.helpers.setupBaseTimeline.call(this);
}


// Usually called from search when the since_id is too old. This is a really dumb error.
TM.helpers.noMoreTweetsToLoad = function () {
  var oldButton = this.controller.get('divLoadOld');
  if (oldButton) {
    oldButton.removeClassName('selected');
  }
  var bigLoader = this.controller.get('divBigLoader');
  if (bigLoader) {
    bigLoader.addClassName('pop');
  }
  Mojo.Controller.getAppController().showBanner('No more tweets to load', '', '');
}



TM.helpers.setupBaseLayout = function (sceneName){
  this.sceneName = sceneName; // Used later for setting unread status for notifications
	this.stageController = Mojo.Controller.getAppController().getStageController('TweetMe');
	Mojo.Log.info('saved stage contoller');
	var baseLayout = Mojo.View.render({template: 'partials/base-layout'});
	var hasUnreadItems = '';
	// Clears the unread dot if you are viewing the scene that has an unread dot
	if (Account.getCurrent().unreadItems[sceneName]) {
	  Account.getCurrent().unreadItems[sceneName].hasUnread = false;
	  TM.prefStorage.storePrefs();
	}
	if (TM.helpers.hasUnreadItems() === true) {
	  hasUnreadItems = 'has-unread-items';
	}
	
	var bottomActions = Mojo.View.render({object: {prefs: TM.prefs.userInfo, scene: {name: sceneName, nameUpcased: sceneName.humanize(), hasUnread: hasUnreadItems}}, template: 'partials/bottom-actions'});
	
	TM.notifications.checkTimelines(this, this.sceneName);
	this.baseLayout = this.controller.get('divBaseLayout');
	this.baseLayout.innerHTML = baseLayout;

	this.bottomActionsWrapper = this.controller.get('divActionsAndNavWrapper');
	this.bottomActionsWrapper.innerHTML = bottomActions;
	
	TM.helpers.setupMultipleAccountAvatars.call(this);
	
	this.quickBar = this.controller.get('divQuickBarWrapper');
	Mojo.Log.info('Setting up quick bar events from setupBaseLayout');
	QuickBar.setupEvents.call(this);
	this.loadButton = this.controller.get('divLoadOld');
	this.refreshButton = this.controller.get('divLoadNew');
	this.listWidget = this.controller.get('listWidget');
	
	
	//Sets up the code to hide/show the bottom nav when the card is minimized/maximized
	TM.helpers.toggleBottomNav.call(this);
	var pushSceneName = 'compose';
	var extraSceneParams = undefined;
	if (this.controller.sceneName === 'messages') {
	  pushSceneName = 'go-to-user';
	  extraSceneParams = {showDirectMessage: true};
	}
	TM.helpers.setupButton( 'divComposeButton', this, (function(){this.controller.stageController.pushScene(pushSceneName, extraSceneParams);}).bind(this) );
	
	this.toggleNavHandler = TM.helpers.toggleNav.bind(this);
	this.controller.listen('divActionsRight', Mojo.Event.tap, this.toggleNavHandler); // Tap on the username or the icon
	
	//Sets up the navactions
	this.navActionsWrapper = this.controller.get('divNavActionsWrapper');
	this.setupActions = TM.helpers.setupActions.bind(this);
	this.setupActions();
	
	Mojo.Log.info('Base layout has been setup');
}

TM.helpers.setupMultipleAccountAvatars = function (){
  TM.helpers.renderMultipleAccountAvatars.call(this);
  // Sets up the event and event handler
	this.handleAccountTap = TM.helpers.handleAccountAvatarTap.bindAsEventListener(this)
  this.controller.listen(this.accountSelector, Mojo.Event.tap, this.handleAccountTap);
}

TM.helpers.renderMultipleAccountAvatars = function (){
  var accounts = Account.all();
  var html = Mojo.View.render({template: 'partials/close-arrow'});
  for (var i = 0; i < accounts.length; i++) {
    var userInfo = accounts[i].userInfo;
    var isCurrent = '';
    if (Account.isCurrent(userInfo.id)) {
      isCurrent = 'selected';
    }
    html += Mojo.View.render({object: {userInfo: userInfo, currentAccountClass: isCurrent}, template: 'partials/multi-account-avatar'});;
  }
  this.accountSelector = this.controller.get('divAccountSelector');
  this.accountSelector.innerHTML = html;
}

// When you tap on an avatar to change your account
TM.helpers.handleAccountAvatarTap = function (event){
  var account = event.target.parentElement;
  if (event.target.readAttribute('id') === 'divCloseArrow') {
    Mojo.Log.info('Closing the nav');
    TM.helpers.toggleNav.call(this);
  } else {
    var userId = account.readAttribute('accountid');
    if (Account.isCurrent(userId)) {
      TM.helpers.toggleNav.call(this);
    } else {
      this.controller.get('divAccount' + Account.getCurrent().userInfo.id).removeClassName('selected'); // Gets the old account and removes the blue border
    }
    Account.setToCurrent(userId);
    this.controller.get('divAccount' + userId).addClassName('selected');
  }
}

TM.helpers.setupBaseTimeline = function (){
	this.timelineModel = { items: [] };
	TM.helpers.setupList.call(this); // Need to change all these bind(this)() to call or apply methods. bind(this)() is just dumb.
	this.loadMoreHandler = TM.helpers.loadMore.bind(this);
	this.updateListHandler = TM.helpers.updateList.bind(this);
	this.setupLoadButtonsHandler = TM.helpers.setupLoadButtons.bind(this);
	this.setupLoadHandler = TM.helpers.setupAutoLoad.bind(this); // for exhibition mode
	this.showTweetHandler = TM.helpers.showTweetView.bindAsEventListener(this);
	
//	this.highlightAvatarHandler = TM.helpers.highlightAvatarOnHold.bindAsEventListener(this);
	if (!this.listWidget) {
		this.listWidget = this.controller.get('listWidget');
	}
//	this.controller.listen(this.listWidget, Mojo.Event.hold, this.highlightAvatarHandler);
	this.controller.listen(this.listWidget, Mojo.Event.listTap, this.showTweetHandler);
}

TM.helpers.showTweetView = function (event){
	//Called when a tweet is tapped on.
	//Mojo.Log.info('Event when tweet is pushed on', Object.inspect($H(event)));
	//Mojo.Log.info('Event.originalEvent', Object.inspect($H(event.originalEvent)));
	// If avatar was tapped on
	var target = event.originalEvent.target;
	// If they tapped on an avatar
	if (target.hasClassName('avatar_cover')) {
	  /*TM.helpers.highlightAvatar(target); // Removes the default selected state (where it looks like the tweet is pressed down)
	  setTimeout(function (){
	    target.removeClassName('selected');
	  }, 800);
	  */
	  // TODO This really should be handled in the user info scene. It should check the user and if it has a bunch of undefined values then just check the screen_name
	  if (this.timelineModel.items[event.index].no_user_object) {
	  	this.controller.stageController.pushScene('user-info', this.timelineModel.items[event.index].user.screen_name);
	  }
	  else {
	  	this.controller.stageController.pushScene('user-info', this.timelineModel.items[event.index].user);
	  }
	} else {
	  this.controller.stageController.pushScene('tweet-view', this.timelineModel.items[event.index], event.index); //Gives the TweetView the entire tweet object to extract all info including user info
	}
}

// TODO: Can probably be removed. I found out you can use x-mojo-tap-highlight to add the selected class even when within another element with x-mojo-tap-highlight. Go Palm.
// Removes the default selected state (where it looks like the tweet is pressed down)
TM.helpers.highlightAvatar = function (avatarDiv){
  avatarDiv.addClassName('selected');
  avatarDiv.up('.tweet').removeClassName('selected');
}

TM.helpers.maxTweetsToRender = 40; //Used when setting up the list and when jumping to the bottom from the quick jump bar
// Refactored to a separate method so that I can use the same timelime options, but without refresh load, and a custom model if needed. I used this in the drafts assistant
TM.helpers.setupList = function (){
  this.listLength = 0;
  this.listWidget = this.controller.get('listWidget');
  this.controller.setupWidget("listWidget",
  	{ 
  		itemTemplate: "partials/timeline-row",
  		listTemplate: "partials/timeline-list", 
  		hasNoWidgets: true, // May have to add this as an option to setupTimeline in case other lists need widgets inside them
  		swipeToDelete: false, 
  		reorderable: false,
  		initialAverageRowHeight: 130,
  		//itemsCallback: TM.helpers.itemsCallback.bind(this),
  		dividerFunction: TM.helpers.timelineDividerFunction.bind(this),
  		dividerTemplate: 'partials/divider',
  		renderLimit: TM.helpers.maxTweetsToRender, //default is 20
  		lookahead: 18 //default is 15
  	}, 
  	this.timelineModel);
  Mojo.Log.info('List has been setup');
}

// Couldn't get this to work reliably and no noticeable speed increase. Need to research how it works more thoroughly
TM.helpers.itemsCallback = function (listWidget, offset, count){
  Mojo.Log.info("offset = ", offset)
	Mojo.Log.info("count = ", count)		
	Mojo.Log.info("list length = ", this.timelineModel.items.length)		
  
//  		everytime there is a request to get a # of items out of the list's model - add that many more to it
//  		as long as we haven't retrieved the maximum # of items (or maybe your list doesn't have a max...)
//  		***This could be substituted with a remote call to a server to get more items...		
//  		if ((offset > 50) && (this.timelineModel.items.length < this.listLength)) {
//  			this.timelineModel.items.push.apply(this.list, this.makeItems(count, this.list.length));
//  		}
  			
  		
//  		 We delay returning the items by .1 seconds in order to more accurately simulate 
//  		 data being returned from an async service request.
//  		 If the data is available immediately, it's fine to call 'updateItems' from within this function.
  		listWidget.mojo.noticeUpdateItems.delay(0.1, offset, this.timelineModel.items.slice(offset, offset+count));
  		
//  		 It's okay to call this every time, but only the first call will have any affect.
  		listWidget.mojo.setLength(this.timelineModel.items.length);
}

TM.helpers.timelineDividerFunction = function (itemModel){
  // Adds checkAtMilli so that even if the list has two dividers with the same two times it will still show the second divider. Otherwise it will show just one divider.
  return itemModel.checkedAt + '<span class="milliseconds">' + itemModel.checkedAtMilli + '</span>'; 
}

TM.helpers.successfulFetch = function (sceneName, transport){
	Mojo.Log.info('Successfully fetched tweets');
	try {
    TM.helpers.setupPolledReparseDatesForTimeline.call(this)
  	//setTimeout(TM.helpers.showRefresh.bind(this), 350); //Shows refresh after 350 milliseconds
  	this.controller.get('divBigLoader').addClassName('pop');
  	// TODO: refactor so that it can just call filterTweets and determine whether to filter them as search tweets in that method (so I don't have to know the details
  	if (transport.responseJSON.results) { // If it has results defined then it is from the search API and needs to be filtered through the filterSearchTweets method
  		this.pageNumber = 1;
  		this.timelineModel.items = TM.helpers.filterSearchTweets(transport.responseJSON.results);
  	} else {
  		this.timelineModel.items = TM.helpers.filterTweets(transport.responseJSON, true);
  	}
  	Mojo.Log.info('Length of returned tweets', transport.responseJSON.length);
  	TM.helpers.showEmptyList.call(this, transport.responseJSON, 'Tweets');
  	TM.helpers.setupCursors.call(this, transport);
  	Mojo.Log.info('Load cursors set up');
  	//this.listWidget.mojo.noticeUpdatedItems(0, this.timelineModel.items.slice(0, 30));
  	//this.listWidget.mojo.setLength(this.timelineModel.items.length);
  	this.listWidget.mojo.noticeUpdatedItems(0, this.timelineModel.items);
  	Mojo.Log.info('Next cursor is', this.nextCursor);
  	this.setupLoadButtonsHandler();

	if(sceneName == 'exhibition') {
		this.setupLoadHandler();
	}
	
  	// Updates the page to say there is nothing to display, IF there is nothing to display.
  } catch(e) {
    Mojo.Log.error(e);
  }
}

// bind this to the scene that needs date parsing. Done automatically if called from TM.helpers.successfulFetch
TM.helpers.setupPolledReparseDatesForTimeline = function (){
  this.reparseAndSetupPolledDates = function (){
    setTimeout(function (){
      TM.helpers.reparseDates.call(this);
      TM.helpers.setupPolledReparseDates.call(this);
    }.bind(this), 0);
  }.bind(this); // Used when setting up the stage activate event
  TM.helpers.setupPolledReparseDates.call(this);
}

// Sets up the loading cursors (what to load when refresh or load more is touched)
// Since_id is passed back from search queries. Used for the previous cursor
// TODO: make it so that instead of setting up cursors I call a getNextCursor and getPreviousCursor method that gets them WHEN I need them. THat way if I delete a tweet it factors that in when I press refresh and I don't have to handle that everytime I delete a tweet from the top of a list
// NOTE: Got cursors working correctly. Probably don't need to do the TODO above, and also can probably remove the since_id on the search. It kept bugging out when I'd try to use it.
TM.helpers.setupCursors = function (transport, since_id){
  if (Object.isArray(transport)) {
    if (transport.length >= minTweets) {
      this.nextCursor = transport.last().id - 1;
    } else {
      this.nextCursor = 0;
    }
    /*
    if (!Object.isUndefined(since_id)) { // Just added the bang ! 4-26-10
       If it is from a search request and since_id is provided
       this.prevCursor = transport[0].id + 1;
      this.prevCursor = since_id;
    } else {
    */
    Mojo.Log.info('Transport id is....', transport[0].id);
    this.prevCursor = transport[0].id;
    /*
    if (since_id) {
      this.prevCursor = since_id;
    }
    */
  } else {
    if (transport.responseJSON.length >= minTweets || (transport.responseJSON.results && transport.responseJSON.results.length >= minTweets)) {
    	this.nextCursor = transport.responseJSON.max_id || transport.responseJSON.last().id - 1; //Storing the exact id makes it return the last status as a duplicate, must subtract 1
    	Mojo.Log.info('Next cursor is', this.nextCursor);
    } else {
    	this.nextCursor = 0; //This will cause the load button to hide
    }
    if (Object.isUndefined(transport.responseJSON.results)) {
      Mojo.Log.info('Transport id is....', transport.responseJSON[0].id);
      this.prevCursor = transport.responseJSON[0].id;
    } else {
      Mojo.Log.info('transport.responseJSON.results exists!');
//      this.prevCursor = transport.responseJSON.since_id; // Using this was buggy. Kept getting weird refresh stuff
        this.prevCursor = transport.responseJSON.results[0].id;
    }
  }
  if (this.sceneName) {
    Mojo.Log.info('Has scene name ready to update');
    TM.notifications.saveLastLoadedId(this.prevCursor, this.sceneName, true);
  }
  Mojo.Log.info('From setupCursors Next cursor is', this.nextCursor);
  Mojo.Log.info('From setupCursors Previous cursor is', this.prevCursor);
}

// Shows text for an empty list if array size is 0. Array is usually tweets returned from JSON response
TM.helpers.showEmptyList = function (array, textToDisplay){
    Mojo.Log.info('Seeing if should display empty list notification');
    textToDisplay = textToDisplay || 'Tweets';
    if (array.results) {
      array = array.results;
    }
    try {
      Mojo.Log.info('Length of array for showEmptyList', array.length);
    } catch (e) {
      Mojo.Log.info('No length');
    }
    if (array.length <= 0 || !Object.isArray(array)) {
       var emptyListElement = new Element('div', {id: 'divEmptyList'}).update('No ' + textToDisplay);
       this.controller.get('listWidget').update(emptyListElement);
       setTimeout(function (){
         try {
           this.controller.get('divEmptyList').addClassName('hide');
         } catch (e) {
           Mojo.Log.info('Couldn\'t find the divEmptyList');
         }
       }.bind(this), 3200);
    }
}

TM.helpers.showRefresh = function (){
  var func = function (){
    try {
      this.baseLayout.addClassName('show-refresh');
    } catch (e) {
      Mojo.Log.info('baseLayout was not defined');
    }
  }
	func.bind(this).defer();
}

TM.helpers.setupPolledReparseDates = function (){
  try {
  	this.dateTimer = this.controller.window.setTimeout(TM.helpers.reparseDates.bind(this), timeBetweenTimeReformat);
  } catch (e) {
    Mojo.Log.info('Something went wrong with date parsing:');
    Mojo.Log.error(e);
    Mojo.Log.error(e.stack);
  }
}

TM.helpers.reparseDates = function (){
  Mojo.Log.info('Trying to reparse dates');
  try {
  	var func = function () {
    	if (Object.isUndefined(this.lastParsedAt)) {
    		this.lastParsedAt = new Date();
    	}
    	var distance_in_seconds = ((new Date - this.lastParsedAt) / 1000);
    	var distance_in_minutes = (distance_in_seconds / 60).floor();
    	// Only reparses dates if the current 'card' is in front TODO: Make it so that if the scene isn't active it sets up a stageActivate event and reparses immediately on activate. So doesn't parse anything when not active.
    	// TODO only reparse when not scrolling. If scrolling set an event to reparse only once scrolling stops
    	if ( TM.helpers.isStageActive()) {
    		Mojo.Log.info('Reparsing dates');
    		
    		for (var i = 0; i < this.timelineModel.items.length; i++) {
    			this.timelineModel.items[i].prettyTime = DateHelper.time_ago_in_words_with_parsing(this.timelineModel.items[i].created_at, 'short');
    			/* originally I thought this would be faster, but it's actually much slower. TODO: Maybe optimize in the future, but I think it's best to just leave this out
    			this.prettyTimes = this.controller.stageController.document.getElementsByClassName('prettyTime');
    			// Faster than doing a modelChanged TODO: do a noticeUpdatedItems on just the visible nodes!
    			for (var i = 0; i < this.prettyTimes.length; i++) {
    				this.prettyTimes[i].innerHTML = DateHelper.time_ago_in_words_with_parsing(this.prettyTimes[i].getAttribute("created-at"), 'short');
    			}
    			*/
    		}
    		this.listWidget.mojo.noticeUpdatedItems(0, this.timelineModel.items);
    		this.lastParsedAt = new Date();
    		try {
    			TM.helpers.setupPolledReparseDates.call(this);
    		} catch (e) {
    		  Mojo.Log.info('Couldn\t setup the polled reparser');
    		  Mojo.Log.error(e.stack);
    		}
    	} else {
    	  try {
      	  this.controller.listen(this.controller.stageController.document, Mojo.Event.stageActivate, this.reparseAndSetupPolledDates);
      	} catch(e) {
      	  Mojo.Log.error("Couldn't setup event to reparse dates on activate");
      	  Mojo.Log.error(e);
      	}
    	}
  	}
  	func.bind(this).delay(0.7); // Slight delay so it won't slow down card activation as much
  } catch (e) {
    Mojo.Log.error('Error while reparsing dates');
    Mojo.Log.error(e.stack);
  }
}

TM.helpers.setupLoadButtons = function (){
  Mojo.Log.info('Setting up load buttons now');
	if (!this.baseLayout || !this.loadButton || !this.refreshButton) {
	  Mojo.Log.info('Buttons not part of controller yet. Adding them now');
		this.baseLayout = this.controller.get('divBaseLayout');
		this.loadButton = this.controller.get('divLoadOld');
		this.refreshButton = this.controller.get('divLoadNew');
	}
	if (this.nextCursor === 0) { // Hides button if there is nothing else to load
		Mojo.Log.info('On last page, nothing to load. Hide load more button');
		this.baseLayout.removeClassName('show-more');
	} else {
		Mojo.Log.info('Setting up load more button');
		this.baseLayout.addClassName('show-more');
		this.controller.listen(this.loadButton, Mojo.Event.tap, this.loadMoreHandler.curry('Old'));
		Mojo.Log.info('Event handlers for refresh and load more have been added');
	}
	// Setup refresh button no matter what
	this.controller.listen(this.refreshButton, Mojo.Event.tap, this.loadMoreHandler.curry('New'));
}

// Automatically fetch new tweets every 3min - Exhibition
TM.helpers.setupAutoLoad = function (){
	this.autoUpdate = this.controller.window.setInterval(
		this.loadMoreHandler.curry('New'), 180000);
}

// Loads more old or new tweets. Used for pressing "More Tweets" or "refresh tweets"
// whatToLoad should be a string of either 'Old' or 'New'
// 'Old' will get old tweets. 'New' will refresh (get newer tweets)
TM.helpers.loadMore = function (whatToLoad){
	Mojo.Log.info('Attempting to load ' + whatToLoad);
//	TM.helpers.blockTaps(this);
  if (this.refreshing !== true) {
    this.controller.get('divLoad' + whatToLoad).addClassName('selected');

    if (whatToLoad === 'Old') { // load more
      this.pageNumber = this.pageNumber + 1;
      var statusCode = this.handleSearch403s === true ? 403 : 1000000; // Hanlde 403s for search if the assistant has handleSearch403s set to true. See nearby-assistant.js to see how it's used
      this.twitterFunction({onSuccess: TM.helpers.updateList.bind(this, whatToLoad), onFail: {status: statusCode, functionToCall: TM.helpers.noMoreTweetsToLoad.bind(this)}}, {count: TM.prefs.numTweetsToLoad, rpp: TM.prefs.numTweetsToLoad, per_page: TM.prefs.numTweetsToLoad, max_id: this.nextCursor, page: this.pageNumber});
    } else { // Refresh, load newest
      this.twitterFunction({onSuccess: TM.helpers.updateList.bind(this, whatToLoad)}, {count: 99, rpp: 99, per_page: 99, since_id: this.prevCursor, page: this.pageNumber});
    }
  }
	this.refreshing = true;
}

// Updates lists, sets the next cursor value and sets up the load more button
TM.helpers.updateList = function (whatToLoad, transport){
  this.refreshing = false;
  Mojo.Log.info('Attempting to update the list ',whatToLoad);

	var tweets = Object.isUndefined(transport.responseJSON.results) ? TM.helpers.filterTweets(transport.responseJSON) : TM.helpers.filterSearchTweets(transport.responseJSON.results);
	//var numOldTweets = this.timelineModel.items.length;
	this.controller.get('divLoad'+whatToLoad).removeClassName('selected');
	Mojo.Log.info('Filtered tweets');
	if (whatToLoad === 'Old') {
	  this.timelineModel.items.push.apply(this.timelineModel.items, tweets);
	  this.listWidget.mojo.noticeUpdatedItems(0, this.timelineModel.items);
	  //this.listWidget.mojo.noticeUpdatedItems(numOldTweets, this.timelineModel.items.slice(numOldTweets, numOldTweets + 35));
	  // TODO: Fix this hack. For some reason when I update items in the list it will occassionaly not update until I start scrolling. So I have to "force reset" the length to get the list to update
	  // Maybe it will be fixed when I use a dynamic list and not just the normal list widget...maybe?
	  this.listWidget.mojo.setLength(this.timelineModel.items.length - 1);
	  this.listWidget.mojo.setLength(this.timelineModel.items.length);
	} else { // on Refresh for new tweets
		QuickBar.hide.call(this);
		this.timelineModel.items.unshift.apply(this.timelineModel.items, tweets);
		this.listWidget.mojo.noticeUpdatedItems(0, this.timelineModel.items);
		this.controller.getSceneScroller().mojo.scrollTo(0,0);
	}
	Mojo.Log.info('Length after adding', this.timelineModel.items.length);
	this.listLength = this.timelineModel.items.length;
  if (transport.responseJSON.since_id) {
    TM.helpers.setupCursors.call(this, this.timelineModel.items, transport.responseJSON.since_id);
  } else {
    TM.helpers.setupCursors.call(this, this.timelineModel.items);
  }
//	TM.helpers.unblockTaps(this);
//	this.setupLoadButtonsHandler();
}

// Handles the back gesture
TM.helpers.handleCommand = function (event) {
	if (event.type == "mojo-back") {
	  if (this.quickBar && this.quickBar.hasClassName('appear')) {
	    this.quickBar.removeClassName('appear');
	    this.bottomActionsWrapper.removeClassName('hide');
	    this.minimizeOnBack = true; // Makes sure the next backswipe minimizes
	    event.preventDefault();
	    event.stopPropagation();
	  } else {
  		// Nav is not showing
  		this.navActionsWrapper = Object.isUndefined(this.navActionsWrapper) ? this.controller.get('divNavActionsWrapper') : this.navActionsWrapper;
      // No longer bring up splash menu for back gesture
  		if (this.navActionsWrapper.hasClassName('appear') == false) {
  			TM.helpers.toggleNav.call(this);
  			this.minimizeOnBack = true;
  			event.preventDefault();
  			event.stopPropagation();
      // Mojo.Controller.getAppController().showBanner('Swipe back again to minimize', '', '');
  		}
  		else if (this.navActionsWrapper.hasClassName('appear') && this.minimizeOnBack) {
        // Minimizes because event is not stopped
  			this.minimizeOnBack = false;
  			TM.helpers.toggleNav.call(this);
  		}
  		/*
  		// Just added. Does not work correctly
  		else if (this.navActions.hasClassName('appear') && !this.minimizeOnBack) {
            Minimizes
  			this.minimizeOnBack = true;
  		}
  		*/
  		else {
  			TM.helpers.toggleNav.call(this);
  			event.preventDefault();
  			event.stopPropagation();
  		}
  		/*
      if (this.navActions.hasClassName('appear') === true) {
        TM.helpers.toggleNav.call(this);
        event.preventDefault();
  			event.stopPropagation();
      }
      */
    }
	}
}

// Sets up the card so that it will show/hide the bottom nav when minimized/maximized
// TODO make sure this isnt being called twice when I setup new timelines. It should only be setup for base timelines, like home, mentions, favorites, etc. SHould be easy to check. Just do a check and it deactivate or activateHanlder is defined on the controller ten don't add the event!
TM.helpers.toggleBottomNav = function (){
	this.deactivateHandler = function (){
	  //function (){
	    this.bottomActionsWrapper.addClassName('hide');
	    //this.bottomActionsWrapper.style.bottom = '-58px';
	    this.minimizeOnBack = false;
	    if (this.quickBar && this.quickBar.hasClassName('appear')) {
	      this.quickBar.removeClassName('appear');
	    }
	    Mojo.Log.info('About to deactivate');
	  //}.bind(this).defer();
	}.bind(this);
	this.activateHandler = function (){
	  //function (){
	    this.bottomActionsWrapper.removeClassName('hide');
	    //this.bottomActionsWrapper.style.bottom = '0px';
	    Mojo.Log.info('About to activate');
	  //}.bind(this).defer();
	}.bind(this);
	this.controller.listen(this.stageController.document, Mojo.Event.stageDeactivate, this.deactivateHandler);
	this.controller.listen(this.stageController.document, Mojo.Event.stageActivate, this.activateHandler);
}

// @param forceAppear {boolean} set to true to force appear instead of just toggling. Used from tapping notification to bring up the splash menu
// @params delay {int} milliseconds to delay the force splash menu appear
// @param mustHaveUnreadItems {boolean} must have unread items to appear
TM.helpers.toggleNav = function (forceAppear, delay, mustHaveUnreadItems){
  delay =  Object.isUndefined(delay) ? 400 : delay;
  var canShow = true;
  if (mustHaveUnreadItems === true) {
    canShow = TM.helpers.hasUnreadItems() ? true : false;
  }
  try {
    this.navActionsWrapper = Object.isUndefined(this.navActionsWrapper) ? this.controller.get('divNavActionsWrapper') : this.navActionsWrapper;
    if (forceAppear === true && canShow) {
      // Give it a bit of a delay because it's usually from a popped back scene. Look smoother with a bit of a delay
      setTimeout(function (){
        TM.helpers.showNav.call(this);
      }.bind(this), delay);
    } else {
      var bottomNav = this.controller.get('divNavActionPositioner');
      Element.toggleClassName.delay(0.24, bottomNav, 'show-accounts'); // TODO: Should make sure it clears out (no race conditions)
      this.navActionsWrapper.toggleClassName('appear');
    }
  } catch(e) {
    Mojo.Log.info("Couldn't toggle nav. Nav probably doesn't exist in this scene");
    Mojo.Log.info('Error is', e);
  }
	// Stuff for closing the dashboard notification if it's there.
	var dashboardController = TM.dashboard.getDashboard();
	var appController = Mojo.Controller.getAppController(); 
	var stageController = appController.getStageController('TweetMe'); 
	var dashboardStageController = appController.getStageProxy(TM.dashboardStageName);
	if (dashboardStageController) { //this.navActions.hasClassName('appear') && 
	  setTimeout(function (){
	    dashboardStageController.window.close();
	  }, 750);
	}
}

// Hides the nav immediately
TM.helpers.hideNav = function (){
  var bottomNav = this.controller.get('divNavActionPositioner');
  bottomNav.removeClassName.bind(bottomNav).delay(0.24, 'show-accounts'); // TODO: Should make sure to clear timeout
  this.navActionsWrapper.removeClassName('appear');
}

// Shows the nav immediately
TM.helpers.showNav = function (){
  var bottomNav = this.controller.get('divNavActionPositioner');
  bottomNav.addClassName.bind(bottomNav).delay(0.24, 'show-accounts'); // TODO: Should make sure to clear timeout
  this.navActionsWrapper.addClassName('appear');
}


TM.helpers.setupActions = function (){
	// Scene is the name of the scene to swap to and also the css class to be applied (to show the right icon). TEXT is the text that goes underneath the icon.
	this.navActions = { items: [
		{scene: 'my-tweets', text: 'My Tweets'},
		{scene: 'go-to-user', text: 'Go to User'},
		{scene: 'my-info', text: 'My Info'},
		{scene: 'nearby', text: 'Nearby'},
		
		//{scene: 'public-timeline', text: 'Public Timeline'},
		{scene: 'lists', text: 'Lists'},
		{scene: 'mentions', text: 'Mentions'},
		{scene: 'trends', text: 'Trends'},
		{scene: 'drafts', text: 'Drafts'},
		
		{scene: 'home', text: 'Home'},
		{scene: 'messages', text: 'Messages'},
		{scene: 'search', text: 'Search'},
		{scene: 'favorites', text: 'Favorites'}
	] };
	TM.helpers.filterUnreadItems.call(this);
	this.controller.setupWidget('divNavActionsWrapper',
		{ 
			itemTemplate: "partials/nav-action", 
			listTemplate: "partials/nav-action-list",
			hasNoWidgets: true,
			fixedHeightItems: true,
			swipeToDelete: false, 
			reorderable: false,
			renderLimit: 12,
			lookahead: 0
		}, 
		this.navActions);
	this.swapTimelineHandler = TM.helpers.swapTimeline.bind(this);
	this.controller.listen('divNavActionsWrapper', Mojo.Event.listTap, this.swapTimelineHandler);
}

// Looks for unread items for the current user and sets the model to reflect whether a section is read or unread
TM.helpers.filterUnreadItems = function (){
  this.navActions.items.each(function (navItem){
    var unreadItem = Account.getCurrent().unreadItems[navItem.scene];
    if (unreadItem && unreadItem.hasUnread === true) {
      Mojo.Log.info(navItem.scene, 'has UNREAD ITEMS!');
      navItem.unread = 'has-unread-items';
    } else if (unreadItem && unreadItem.hasUnread === false) {
      delete navItem.unread;
    }
  });
}

TM.helpers.defaultCleanup = function (){
  try {
    if (this.deactivateHandler) {
      this.controller.stopListening(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.deactivateHandler);
      this.controller.stopListening(this.controller.stageController.document, Mojo.Event.stageActivate, this.activateHandler);
    }
	} catch(e) {
	  Mojo.Log.error("Couldn't clean up the activate/deactivate functions");
	  Mojo.Log.error(e.stack);
	}
	if (this.dateTimer) { // Checks to see if the dateTimer is set up for reparsing dates every 5 minutes
	  try {
	    this.controller.stopListening(this.controller.stageController.document, Mojo.Event.stageActivate, this.reparseAndSetupPolledDates);
			this.dateTimer = this.controller.window.clearTimeout(this.dateTimer);
		} catch(e) {
		  Mojo.Log.error(e);
		}
	}
	try {
  	if (this.swapTimelineHandler) {
  	  this.controller.stopListening('divNavActionsWrapper', Mojo.Event.listTap, this.swapTimelineHandler);
  	}
  	if (this.showTweetHandler) {
  	  this.controller.stopListening(this.listWidget, Mojo.Event.listTap, this.showTweetHandler);
  	}
  } catch(e) {
    Mojo.Log.error(e.stack);
  }
	//TM.helpers.deleteRefsToNodes.call(this, ['listWidget', 'baseLayout', 'qickBar', 'loadButton', 'refreshButton', 'navActionsWrapper']);
	TM.helpers.closeStage.call(this);
}

// Can help make it so less memory leaks occur. Not really used much of anywhere. Is it needed?
TM.helpers.deleteRefsToNodes = function (nodeNames){
  try {
    for (var i = 0; i < nodeNames.length; i++) {
      if (this[nodeNames[i]]) {
        delete this[nodeNames[i]];
      }
    }
  } catch(e) {
    Mojo.Log.error(e.stack);
  }
}

// Closes the stage if the app is exited
// Used to be needed to force close the window. Seems that it's not longer needed as of webOS 1.4.0 and can probably remove.
TM.helpers.closeStage = function (){
  var stage = Mojo.Controller.getAppController().getStageController('TweetMe');
	TM.helpers.cleanupButtons.call(stage); // Cleans up any setup buttons
	if (!TM.helpers.isStageActive()) {
	  try {
  		stage.getScenes()[0].assistant.window.close();
  		Mojo.Log.info('Closing/cleaning the stage completely');
  	} catch(e) {
  	  Mojo.Log.info('Window was probably already closed from another scenes cleanup function');
  	}
	}
}

TM.helpers.swapTimeline = function (event){
	if (event.item.scene == 'my-info') {
		setTimeout((function (){
		  try {
  			//this.navActionsWrapper.removeClassName('appear');
  			TM.helpers.toggleNav.call(this);
  		} catch(e) {
  		  Mojo.Log.error("Couldn't remove the classname 'appear' from the navactions. Doesn't really matter.");
  		  Mojo.Log.error(e);
  		}
		}).bind(this), 100);
		this.controller.stageController.pushScene('user-info', TM.prefs.userInfo);
	}
	else {
		this.controller.stageController.swapScene(event.item.scene);
	}
}

// Makes it so that when a username or hastag is clicked it takes you to that user or hastag search
TM.helpers.setupUsernamesAndHashTags = function (){
	this.tappableUsernames = this.controller.stageController.document.getElementsByClassName('tappable-username');
	this.pushUserHandler = this.pushUser.bindAsEventListener(this);
	for (var i = 0; i < this.tappableUsernames.length; i++) {
		this.controller.listen(this.tappableUsernames[i], Mojo.Event.tap, this.pushUserHandler);
	}
	this.tappableHashtags = this.controller.stageController.document.getElementsByClassName('hashtag');
	this.pushSearchHandler = this.pushSearch.bindAsEventListener(this);
	for (var i = 0; i < this.tappableHashtags.length; i++) {
		this.controller.listen(this.tappableHashtags[i], Mojo.Event.tap, this.pushSearchHandler);
	}
}

// DEPRECATED. Use handleActivate instead. That way I can handle lots of activate events. Leaving this here just in case it's called somewhere in the code
TM.helpers.handleDelete = function (event){
  Mojo.Log.warn('DEPRECATION NOTICE: TM.helpers.handleDelete is DEPRECATED. Use TM.helpers.handleActivate instead');
  TM.helpers.handleActivate.call(this, event);
}

// Called in scene's activate method. If a tweet is deleted this will handle all the stuff that goes along with removing it from the list (animated nicely of course)
// event must have a deleted property with an integer value to know which item to delete
// if event has a 'sent' property (true or false doesn't matter), it will remove the tweet to the left (opposite of delete) so it is different visually
TM.helpers.handleActivate = function (event){
  // Use this.activateParams if they exist and there is no event passed in. One place this is used is when the app is launched by tapping the notification to bring up the splash menu.
  if (Object.isUndefined(event) && !Object.isUndefined(this.activateParams)) {
    event = this.activateParams;
  }
	if (!Object.isUndefined(event) && !Object.isUndefined(event.deleted)) {
	  if (event.deleted === 0) {
	    this.prevCusor -= 1;
	  }
		var deletedTweet = this.listWidget.mojo.getNodeByIndex(event.deleted);
		// TODO: Use css animations with webkit KEYFRAMES so all you have to do is change the class. I didn't realize webOS supported keyframes until after I implemented this.
		var startDelay = 350;
		// Slides the tweet off the screen to the right
		var sideToAnimateTo = !Object.isUndefined(event.sent) ? '-' : '';
		Mojo.Log.info('Side to animate to is', sideToAnimateTo);
		setTimeout((function (){
			deletedTweet.style.marginLeft =  sideToAnimateTo + '320px';
		}), startDelay);
		// Slides up the space that is left after the tweet is slide to the right
		setTimeout((function (){
			deletedTweet.style.marginTop =  deletedTweet.getHeight() * -1 - 14 + 'px';
		}), startDelay + 310);
		// Let the list know the item was removed after animations have run
		setTimeout((function (){
			this.listWidget.mojo.noticeRemovedItems(event.deleted, 1);
			//Mojo.Log.logProperties(this.timelineModel.items[event.deleted]);
			this.timelineModel.items.splice(event.deleted, 1);
		}).bind(this), startDelay + 790);
	} else if (!Object.isUndefined(event) && event.action === 'show-splash-menu') {
	  TM.helpers.toggleNav.call(this, true, event.delay, event.mustHaveUnreadItems);
	}
	this.activateParams = undefined;
}

// Ask whether there are any unread Items
TM.helpers.hasUnreadItems = function (){
  var hasUnreadItems = false;
  var unreadItems = $H(Account.getCurrent().unreadItems);
  // TODO: Get this working so it looks in ALL accounts to see if any have unread tweets. Right now it just searches the current account
  unreadItems.values().each(function (object){
    if (object.hasUnread === true) {
      hasUnreadItems = true;
    }
  });
  return hasUnreadItems;
}

// @params {params} string/object the string or object to pass to the activate function
TM.helpers.popToBottomScene = function (params, force){
  try {
    var scene = Mojo.Controller.getAppController().getStageController('TweetMe').activeScene();
    Mojo.Log.info('Number of scenes on the stack', scene.stageController.getScenes().length);
    var sceneStack = scene.stageController.getScenes();
    if (sceneStack.length > 1) {
      Mojo.Log.info('Popping scene to lowest/first scene');
      scene.stageController.popScenesTo(sceneStack[0].sceneName, params);
    } else {
      scene.activate(params);
    }
  } catch(e) {
    Mojo.Log.error(e.stack);
  }
}


TM.helpers.extractURLs = function(str) {
	var wwwlinks = /(^|\s|\(|:)(((http(s?):\/\/)|(www\.))(\w+[^\s\)<]+))/gi;
	var match = [];
	var URLs = [];
	while ( (match = wwwlinks.exec(str)) != null ) {
		URLs.push(match[2]);
	}
	return URLs;
};


TM.helpers.sanitizeHTML = function(str){
	str = TM.helpers.stripTags(str);
//	str = TM.helpers.fromHTMLSpecialChars(str);
	str = TM.helpers.htmlEntities(str);
	return str;
}

TM.helpers.superSanitizeHTML = function (str){
  str = TM.helpers.sanitizeHTML(str);
  str = TM.helpers.fromHTMLSpecialChars(str);
  return str;
}

/**
 * Simple html tag remover
 * @param {string} str
 * @return {string}
 */
TM.helpers.stripTags = function(str) {
	var re = /<[^>]*>/gim;
	str = str.replace(re, '');
	return str;
};


/**
 * Converts the following entities into regulat chars: &lt; &gt; &quot; &apos;
 */
TM.helpers.fromHTMLSpecialChars = function(str) {
	str = str.replace(/&lt;/gi, '<');
	str = str.replace(/&gt;/gi, '>');
	str = str.replace(/&quot;/gi, '"');
	str = str.replace(/&apos;/gi, '\'');
	return str;
}

// Alias for the htmlEntities function in case any other methods call the old name (htmlentities) <-- no camelcase
TM.helpers.htmlentities = function (string, quote_style){
	TM.helpers.htmlEntities(string, quote_style);
}

TM.helpers.htmlEntities = function(string, quote_style) {
    // http://kevin.vanzonneveld.net
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: nobbler
    // +    tweaked by: Jack
    // +   bugfixed by: Onno Marsman
    // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // -    depends on: get_html_translation_table
    // *     example 1: htmlentities('Kevin & van Zonneveld');
    // *     returns 1: 'Kevin &amp; van Zonneveld'
    // *     example 2: htmlentities("foo'bar","ENT_QUOTES");
    // *     returns 2: 'foo&#039;bar'
 
    var histogram = {}, symbol = '', tmp_str = '', entity = '';
    tmp_str = string.toString();
    
    if (false === (histogram = TM.helpers._get_html_translation_table('HTML_ENTITIES', quote_style))) {
        return false;
    }
    
    for (symbol in histogram) {
        entity = histogram[symbol];
        tmp_str = tmp_str.split(symbol).join(entity);
    }
    
    return tmp_str;
}

TM.helpers._get_html_translation_table = function(table, quote_style) {
    // http://kevin.vanzonneveld.net
    // +   original by: Philip Peterson
    // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: noname
    // +   bugfixed by: Alex
    // +   bugfixed by: Marco
    // +   bugfixed by: madipta
    // %          note: It has been decided that we're not going to add global
    // %          note: dependencies to php.js. Meaning the constants are not
    // %          note: real constants, but strings instead. integers are also supported if someone
    // %          note: chooses to create the constants themselves.
    // %          note: Table from http://www.the-art-of-web.com/html/character-codes/
    // *     example 1: get_html_translation_table('HTML_SPECIALCHARS');
    // *     returns 1: {'"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;'}
    
    var entities = {}, histogram = {}, decimal = 0, symbol = '';
    var constMappingTable = {}, constMappingQuoteStyle = {};
    var useTable = {}, useQuoteStyle = {};
    
    useTable      = (table ? table.toUpperCase() : 'HTML_SPECIALCHARS');
    useQuoteStyle = (quote_style ? quote_style.toUpperCase() : 'ENT_COMPAT');
    
    // Translate arguments
    constMappingTable[0]      = 'HTML_SPECIALCHARS';
    constMappingTable[1]      = 'HTML_ENTITIES';
    constMappingQuoteStyle[0] = 'ENT_NOQUOTES';
    constMappingQuoteStyle[2] = 'ENT_COMPAT';
    constMappingQuoteStyle[3] = 'ENT_QUOTES';
    
    // Map numbers to strings for compatibilty with PHP constants
    if (!isNaN(useTable)) {
        useTable = constMappingTable[useTable];
    }
    if (!isNaN(useQuoteStyle)) {
        useQuoteStyle = constMappingQuoteStyle[useQuoteStyle];
    }
 
    if (useTable == 'HTML_SPECIALCHARS') {
        // ascii decimals for better compatibility
        entities['38'] = '&amp;';
        if (useQuoteStyle != 'ENT_NOQUOTES') {
            entities['34'] = '&quot;';
        }
        if (useQuoteStyle == 'ENT_QUOTES') {
            entities['39'] = '&#039;';
        }
        entities['60'] = '&lt;';
        entities['62'] = '&gt;';
    } else if (useTable == 'HTML_ENTITIES') {
        // ascii decimals for better compatibility
      entities['38']  = '&amp;';
        if (useQuoteStyle != 'ENT_NOQUOTES') {
            entities['34'] = '&quot;';
        }
        if (useQuoteStyle == 'ENT_QUOTES') {
            entities['39'] = '&#039;';
        }
      entities['60']  = '&lt;';
      entities['62']  = '&gt;';
      entities['160'] = '&nbsp;';
      entities['161'] = '&iexcl;';
      entities['162'] = '&cent;';
      entities['163'] = '&pound;';
      entities['164'] = '&curren;';
      entities['165'] = '&yen;';
      entities['166'] = '&brvbar;';
      entities['167'] = '&sect;';
      entities['168'] = '&uml;';
      entities['169'] = '&copy;';
      entities['170'] = '&ordf;';
      entities['171'] = '&laquo;';
      entities['172'] = '&not;';
      entities['173'] = '&shy;';
      entities['174'] = '&reg;';
      entities['175'] = '&macr;';
      entities['176'] = '&deg;';
      entities['177'] = '&plusmn;';
      entities['178'] = '&sup2;';
      entities['179'] = '&sup3;';
      entities['180'] = '&acute;';
      entities['181'] = '&micro;';
      entities['182'] = '&para;';
      entities['183'] = '&middot;';
      entities['184'] = '&cedil;';
      entities['185'] = '&sup1;';
      entities['186'] = '&ordm;';
      entities['187'] = '&raquo;';
      entities['188'] = '&frac14;';
      entities['189'] = '&frac12;';
      entities['190'] = '&frac34;';
      entities['191'] = '&iquest;';
      entities['192'] = '&Agrave;';
      entities['193'] = '&Aacute;';
      entities['194'] = '&Acirc;';
      entities['195'] = '&Atilde;';
      entities['196'] = '&Auml;';
      entities['197'] = '&Aring;';
      entities['198'] = '&AElig;';
      entities['199'] = '&Ccedil;';
      entities['200'] = '&Egrave;';
      entities['201'] = '&Eacute;';
      entities['202'] = '&Ecirc;';
      entities['203'] = '&Euml;';
      entities['204'] = '&Igrave;';
      entities['205'] = '&Iacute;';
      entities['206'] = '&Icirc;';
      entities['207'] = '&Iuml;';
      entities['208'] = '&ETH;';
      entities['209'] = '&Ntilde;';
      entities['210'] = '&Ograve;';
      entities['211'] = '&Oacute;';
      entities['212'] = '&Ocirc;';
      entities['213'] = '&Otilde;';
      entities['214'] = '&Ouml;';
      entities['215'] = '&times;';
      entities['216'] = '&Oslash;';
      entities['217'] = '&Ugrave;';
      entities['218'] = '&Uacute;';
      entities['219'] = '&Ucirc;';
      entities['220'] = '&Uuml;';
      entities['221'] = '&Yacute;';
      entities['222'] = '&THORN;';
      entities['223'] = '&szlig;';
      entities['224'] = '&agrave;';
      entities['225'] = '&aacute;';
      entities['226'] = '&acirc;';
      entities['227'] = '&atilde;';
      entities['228'] = '&auml;';
      entities['229'] = '&aring;';
      entities['230'] = '&aelig;';
      entities['231'] = '&ccedil;';
      entities['232'] = '&egrave;';
      entities['233'] = '&eacute;';
      entities['234'] = '&ecirc;';
      entities['235'] = '&euml;';
      entities['236'] = '&igrave;';
      entities['237'] = '&iacute;';
      entities['238'] = '&icirc;';
      entities['239'] = '&iuml;';
      entities['240'] = '&eth;';
      entities['241'] = '&ntilde;';
      entities['242'] = '&ograve;';
      entities['243'] = '&oacute;';
      entities['244'] = '&ocirc;';
      entities['245'] = '&otilde;';
      entities['246'] = '&ouml;';
      entities['247'] = '&divide;';
      entities['248'] = '&oslash;';
      entities['249'] = '&ugrave;';
      entities['250'] = '&uacute;';
      entities['251'] = '&ucirc;';
      entities['252'] = '&uuml;';
      entities['253'] = '&yacute;';
      entities['254'] = '&thorn;';
      entities['255'] = '&yuml;';
    } else {
        throw Error("Table: "+useTable+' not supported');
        return false;
    }
    
    // ascii decimals to real symbols
    for (decimal in entities) {
        symbol = String.fromCharCode(decimal);
        histogram[symbol] = entities[decimal];
    }
    
    return histogram;
}
