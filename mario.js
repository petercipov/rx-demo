function createGame(targetEl, soundEfects) {
    targetEl.innerHTML = 
    '<div class="canvas">' +
        '<div class="mario"></div>' +
        '<div class="ground"></div>' +
        '<div class="counter"></div>' +
    '</div>';

     var
        coinTick = Rx.Observable.interval(3000),
        frameTick = Rx.Observable.interval(33),
        ground = targetEl.querySelector(".ground"),
        mario = targetEl.querySelector(".mario"),
        canvas = targetEl.querySelector(".canvas"),
        counter = targetEl.querySelector(".counter"),
        GROUND_OFFSET = 65,
        currentMario = {},
        gainedCoins = new Rx.BehaviorSubject();
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

    function coinPhysics(oldCoin, m) {
        var c = Object.create(oldCoin);

        if (c.gained || c.removing) {
             c.vy = 7 * c.vy;
             c.removing = true;
             c.gained = false;
        } else {
            if (isCrossing(c, m)) {
                c.gained  = true;
                c.vy = 1.5;
            } else {
                c.gained = false;
            }
        }

        c.x += c.vx;
        c.y += c.vy;
        
        return c;
    }

    function isCrossing(coin, m) {
        var distance = Math.sqrt(
            Math.pow(m.x - coin.x, 2)
            +
            Math.pow(m.y - coin.y, 2)
        );
            
        return distance < 80;
    }

    //------- RENDERERS ----------
    function renderGround(x) {
        ground.style.backgroundPositionX = x +"px";
    }

    function renderMario(m) {
        m.node.style.left = Math.floor(m.x) + "px";
        m.node.style.bottom = Math.floor(m.y)  + "px";
    }

    function renderCoin(c) {
        c.node.style.visibility = "visible";
        c.node.style.left = Math.floor(c.x) + "px";
        c.node.style.bottom = Math.floor(c.y) + "px";
    }

    function createDomCoin() {
        var node = document.createElement("div");
        node.className = 'coin';
        node.style.visibility = "hidden";
        canvas.appendChild(node);
        return node;
    }

    function deleteDomCoin(node) {
        canvas.removeChild(node);
    }

    function renderCounter(value) {
        counter.innerHTML = ''+value;
    }

    //------ INPUTS ------------
    function bindClick() {
        var s = new Rx.Subject();
        targetEl.onclick = function (e) {
            s.onNext(e);
        }; 
        return s;
    }

    function onScreen(n) {
        return !(n.x < -300 || n.y < -1000 || n.y > 1000)
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

    coinTick
        .map(createDomCoin)
        .flatMap(function(node) {
                
            return frameTick
                .map(function() {return currentMario; })
                .scan(coinPhysics, {x: targetEl.clientWidth, y: 250, vx: -6, vy:0, node: node})
                .doOnNext(function(c) {
                    if (c.gained) {
                        gainedCoins.onNext(c);
                    }
                })
                .takeWhile(onScreen)
                .doOnCompleted(function() { deleteDomCoin(node); });
        })
        .subscribe(renderCoin);

    gainedCoins
        .skip(1)
        .doOnNext(function(m) {
            soundEfects.coinGain.play();
        })
        .scan(function(accumulator, c) {
            return ++accumulator;
        }, 0)

        .subscribe(renderCounter)
    ;
}

(function() {

    var soundEfects = {
        jump: new Audio("https://www.freesound.org/data/previews/187/187024_2567799-lq.mp3"),
        coinGain: new Audio("http://www.freesound.org/data/previews/266/266134_3186121-lq.mp3")
    };

    var dom = document.createElement('div');
    document.body.appendChild(dom);
    createGame(dom, soundEfects);
}());