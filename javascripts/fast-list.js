// Doesn't work... yet

// Same params taken as the original list
TM.fastList.setup = function (element, attr, model){
  this.controller.setupWidget("listWidget",
  	{ 
  		itemTemplate: "partials/timeline-row", 
  		listTemplate: "partials/timeline-list", 
  		hasNoWidgets: true, // May have to add this as an option to setupTimeline in case other lists need widgets inside them
  		swipeToDelete: false, 
  		reorderable: false,
  		renderLimit: 25, //default is 20
  		lookahead: 15 //default is 15
  	}, 
  	this.timelineModel);
}