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

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    console.log('a user connected: ', socket.id);

    // create a new player and add it to our players object
    players[socket.id] = {
        // x: Math.floor(Math.random() * 100) + 50,
        y: Math.floor(Math.random() * 300) + 50,
        x: 30,
        // y: 100,
        playerId: socket.id,
        name: 'player' + socket.id,
        // character: Object.keys(allCards)[Math.floor(Math.random() * 10)]
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
    // if (gameStarted) {
    //     // if game has already started, follow updates but don't allow any card interaction
    //     socket.emit('observeGame');
    //     // players[socket.id].playing = false;
    // } else {
        socket.broadcast.emit('newPlayer', players[socket.id]);
        console.log(Object.keys(players).length, ' players');
    // }

    socket.on('playerName', function (nameInfo) {
        players[nameInfo.playerId].name = nameInfo.name;
        socket.broadcast.emit('nameChange', nameInfo);
    });

    // when a player disconnects, remove them from our players object
    socket.on('disconnect', function () {
        console.log('user disconnected: ', socket.id);
        // if (players[socket.id].playing) {
            // emit a message to all players to remove this player
            io.emit('disconnect', socket.id);
            console.log(Object.keys(players).length, ' players');

            io.emit('reset');
            playedCards = new Array();
            gameStarted = false;
            Object.keys(allCards).forEach(function (char) {
                allCards[char] = false;
            });
        // }
        delete players[socket.id];
    });

    socket.on('getCurrentPlayers', function () {
        socket.emit('currentPlayers', players);
    });

    socket.on('chooseCard', function (cardData) {
        // console.log(cardData.character + ': ' + cardData.chosen);
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

        // posns = makePositions(Object.keys(players).length, 250);
        if (playedCards.length - 3 >= Object.keys(players).length) {
            posns = makePositions(playedCards.length - 3, 250);
        } else {
            posns = makePositions(Object.keys(players).length - 3, 250);
        }
        var idx = 0;
        Object.keys(players).forEach(function (id) {
            players[id].character = playedCards[idx];
            players[id].x = posns[idx][0];
            players[id].y = posns[idx][1];
            io.emit('updatePlayerCharacter', { playerId: id, character: playedCards[idx] });
            io.emit('movePlayer', { playerId: id, x: players[id].x, y: players[id].y });
            idx++;
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
});

server.listen(8081, function () {
    console.log(`Listening on ${server.address().port}`);
});

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