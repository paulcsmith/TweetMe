TM.dashboard.getDashboard = function (){
  Mojo.Log.info('getting Dashboard stage');
  var appController = Mojo.Controller.getAppController(); 
  var stageController = appController.getStageController('TweetMe'); 
  var dashboardStageController = appController.getStageProxy(TM.dashboardStageName);
  return dashboardStageController;
}