function ExhibitionAssistant(activateParams) {
	this.activateParams = activateParams; // Used by TM.helpers.handleActivate in the activate function
}

ExhibitionAssistant.prototype.setup = function() {
	try {
		//TM.helpers.setupDefaultMenu.call(this);
		this.setupMenu();
		TM.helpers.setupTimeline.call(this, 'exhibition', Twitter.homeTimeline);
	} catch (e) {
	    Mojo.Log.error(e.stack);
	}
}

ExhibitionAssistant.prototype.activate = function(event) {
	TM.helpers.handleActivate.call(this, event);
	this.controller.get('divBigLoader').addClassName('show');
}

ExhibitionAssistant.prototype.deactivate = function(event) {
}

ExhibitionAssistant.prototype.cleanup = function(event) {
	TM.helpers.defaultCleanup.call(this);
}
