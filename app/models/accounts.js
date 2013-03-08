// Makes it easier to work with TM.prefs and do things with multiple accounts
var Account = {};


Account.get = function (id){
  return TM.prefs.accounts[id];
}

// Gets the currently selected account
Account.getCurrent = function (){
  return TM.prefs.accounts[TM.prefs.userInfo.id];
}

Account.isCurrent = function (userId){
  var isCurrent = false;
  if (TM.prefs.userInfo.id == userId) {
    isCurrent = true;
  }
  return isCurrent;
}

// Gets the default account
Account.getDefault = function (){
  return TM.prefs.accounts[TM.prefs.defaultAccountID];
}

// An alias for Account.getDefault
Account.defaultAccount = function (){
  return Account.getDefault();
}


Account.numberOfAccounts = function (){
  var count = 0;
  for (var account in TM.prefs.accounts) {
    count++;
  }
  return count;
}

Account.all = function (){
  var accounts = [];
  for (var account in TM.prefs.accounts) {
    accounts.push(TM.prefs.accounts[account]);
  }
  return accounts;
}

// Alias fo Account.numberOfAccounts
Account.count = function (){
  return Account.numberOfAccounts();
}

// Will add the account and by default set it to the current account (NOT the default account).
// Still must call TM.prefStorage.storePrefs to save the prefs/accounts
Account.addAccount = function (userInfo, oauthTokenSecret, oauthAccessToken){
  try{
    var userID = userInfo.id;
    if (Account.get(userID)) {
      //if account already exists do nothing
      Mojo.Log.info('*****account already exists not adding a new account');
      Mojo.Controller.getAppController().showBanner('@' + userInfo.screen_name + ' was already added', '', '');
      return false
    } else {
      Mojo.Log.info('****Adding new account');
      if (Account.numberOfAccounts() <= 0) {
        TM.prefs.defaultAccountID = userID;
      }
      TM.prefs.accounts[userID] = {};
      TM.prefs.accounts[userID].userInfo = userInfo;
      TM.prefs.accounts[userID].unreadItems = TM.unreadItemsStructure;
      TM.prefs.accounts[userID].oauthTokenSecret = oauthTokenSecret;
      TM.prefs.accounts[userID].oauthAccessToken = oauthAccessToken;
      Account.setToCurrent(userID);
      TM.helpers.setupMultiAccountStyles();
    }
  } catch (e) {
    Mojo.Log.error('*** Couldn\'t add the account');
    Mojo.Log.error(e.stack);
  }
}

Account.setToCurrent = function (id){
  var account = Account.get(id);
  Mojo.Log.info('Setting account with id of:', id, 'to current account');
  TM.prefs.username = account.userInfo.screen_name;
  TM.prefs.userInfo = account.userInfo;
  TM.prefs.oauthTokenSecret = account.oauthTokenSecret;
  Mojo.Log.info('OAuth access token', account.oauthAccessToken);
  TM.prefs.oauthAccessToken = account.oauthAccessToken;
  TM.oauthConfig.tokenSecret = account.oauthTokenSecret;
  TM.oauthConfig.token = account.oauthAccessToken;
  Mojo.Log.info('Done setting new account to current');
}

