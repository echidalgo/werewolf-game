var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

var players = {};
var allCards = {
    werewolf1: false, werewolf2: false, minion: false,
    seer: false, troublemaker: false, robber: false, mason1: false,
    mason2: false, insomniac: false, tanner: false, drunk: false,
    hunter: false, villager1: false, villager2: false, villager3: false,
    doppleganger: false
};
let playedCards = new Array();
var gameStarted = false;
var posns;
var names = ['Emilia', 'Hazel', 'Sophie', 'Lily', 'Emma', 'Marley', 'Roland'];

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    console.log('a user connected: ', socket.id);

    // create a new player and add it to our players object
    players[socket.id] = {
        x: 0,
        y: 0,
        playerId: socket.id,
        character: 'card'
        // playing: true
    };
    // send the players object to the new player
    socket.emit('currentPlayers', players);
    // send the new player the current selected cards
    Object.keys(allCards).forEach(function (char) {
        if (allCards[char]) {
            socket.emit('cardChosen', { character: char, chosen: true });
        }
    });
    if (gameStarted) {
        // if game has already started, follow updates but don't allow any card interaction
        socket.emit('observeGame');
        // players[socket.id].playing = false;
    }
    // } else {
    socket.broadcast.emit('newPlayer', players[socket.id]);
    console.log(Object.keys(players).length, ' players');
    // }

    // socket.on('playerName', function (nameInfo) {
    //     players[nameInfo.playerId].name = nameInfo.name;
    //     socket.broadcast.emit('nameChange', nameInfo);
    // });

    // when a player disconnects, remove them from our players object
    socket.on('disconnect', function () {
        console.log('user disconnected: ', socket.id);
        io.emit('disconnect', socket.id);
        console.log(Object.keys(players).length, ' players');
        delete players[socket.id];

        // resetGame();
    });

    socket.on('getCurrentPlayers', function () {
        socket.emit('currentPlayers', players);
    });

    socket.on('chooseCard', function (cardData) {
        allCards[cardData.character] = cardData.chosen;
        io.emit('cardChosen', cardData);
    });

    socket.on('startGame', function () {
        gameStarted = true;
        io.emit('gameStarted');

        // use updatePlayerCharacter to make sure they're all consistent
        playedCards = new Array();
        Object.keys(allCards).forEach(function (char) {
            if (allCards[char]) {
                playedCards.push(char);
            }
        });
        shuffle(playedCards);

        if (playedCards.length - 3 >= Object.keys(players).length) {
            posns = makePositions(playedCards.length - 3, 250);
        } else {
            posns = makePositions(Object.keys(players).length - 3, 250);
        }
        var idx = 0;
        var nameIdx = 0;
        Object.keys(players).forEach(function (id) {
            players[id].character = playedCards[idx];
            players[id].x = posns[idx][0];
            players[id].y = posns[idx][1];
            io.emit('updatePlayerCharacter', { playerId: id, character: playedCards[idx] });
            io.emit('movePlayer', { playerId: id, x: players[id].x, y: players[id].y });
            io.emit('addName', { playerId: id, x: players[id].x, y: players[id].y, name: names[nameIdx] });
            idx++;
            if (nameIdx >= names.length) {
                nameIdx = 0;
            } else {
                nameIdx++;
            }
        });

        players['center1'] = { playerId: 'center1', character: playedCards[idx] };
        idx++;
        players['center2'] = { playerId: 'center2', character: playedCards[idx] };
        idx++;
        players['center3'] = { playerId: 'center3', character: playedCards[idx] };
        io.emit('setCenterCards',
            {
                first: players['center1'].character, second: players['center2'].character,
                third: players['center3'].character
            });

        io.emit('hiddenAll');
        // io.emit('shownAll');
    });

    socket.on('hideAll', function () {
        io.emit('hiddenAll');
    });

    socket.on('showAll', function () {
        io.emit('shownAll');
    });

    socket.on('swapCards', function (cardData) {
        var firstChar = players[cardData.playerId1].character;
        var secondChar = players[cardData.playerId2].character;

        players[cardData.playerId1].character = secondChar;
        io.emit('updatePlayerCharacter', { playerId: cardData.playerId1, character: secondChar })

        players[cardData.playerId2].character = firstChar;
        io.emit('updatePlayerCharacter', { playerId: cardData.playerId2, character: firstChar })
    });

    socket.on('resetGame', function () {
        // resetGame();
        io.emit('gameReset');
        nameIdx = 0;
        gameStarted = false;
        playedCards = new Array();
        posns = null;
        // Object.keys(allCards).forEach(function (char) {
        //     allCards[char] = false;
        // });
        Object.keys(players).forEach(function (id) {
            delete players[id];
        });
        if (players['center1']) {
            delete players['center1'];
            delete players['center2'];
            delete players['center3'];
        }
    });
});

// server.listen(8081, function () {
//     console.log(`Listening on ${server.address().port}`);
// });
let port = process.env.PORT;
if (port == null || port == "") {
    port = 8081;
}
server.listen(port, function () {
    console.log(`Listening on ${server.address().port}`);
});

function resetGame() {
    io.emit('gameReset');
    nameIdx = 0;
    gameStarted = false;
    playedCards = new Array();
    posns = null;
    Object.keys(allCards).forEach(function (char) {
        allCards[char] = false;
    });
    // Object.keys(players).forEach(function (id) {
    //     delete players[id];
    // });
    if (players['center1']) {
        delete players['center1'];
        delete players['center2'];
        delete players['center3'];
    }
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function makePositions(playerCount, distance) {
    var theta = (2 * Math.PI) / playerCount;
    var currentAngle = (Math.PI / 2);
    var p = new Array();
    for (let i = 0; i < playerCount; i++) {
        currentAngle += theta;
        var x = (distance * Math.cos(currentAngle));
        var y = (distance * Math.sin(currentAngle));
        p.push([x, y]);
    }
    return p;
}
