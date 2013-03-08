/*
   Custom widget stuff
 - Setting up textarea to expand
*/

var Widget = {};

// This function only works when resizing one textarea. Works fine for me, but may want to change that later
// Make sure 'this' is bound to the active stage
Widget.autoResize = function (element){
    this.ghostElement = document.createElement('div');
    this.ghostElement.className = 'ghost-element';
    this.ghostElement.id = 'divGhostElement';
    this.ghostElement.style.width = element.getWidth() + 'px';
    this.ghostElement.style.fontSize = element.getStyle('fontSize');
    this.ghostElement.innerHTML = element.innerHTML;
    element.setAttribute('grow-height', element.style.height);
    this.controller.get('ghostElementWrapper').appendChild(this.ghostElement);
    this.updateHeightHandler = Widget.updateHeightDeferred.bind(this, element);
    this.controller.listen(element, 'keydown', this.updateHeightHandler);
    this.controller.listen(element, 'cut', this.updateHeightHandler);
    this.controller.listen(element, 'paste', this.updateHeightHandler);
    this.controller.listen(element, 'keypress', this.updateHeightHandler);
    Widget.updateHeightDeferred.bind(this, element)();
}

// Defers height update till interpreter is not busy so it gets the correct value
Widget.updateHeightDeferred = function (element) {
    Widget.updateHeight.bind(this, element).defer();
}

// Update the ghost element and sets the height of the text area (element) with the new height
Widget.updateHeight  = function (element){
    // TODO make it so that the value that the ghost Element gets filters spaces for nbsp and filters line breaks to <br /> tags so it gets the accurate height
    this.ghostElement.innerHTML = element.value;
    var ghostHeight = this.ghostElement.getHeight() + 25;
    if (element.getAttribute('grow-height') != ghostHeight) {
        element.setAttribute('grow-height', ghostHeight);
        element.style.height = ghostHeight + 'px';
    }
}
