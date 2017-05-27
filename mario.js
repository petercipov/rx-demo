function createGame(targetEl, soundEfects) {
    targetEl.innerHTML = 
    '<div class="canvas">' +
        '<div class="mario"></div>' +
        '<div class="ground"></div>' +
        '<div class="counter"></div>' +
    '</div>';

     var
        frameTick = bindAnimationFrame(33),
        userClick = bindClick()
        ground = targetEl.querySelector(".ground"),
        mario = targetEl.querySelector(".mario"),
        canvas = targetEl.querySelector(".canvas"),
        counter = targetEl.querySelector(".counter"),
        GROUND_OFFSET = 65,
        gainedCoins = new Rx.BehaviorSubject();
    ;

    // ------- PHYSICS -------
    function groundPhysics(oldGround, t) {
        var g = Object.assign({}, oldGround);

        g.x = (oldGround.x  + (t.dt / 100 * (-20))) % 120;

        return g;
    }

    function marioPhysics(oldMario, actions) {
        var m = Object.assign({}, oldMario);
        
        //apply velocity
        m.x += actions.t.dt * m.vx / 100;
        m.y += actions.t.dt * m.vy / 100;
        
        //apply gravity
        m.vy -= actions.t.dt * 0.98 / 100
        
        //when hit ground stop
        if (m.vy < 0 && m.y <= GROUND_OFFSET) {
            m.y = GROUND_OFFSET;
            m.vy = 0;
        }
        //if click add velocity
        if (actions.clicked) {
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

    function coinPhysics(oldCoin, actions) {
        var c = Object.assign({}, oldCoin);

        if (c.gained || c.removing) {
             c.vy = 7 * c.vy;
             c.removing = true;
             c.gained = false;
        } else {
            if (isCrossing(c, actions.m)) {
                c.gained  = true;
                c.vy = 1.5;
            } else {
                c.gained = false;
            }
        }

        c.x += actions.t.dt * c.vx / 100;
        c.y += actions.t.dt * c.vy / 100;
        
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
    function renderGround(g) {
        ground.style.backgroundPositionX = g.x +"px";
    }

    function renderMario(m) {
        if (m.bounced) {
            soundEfects.jump.play();
        }
        m.node.style.left = Math.floor(m.x) + "px";
        m.node.style.bottom = Math.floor(m.y)  + "px";
    }

    var _getID = function() {
        var counter = 0;
        return () => counter++;
    }();

    var coins = new (function() {
        var domObjects = {};
        this.create = () => {
            var id = _getID();
            var node = document.createElement("div");
            node.className = 'coin';
            node.style.visibility = "hidden";
            canvas.appendChild(node);
            domObjects[id] = node;
            return id;
        };

        this.render = (c) => {
            var obj = domObjects[c.id];
            obj.style.visibility = "visible";
            obj.style.left = Math.floor(c.x) + "px";
            obj.style.bottom = Math.floor(c.y) + "px";
            return c.id;
        };

        this.remove = (id) => {
            var obj = domObjects[id];
            canvas.removeChild(obj);
            delete domObjects[id];
            return id;
        };

    })();

    function renderCounter(value) {
        soundEfects.coinGain.play();
        counter.innerHTML = ''+value;
    }

    //------ INPUTS ------------
    function bindClick() {
        var s = new Rx.Subject();
        targetEl.onclick = (e) => s.onNext(e);
        return s;
    }

    function onScreen(n) {
        return !(n.x < -300 || n.y < -1000 || n.y > 1000)
    }

    function bindAnimationFrame(maxFps) {
        var idCounter = 0;
        var observers = {};
        var animationLoop;
        var timeThreshold = 1000 / maxFps;

        var animationObservable = Rx.Observable.create((observer) => {

            var first = Object.keys(observers).length === 0;
                
            var id = "id_"+(idCounter++);
            observers[id] = observer;

            if (first) {
                animationLoop(0);
            }
            
            return () => delete observers[id];
        })
        .scan((acc, now) => {
            var last = acc.last ? acc.last : acc.now;
            var dt = now - last;
            if (dt > timeThreshold) {
                return  {now: now, dt: dt};
            } else {
                return  {last: last, now: now};
            }
        }, {last: 0, now: 0})
        .filter((t) => t.dt !== undefined )
        .share();

        animationLoop = (timestamp) => {
            var keys = Object.keys(observers);

            if (keys.length === 0) {
                return;
            }
            
            keys.forEach((key) => observers[key].onNext(timestamp));

            requestAnimationFrame(animationLoop);
        };

        return animationObservable;
    }

    //------ PIPES ---------
    frameTick
        .scan(groundPhysics, {x:0})
        .subscribe(renderGround);

    var marioMovement = frameTick
        .merge(userClick.buffer(frameTick))
        .scan((oldEffects, element) => {
            var newEffects = Object.assign({}, oldEffects);

            if (element.dt === undefined) {
                newEffects.clicked = element.length > 0;
            } else {
                newEffects.t = element;
            }

            return newEffects;
        }, {})
        .filter((effects) => effects.t !== undefined && effects.clicked !== undefined)
        .scan(marioPhysics, {x:30, y:GROUND_OFFSET, vx:0, vy:0, node: mario })
        .share();

    marioMovement
        .subscribe(renderMario);

    function createCoin(id) {
        return frameTick
            .merge(marioMovement)
            .scan((oldEffects, element) => {
                var newEffects = Object.assign({}, oldEffects);
                if (element.dt === undefined) {
                    newEffects.m = element;
                } else {
                    newEffects.t = element;
                }
                return newEffects;
            }, {})
            .filter((effects) => effects.m !== undefined && effects.t !== undefined )
            .scan(coinPhysics, {x: targetEl.clientWidth, y: 250, vx: -6, vy:0, id: id})
            .takeWhile(onScreen)
    }

    frameTick
        .scan((acc, t) => acc > 3000 ? 0 : acc + t.dt, 0)
        .filter((t) => t > 3000 )
        .flatMap(() => {
            var id = coins.create();
            return createCoin(id).doOnCompleted(() => coins.remove(id))
        })
        .doOnNext((c) => {
            if (c.gained) {
                gainedCoins.onNext(c);
            }
        })
        .subscribe(coins.render);

    gainedCoins
        .skip(1)
        .scan((acc, c) => ++acc, 0)
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