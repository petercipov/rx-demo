function createGame(targetEl, soundEfects) {
	targetEl.innerHTML = 
	'<div class="canvas">' +
    	'<div class="mario"></div>' +
    	'<div class="ground"></div>' +
	'</div>';

	 var
		frameTick = Rx.Observable.interval(33),
		ground = targetEl.querySelector(".ground"),
		mario = targetEl.querySelector(".mario"),
		GROUND_OFFSET = 65
	;

	// ------- PHYSICS -------
	function groundPhysics(i) {
		return (i % 120) * -8;
	}

	function marioPhysics(oldMario, clicks) {
        var m = Object.create(oldMario);
        
        //apply velocity
        m.x += m.vx;
        m.y += m.vy;
        
        //apply gravity
        m.vy -= 0.98
        
        //when hit ground stop
        if (m.vy < 0 && m.y <= GROUND_OFFSET) {
            m.y = GROUND_OFFSET;
            m.vy = 0;
        }
        
        //if click add velocity
        if (clicks.length != 0) {
            //add velocity only on ground
            if (m.y === GROUND_OFFSET) {
                m.bounced = true;
                m.vy = 20;
            }
        } else {
            m.bounced = false;
        }
        
        return m;
    }

    //------- RENDERERS ----------
	function renderGround(x) {
		ground.style.backgroundPositionX = x +"px";
    }

    function renderMario(m) {
        m.node.style.left = Math.floor(m.x) + "px";
        m.node.style.bottom = Math.floor(m.y)  + "px";
    }


    //------ INPUTS ------------
    function bindClick() {
        var s = new Rx.Subject();
        targetEl.onclick = function (e) {
            s.onNext(e);
        }; 
        return s;
    }

    //------ PIPES ---------
	frameTick
		.map(groundPhysics)
		.subscribe(renderGround);

	bindClick()
	    .buffer(frameTick)
	    .scan(marioPhysics, {x:30, y:GROUND_OFFSET, vx:0, vy:0, node: mario })
        .doOnNext(function(m) {
            if (m.bounced) {
                soundEfects.jump.play();
            }
            currentMario = m;
        })
	    .subscribe(renderMario);
}

(function() {

    var soundEfects = {
        jump: new Audio("https://www.freesound.org/data/previews/187/187024_2567799-lq.mp3")
    };

	var dom = document.createElement('div');
	document.body.appendChild(dom);
	createGame(dom, soundEfects);
}());