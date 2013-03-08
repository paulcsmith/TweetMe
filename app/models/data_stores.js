// Initializes Data stores

var Data = {
  initialize: function (successFunction){
    this.drafts = new Lawnchair('drafts');
    this.prefs = new Mojo.Depot({name: 'prefs', esimatedSize: 2}, successFunction, Data.failFunction); //Used depot instead because Lawnchair had way too many bugs. TODO: Later migrate drafts to use Depot.
  },
  failFunction: function (status){
    Mojo.Log.error(status);
    Mojo.Controller.getAppController().showBanner('Failed to load preferences', '', '');
  }
}