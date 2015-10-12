function createGame(targetEl) {
	targetEl.innerHTML = 
	'<div class="canvas">' +
    	'<div class="mario"></div>' +
    	'<div class="ground"></div>' +
	'</div>';
}

(function() {

	var dom = document.createElement('div');
	document.body.appendChild(dom);
	createGame(dom);
}());