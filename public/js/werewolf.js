class Card extends Phaser.GameObjects.Sprite {

    constructor(scene, x, y, character) {
        super(scene, x, y);
        this.setTexture(character);
        this.character = character;
        this.chosen = false;
    }

    select() {
        this.chosen = true;
        this.setAlpha(1);
    }

    deselect() {
        this.chosen = false;
        this.setAlpha(0.4);
    }
}

class Player extends Phaser.GameObjects.Sprite {

    constructor(scene, x, y, playerId, playerName, character) {
        super(scene, x, y);
        this.setTexture('card');
        this.character = character;
        this.playerName = playerName;
        this.playerId = playerId;
        this.hidden = true;
    }

    hide() {
        this.hidden = true;
        this.setTexture('card');
    }

    show() {
        this.hidden = false;
        this.setTexture(this.character);
    }

    flip() {
        if (this.hidden) {
            this.show();
        } else {
            this.hide();
        }
    }

    select() {
        this.setAlpha(0.4);
    }

    deselect() {
        this.setAlpha(1);
    }
}

var config = {
    parent: 'divId',
    // parent: 'phaser-example',
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    dom: {
        createContainer: true
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

var player;
var playerNames;
var allPlayers;
var cardCount = 0;
var selectedCard;
var table;
var hideAll;
var showAll;
var originX = 600;
var originY = 400;

var allCharacters;
var allCards;
var originX;
var originY;
var name2;
var start;
var cardCountText;
var playerCountText;


function preload() {
    this.load.plugin('rexinputtextplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexinputtextplugin.min.js', true);
    this.load.image('card', 'assets/card.png');
    this.load.image('table', 'assets/table2.png');
    this.load.image('werewolf1', 'assets/werewolf.jpg');
    this.load.image('werewolf2', 'assets/werewolf.jpg');
    this.load.image('minion', 'assets/minion.jpg');
    this.load.image('seer', 'assets/seer.jpg');
    this.load.image('troublemaker', 'assets/troublemaker.jpg');
    this.load.image('robber', 'assets/robber.jpg');
    this.load.image('mason1', 'assets/mason.jpg');
    this.load.image('mason2', 'assets/mason.jpg');
    this.load.image('insomniac', 'assets/insomniac.jpg');
    this.load.image('tanner', 'assets/tanner.jpg');
    this.load.image('drunk', 'assets/drunk.jpg');
    this.load.image('hunter', 'assets/hunter.jpg');
    this.load.image('villager1', 'assets/villager.jpg');
    this.load.image('villager2', 'assets/villager.jpg');
    this.load.image('villager3', 'assets/villager.jpg');
    this.load.image('doppleganger', 'assets/doppleganger.jpg');
    this.load.image('background', 'assets/nightsky.jpg');
}

function create() {
    this.socket = io();
    var self = this;
    allPlayers = {};
    playerNames = {};
    background = this.add.image(0, 0, 'background').setOrigin(0, 0).setScale(0.5).setInteractive();

    this.socket.on('nameChange', function (nameInfo) {
        allPlayers[nameInfo.playerId].playerName = inputText.text;
    });

    this.socket.on('currentPlayers', function (players) {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayers(self, players[id]);
            }
        });
    });

    this.socket.on('newPlayer', function (playerInfo) {
        addOtherPlayers(self, playerInfo);
    });

    this.socket.on('disconnect', function (playerId) {
        Object.keys(allPlayers).forEach(function (otherPlayerId) {
            if (playerId === otherPlayerId) {
                allPlayers[playerId].destroy();
                delete allPlayers[playerId];
                playerNames[playerId].destroy();
                delete playerNames[playerId];
            }
        });
    });

    this.socket.on('cardChosen', function (cardData) {
        var card;
        allCards.forEach(function (c) {
            if (c.character === cardData.character) {
                card = c;
            }
        });

        if (cardData.chosen) {
            card.select();
            cardCount++;
        } else {
            card.deselect();
            cardCount--;
        }
    });

    this.socket.on('updatePlayerCharacter', function (playerData) {
        var playerToUpdate = allPlayers[playerData.playerId];
        playerToUpdate.character = playerData.character;

        if (!playerToUpdate.hidden) {
            playerToUpdate.show();
        }
    });

    this.socket.on('gameStarted', function () {
        startGame();
    });

    this.socket.on('movePlayer', function (playerInfo) {
        var xCoor = originX + playerInfo.x;
        var yCoor = originY + playerInfo.y;
        var id = playerInfo.playerId;
        allPlayers[id].setPosition(xCoor, yCoor);
        allPlayers[id].character = cards[playerInfo.index];
        allPlayers[id].setVisible(true);
        allPlayers[id].hide();
        allPlayers[id].setInteractive();

        // var nameX = originX + (1.3 * playerInfo.x);
        // var nameY = originY + (1.3 * playerInfo.y);
        var nameX = Math.floor(Math.random() * 200) + 50;
        var nameY = Math.floor(Math.random() * 200) + 50;
        playerNames[id].setVisible(true);
        playerNames[id].setPosition(nameX, nameY);
    });

    this.socket.on('hiddenAll', function () {
        Object.keys(allPlayers).forEach(function (id) {
            allPlayers[id].hide();
        });
    });

    this.socket.on('shownAll', function () {
        Object.keys(allPlayers).forEach(function (id) {
            allPlayers[id].show();
        });
    });

    this.socket.on('reset', function () {
        reset();
    });

    this.socket.on('observeGame', function () {
        start.setVisible(false);
    })

    this.socket.on('setCenterCards', function (centerCards) {
        // add centercards
        const centerCard1 = self.add.existing(
            new Player(self, originX - 100, originY, 'center1', '', centerCards.first));
        const centerCard2 = self.add.existing(
            new Player(self, originX, originY, 'center2', '', centerCards.second));
        const centerCard3 = self.add.existing(
            new Player(self, originX + 100, originY, 'center3', '', centerCards.third));
        centerCard1.setInteractive();
        centerCard2.setInteractive();
        centerCard3.setInteractive();
        centerCard1.setScale(0.7);
        centerCard2.setScale(0.7);
        centerCard3.setScale(0.7);

        allPlayers['center1'] = centerCard1;
        allPlayers['center2'] = centerCard2;
        allPlayers['center3'] = centerCard3;
    })

    name2 = this.add.text(1000, 10, '', { fill: '#00ff00' });

    table = this.add.image(originX, originY, 'table').setScale(0.7).setInteractive();
    table.setVisible(false);
    this.input.mouse.disableContextMenu();

    // set up cards for selection screen
    allCharacters = new Array('werewolf1', 'werewolf2', 'minion', 'seer',
        'troublemaker', 'robber', 'mason1', 'mason2', 'insomniac',
        'tanner', 'drunk', 'hunter', 'villager1', 'villager2', 'villager3',
        'doppleganger');

    allCards = new Array();
    var rowCount = 0;
    var colCount = 0;

    for (let i = 0; i < allCharacters.length; i++) {
        var x = originX + ((rowCount * 100) - 250);
        var y = originY + ((colCount * 150) - 250);
        var card = this.add.existing(new Card(this, x, y, allCharacters[i])).setScale(0.7);
        allCards.push(card);
        card.setInteractive();
        card.setVisible(true);
        card.deselect();
        if (rowCount++ >= 5) {
            rowCount = 0;
            colCount++;
        }
    }

    cardCountText = this.add.text(50, 500, '', { fill: '#00ff00' });
    playerCountText = this.add.text(50, 530, '', { fill: '#00ff00' });
    start = this.add.text(550, 600, 'Start Game',
        { fill: '#472F0D', backgroundColor: '#FFD966' }).setInteractive();
    hideAll = this.add.text(100, 450, 'Hide All',
        { fill: '#472F0D', backgroundColor: '#FFD966' });
    showAll = this.add.text(100, 500, 'Show All',
        { fill: '#472F0D', backgroundColor: '#FFD966' });
    hideAll.setVisible(false);
    showAll.setVisible(false);
    start.setVisible(false);

    setName = this.add.text(600, 500, 'Join Game',
        { fill: '#472F0D', backgroundColor: '#FFD966' }).setInteractive();
    // var inputText = this.add.rexInputText(400, 400, 10, 10, {
    //     type: 'textarea',
    //     text: 'hello world',
    //     fontSize: '12px',
    // });
    // inputText = this.add.rexInputText(600, 400, 150, 50,
    //     { color: '#472F0D', backgroundColor: '#FFD966',
    //     fontSize: '12px', placeholder: 'set player name' });
    setName.on('pointerup', function (pointer) {
        // self.emit('playerName', { playerId: self.player.playerId, name: inputText.text })
        start.setVisible(true);
        setName.setVisible(false);
    });

    start.on('pointerup', function (pointer) {
        self.socket.emit('startGame');
    });

    this.input.on('gameobjectup', function (pointer, gameObject) {
        if (gameObject instanceof Card) {
            self.socket.emit('chooseCard', { character: gameObject.character, chosen: !gameObject.chosen });
        } else if (gameObject instanceof Player) {
            if (pointer.rightButtonDown()) {
                gameObject.flip();
            } else {
                if (selectedCard === gameObject) {
                    // deselect card
                    selectedCard.deselect();
                    selectedCard = null;
                } else if (selectedCard == null) {
                    // select card
                    selectedCard = gameObject;
                    gameObject.select();
                } else {
                    // swap with selected card
                    self.socket.emit('swapCards',
                        { playerId1: gameObject.playerId, playerId2: selectedCard.playerId });

                    selectedCard.deselect();
                    selectedCard = null;
                }
            }
        } else if (gameObject === hideAll) {
            self.socket.emit('hideAll');
        } else if (gameObject === showAll) {
            self.socket.emit('showAll');
        }
    });
}

