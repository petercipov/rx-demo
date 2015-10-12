function createGame(targetEl) {
	targetEl.innerHTML = 
	'<div class="canvas">' +
    	'<div class="mario"></div>' +
    	'<div class="ground"></div>' +
	'</div>';

	 var
		frameTick = Rx.Observable.interval(33),
		ground = targetEl.querySelector(".ground")
	;

	function groundPhysiscs(i) {
		return (i % 120) * -8;
	}

	function renderGround(x) {
		ground.style.backgroundPositionX = x +"px";
    }

	frameTick
		.map(groundPhysiscs)
		.subscribe(renderGround);
}

(function() {

	var dom = document.createElement('div');
	document.body.appendChild(dom);
	createGame(dom);
}());