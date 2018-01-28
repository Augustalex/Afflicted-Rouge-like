(function () {
    let Blood = require('./Blood.js')
    let io = require('socket.io-client')
    let socket = io.connect('http://127.0.0.1:3032');
    //let socket = io.connect('http://192.168.1.106:3032');
    let Store = require('./Store.js')
    let StoreProxy = require('./StoreProxy.js')
    const input = require('./input.js');
    const fysik = require('./fysik.js');
    const rand255 = () => Math.round(Math.random() * 255)
    const genId = () => `${rand255()}${rand255()}${rand255()}`
    const color = `rgb(${rand255()},${rand255()},${rand255()})`
    const clientId = `${rand255()}${rand255()}`
    console.log('clientId: ', clientId)

    const createOwnPlayer = () => {
        return {
            id: clientId,
            x: rand255(),
            y: rand255(),
            color,
            speed: 20,
            shooting: {
                direction: {
                    x: 0,
                    y: 0
                }
            },
            moving: {
                x: 0,
                y: 0
            },
            health: 100
        }
    }

    let localStore = Store({
        store: {
            state: {
                localPlayerDead: true,
                playersById: {},
                bullets: {},
                removeRequests: [],
                blood: null
            },
            getters: {},
            mutations: {
                SET_PLAYER_POS({ state }, { id, x, y }) { //TODO deprecate
                    if (!state.playersById[id]) {
                        throw new Error('Player for id does not exist!');
                    }
                    state.playersById[id].x = x
                    state.playersById[id].y = y
                },
                SET_PLAYER_POSITION({ state }, { id, x, y }) {
                    if (state.playersById[id]) {
                        state.playersById[id].x = x
                        state.playersById[id].y = y
                    }
                },
                SET_PLAYER_MOVING({ state }, { id, moving }) {
                    state.playersById[id].moving = moving
                },
                SET_PLAYER_SHOOTING({ state }, { id, shooting }) {
                    state.playersById[id].shooting = shooting
                },
                SET_PLAYER_SHOOTING_DIRECTION({ state }, { id, direction }) {
                    state.playersById[id].shooting.direction = direction
                },
                MERGE_PLAYER_SHOOTING({ state }, { id, shooting }) {
                    Object.assign(state.playersById[id].shooting, shooting)
                },
                SET_PLAYER_HEALTH({ state }, { id, health }) {
                    if (state.playersById[id]) {
                        state.playersById[id].health = health
                    }
                },
                ADD_PLAYER({ state }, player) {
                    state.playersById[player.id] = player
                    if (player.id === clientId) {
                        console.log('ADDING LOCAL PLAYER')
                        state.localPlayerDead = false
                    }
                },
                ADD_BULLET({ state }, bullet) {
                    state.bullets[bullet.id] = bullet
                },
                SET_BULLET_POS({ state }, { id, x, y }) {
                    state.bullets[id].x = x
                    state.bullets[id].y = y
                },
                REMOVE_PLAYER({ state }, playerId) {
                    if (state.playersById[playerId]) {
                        state.removeRequests.push({
                            firstKey: 'playersById',
                            secondKey: playerId,
                            callback: () => {
                                if (playerId === clientId) {
                                    console.log('REMOVED LOCAL PLAYER')
                                    state.localPlayerDead = true
                                }
                            }
                        })
                    }
                },
                REMOVE_BULLET({ state }, bulletId) {
                    if (state.bullets[bulletId]) {
                        state.removeRequests.push({
                            firstKey: 'bullets',
                            secondKey: bulletId
                        })
                    }
                },
                SET_BLOOD_ENGINE({ state }, blood) {
                    state.blood = blood
                },
                ADD_BLOOD({ state }, { x, y }) {
                    if (state.blood) {
                        state.blood.add(x, y)
                    }
                }
            },
            actions: {
                addBloodTrail({ state }, playerId) {
                    let { x, y } = state.playersById[playerId]
                    state.blood.addTrail(x, y)

                    const bleed = (time, size) => {
                        setTimeout(() => {
                            if (!state.playersById[playerId]) return;
                            let { x, y } = state.playersById[playerId]
                            state.blood.addTrail(x, y, size)
                        }, time)
                    }
                    bleed(20, 1.5)
                    bleed(30, 1.4)
                    bleed(40, 1.3)
                    bleed(50, 1.2)
                    bleed(90, 1)
                    bleed(120, 1)
                    bleed(200, 1)
                    bleed(300, 1)
                    bleed(320, 1)
                    bleed(340, 1.8)
                    bleed(360, 1.5)
                    bleed(380, 1.5)
                    bleed(400, 1)
                    bleed(420, 1)
                    bleed(440, 1)
                    bleed(460, 1)
                    bleed(480, 1)
                    bleed(500, 1)
                },
                killPlayer({ state, commit }, playerId) {
                    if (state.playersById[playerId]) {
                        let { x, y } = state.playersById[playerId]
                        commit('REMOVE_PLAYER', playerId)
                        commit('ADD_BLOOD', { x, y })
                    }
                },
                playerShot({ state, dispatch, commit }, { id: playerId, damage }) {
                    if (state.playersById[playerId]) {
                        let { x, y, health } = state.playersById[playerId]
                        let newHealth = health - damage
                        if (newHealth <= 0) {
                            dispatch('killPlayer', playerId)
                        }
                        else {
                            commit('ADD_BLOOD', { x, y })
                            commit('SET_PLAYER_HEALTH', { id: playerId, health: newHealth })
                        }
                    }
                },
                firePlayerWeapon({ state, commit }, { id, direction }) {
                    let player = state.playersById[id]
                    let bulletId = genId()
                    let shootDir = Math.atan2(player.shooting.direction.y, player.shooting.direction.x)
                    let gunPosX = player.x + Math.cos(shootDir + Math.PI / 4) * 9
                    let gunPosY = player.y + Math.sin(shootDir + Math.PI / 4) * 9
                    let bullet = {
                        x: gunPosX,
                        y: gunPosY,
                        id: bulletId,
                        shooterId: id,
                        direction
                    }
                    commit('ADD_BULLET', bullet)

                    setTimeout(() => {
                        if (!state.bullets[bulletId]) return;
                        commit('REMOVE_BULLET', bulletId)
                    }, 2500);
                }
            }
        }
    })

    let store = StoreProxy({
        socket,
        store: localStore
    })
    store.commit('ADD_PLAYER', createOwnPlayer());

    let canvas = document.createElement('canvas')
    canvas.width = 1680;
    canvas.height = 1050;
    canvas.style.width = '1680px'
    canvas.style.height = '1000px'
    document.body.appendChild(canvas)
    let context = canvas.getContext('2d')
    localStore.commit('SET_BLOOD_ENGINE', Blood(canvas, context));
    var backgroundImage = new Image();
    backgroundImage.src = './sprites/back.png';
    var vignetteImage = new Image();
    vignetteImage.src = './sprites/vignette.png';

    let colorByShooterId = {}
    setInterval(() => {
        colorByShooterId = {}
    }, 30000)

    let respawning = false
    let lastTime = 0
    const loop = time => {
        let delta = ((time - lastTime) * .01) || .16
        lastTime = time

        input(store, clientId)
        fysik(localStore, store, delta)
        draw(canvas, context)
        gc()

        if (!respawning && store.state.localPlayerDead) {
            respawning = true
            console.log('RESPAWN IN 3 SECONDS')
            setTimeout(() => {
                let player = createOwnPlayer()
                store.commit('ADD_PLAYER', player);
                respawning = false
            }, 3000);
        }

        requestAnimationFrame(loop)
    }
    loop()

    function draw(canvas, context) {
        context.clearRect(0, 0, canvas.width, canvas.height)
        if (backgroundImage.complete) {
            context.globalAlpha = 0.8;
            context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height)
            context.globalAlpha = 1;
        }
        store.state.blood.animateAndDraw()

        let players = Object.keys(store.state.playersById).map(key => store.state.playersById[key])
        for (let player of players) {
            drawPlayer(context, player)
            colorByShooterId[player.id] = player.color
        }

        for (let bulletId of Object.keys(store.state.bullets)) {
            let bullet = store.state.bullets[bulletId]
            drawBullet(context, bullet, colorByShooterId[bullet.shooterId])
        }
        if (vignetteImage.complete) {
            context.drawImage(vignetteImage, 0, 0, canvas.width, canvas.height)
        }

        context.filter = "brightness(" + 1 + ") blur(" + 15 + "px)";
        context.globalCompositeOperation = "lighten";
        context.globalAlpha = 0.5;
        context.drawImage(canvas, 0, 0);
        context.filter = "none";
        context.globalCompositeOperation = "source-over";
    }

    function drawPlayer(context, { x, y, color, moving, shooting }) {
        context.fillStyle = color
        let aimVector = moving;
        if (shooting.direction.x || shooting.direction.y) {
            aimVector = shooting.direction
        }
        let dir = Math.atan2(aimVector.y, aimVector.x)
        fillRectRot(x, y, 10, 10, dir)
        context.fillStyle = 'black'
        let gunPosX = x + Math.cos(dir + Math.PI / 4) * 9
        let gunPosY = y + Math.sin(dir + Math.PI / 4) * 9
        fillRectRot(gunPosX, gunPosY, 8, 3, dir)
    }

    function drawBullet(context, bullet, color) {
        context.fillStyle = color
        let dir = Math.atan2(bullet.direction.y, bullet.direction.x);
        fillRectRot(bullet.x, bullet.y, 5, 5, dir)
    }

    function fillRectRot(x, y, width, height, dir) {
        context.save()
        context.translate(x, y)
        context.rotate(dir)
        context.fillRect(-width / 2, -height / 2, width, height)
        context.restore()
    }

    function gc() {
        for (let { firstKey, secondKey, callback } of store.state.removeRequests) {
            if (secondKey) {
                delete store.state[firstKey][secondKey]
            }
            else {
                delete store.state[firstKey]
            }
            if (callback) {
                callback()
            }
        }
        store.state.removeRequests = []
    }
})()