function update() {
    var pointer = this.input.activePointer;

    name2.setText([
        'x: ' + pointer.worldX,
        'y: ' + pointer.worldY,
        'isDown: ' + pointer.isDown
    ]);

    cardCountText.setText("Cards selected: " + cardCount);
    playerCountText.setText("Players online: " + Object.keys(allPlayers).length);
}

function reset() {
    cardCount = 0;
    allCards.forEach(function (card) {
        card.setInteractive();
        card.setVisible(true);
        card.deselect();
    });
    hideAll.setVisible(false);
    showAll.setVisible(false);
    start.setVisible(true);
    cardCountText.setVisible(true);
    playerCountText.setVisible(true);
    table.setVisible(false);

    if (allPlayers['center1']) {
        allPlayers['center1'].destroy();
        delete allPlayers['center1'];
        allPlayers['center2'].destroy();
        delete allPlayers['center2'];
        allPlayers['center3'].destroy();
        delete allPlayers['center3'];
    }
    Object.keys(allPlayers).forEach(function (playerId) {
        allPlayers[playerId].setVisible(false);
    });
}

function startGame() {
    cardCountText.setVisible(false);
    playerCountText.setVisible(false);
    start.setVisible(false);
    table.setVisible(true);
    hideAll.setInteractive();
    showAll.setInteractive();
    hideAll.setVisible(true);
    showAll.setVisible(true);

    allCards.forEach(function (c) {
        c.setVisible(false);
        c.removeInteractive();
    });

    Object.keys(allPlayers).forEach(function (playerId) {
        allPlayers[playerId].setVisible(true);
        allPlayers[playerId].setInteractive();
    })
}

function addPlayer(self, playerInfo) {
    self.player = self.add.existing(
        new Player(self, playerInfo.x, playerInfo.y, playerInfo.playerId, playerInfo.name, playerInfo.character));
    self.player.setVisible(false);
    self.player.setScale(0.7);
    allPlayers[playerInfo.playerId] = self.player;

    var name = self.add.text(playerInfo.x, playerInfo.y, playerInfo.name,
        { fill: '#472F0D', backgroundColor: '#FFD966' });
    playerNames[playerInfo.playerId] = name;
    // name.setVisible(false);
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.add.existing(
        new Player(self, playerInfo.x, playerInfo.y, playerInfo.playerId, playerInfo.name, playerInfo.character));
    otherPlayer.setVisible(false);
    otherPlayer.setScale(0.7);
    allPlayers[playerInfo.playerId] = otherPlayer;

    var name = self.add.text(playerInfo.x, playerInfo.y, playerInfo.name,
        { fill: '#472F0D', backgroundColor: '#FFD966' });
    playerNames[playerInfo.playerId] = name;
    // name.setVisible(false);
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
