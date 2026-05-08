const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#3d8b3d',
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);

let player, teammate, enemy1, enemy2, goalie;
let ball;
let cursors, keys;
let playerSpeed = 200;
let ballSpeed = 350;
let canShoot = true;
let scorePlayer = 0, scoreEnemy = 0;
let scoreText, timeText, infoText;
let gameTime = 90; // secondi
let gameStarted = false;

function preload() {
    // Giocatore blu
    let playerG = this.make.graphics();
    playerG.fillStyle(0x0088ff, 1);
    playerG.fillCircle(15, 15, 15);
    playerG.lineStyle(2, 0x000000, 1);
    playerG.strokeCircle(15, 15, 15);
    playerG.generateTexture('player', 30, 30);
    
    // Nemico rosso
    let enemyG = this.make.graphics();
    enemyG.fillStyle(0xff0000, 1);
    enemyG.fillCircle(15, 15, 15);
    enemyG.lineStyle(2, 0x000000, 1);
    enemyG.strokeCircle(15, 15, 15);
    enemyG.generateTexture('enemy', 30, 30);
    
    // Portiere giallo
    let goalieG = this.make.graphics();
    goalieG.fillStyle(0xffff00, 1);
    goalieG.fillCircle(15, 15, 15);
    goalieG.generateTexture('goalie', 30, 30);
    
    // Palla
    let ballG = this.make.graphics();
    ballG.fillStyle(0xffffff, 1);
    ballG.fillCircle(8, 8, 8);
    ballG.lineStyle(1, 0x000000, 1);
    ballG.lineBetween(8, 0, 8, 16);
    ballG.lineBetween(0, 8, 16, 8);
    ballG.generateTexture('ball', 16, 16);
}

function create() {
    // CAMPO
    let graphics = this.add.graphics();
    // Linee campo
    graphics.lineStyle(4, 0xffffff, 1);
    graphics.strokeRect(50, 50, 700, 500);
    graphics.lineBetween(400, 50, 400, 550);
    graphics.strokeCircle(400, 300, 80);
    // Aree rigore
    graphics.strokeRect(50, 200, 120, 200);
    graphics.strokeRect(630, 200, 120, 200);
    // Porte
    graphics.lineStyle(8, 0xffffff, 1);
    graphics.lineBetween(50, 250, 50, 350);
    graphics.lineBetween(750, 250, 750, 350);
    
    // PALLA
    ball = this.physics.add.sprite(400, 300, 'ball');
    ball.setDamping(true);
    ball.setDrag(0.9);
    ball.setBounce(0.8);
    ball.setCollideWorldBounds(true);
    
    // SQUADRA BLU - TU
    player = this.physics.add.sprite(200, 300, 'player');
    player.setCollideWorldBounds(true);
    player.setDamping(true);
    player.setDrag(0.85);
    
    teammate = this.physics.add.sprite(150, 200, 'player');
    teammate.setCollideWorldBounds(true);
    
    // SQUADRA ROSSA - AI
    enemy1 = this.physics.add.sprite(600, 300, 'enemy');
    enemy1.setCollideWorldBounds(true);
    
    enemy2 = this.physics.add.sprite(650, 400, 'enemy');
    enemy2.setCollideWorldBounds(true);
    
    goalie = this.physics.add.sprite(720, 300, 'goalie');
    goalie.setCollideWorldBounds(true);
    goalie.body.immovable = true;
    
    // FISICA
    this.physics.add.collider(player, ball, kickBall, null, this);
    this.physics.add.collider(teammate, ball);
    this.physics.add.collider(enemy1, ball);
    this.physics.add.collider(enemy2, ball);
    this.physics.add.collider(goalie, ball);
    this.physics.add.overlap(player, ball, attachBall, null, this);
    
    // CONTROLLI
    cursors = this.input.keyboard.createCursorKeys();
    keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,X');
    
    // Touch: tap per muovere, doppio tap per tirare
    this.input.on('pointerdown', (pointer) => {
        let dir = new Phaser.Math.Vector2(pointer.x - player.x, pointer.y - player.y);
        dir.normalize();
        player.setVelocity(dir.x * playerSpeed, dir.y * playerSpeed);
        
        // Doppio tap = tiro
        if (pointer.event.detail === 2 && hasBall(player)) {
            shootBall.call(this);
        }
    });
    
    // UI
    scoreText = this.add.text(400, 20, 'BLU 0 - 0 ROSSI', { 
        fontSize: '32px', fill: '#fff', fontStyle: 'bold' 
    }).setOrigin(0.5);
    
    timeText = this.add.text(400, 580, 'TEMPO: 90', { 
        fontSize: '24px', fill: '#fff' 
    }).setOrigin(0.5);
    
    infoText = this.add.text(400, 300, 'TOCCA PER MUOVERTI\nSPACE/X = TIRA | DOPPIO TAP = TIRA', { 
        fontSize: '20px', fill: '#ffff00', align: 'center' 
    }).setOrigin(0.5);
    
    this.time.delayedCall(3000, () => {
        infoText.destroy();
        gameStarted = true;
    });
    
    // Timer partita
    this.time.addEvent({
        delay: 1000,
        callback: () => {
            if (gameStarted && gameTime > 0) {
                gameTime--;
                timeText.setText('TEMPO: ' + gameTime);
                if (gameTime === 0) endGame.call(this);
            }
        },
        loop: true
    });
}

function update() {
    // MOVIMENTO GIOCATORE
    player.setVelocity(0);
    if (cursors.left.isDown || keys.A.isDown) player.setVelocityX(-playerSpeed);
    if (cursors.right.isDown || keys.D.isDown) player.setVelocityX(playerSpeed);
    if (cursors.up.isDown || keys.W.isDown) player.setVelocityY(-playerSpeed);
    if (cursors.down.isDown || keys.S.isDown) player.setVelocityY(playerSpeed);
    
    // TIRO
    if ((keys.SPACE.isDown || keys.X.isDown) && canShoot && hasBall(player)) {
        shootBall.call(this);
    }
    
    // AI SEMPLICE
    if (gameStarted) {
        // Nemici inseguono palla
        this.physics.moveToObject(enemy1, ball, 120);
        this.physics.moveToObject(enemy2, ball, 100);
        
        // Portiere segue Y della palla
        if (Math.abs(goalie.y - ball.y) > 10) {
            goalie.setVelocityY(ball.y > goalie.y ? 100 : -100);
        } else {
            goalie.setVelocityY(0);
        }
        
        // Compagno ti segue
        if (Phaser.Math.Distance.Between(teammate.x, teammate.y, player.x, player.y) > 100) {
            this.physics.moveToObject(teammate, player, 150);
        } else {
            teammate.setVelocity(0);
        }
    }
    
    // GOL
    if (ball.x < 60 && ball.y > 250 && ball.y < 350) {
        goal.call(this, 'enemy');
    }
    if (ball.x > 740 && ball.y > 250 && ball.y < 350) {
        goal.call(this, 'player');
    }
}

function hasBall(p) {
    return Phaser.Math.Distance.Between(p.x, p.y, ball.x, ball.y) < 25;
}

function attachBall(p, b) {
    if (!hasBall(p)) return;
    // Palla segue il giocatore
    let angle = Phaser.Math.Angle.Between(p.x, p.y, b.x, b.y);
    b.x = p.x + Math.cos(angle) * 20;
    b.y = p.y + Math.sin(angle) * 20;
}

function kickBall(p, b) {
    let angle = Phaser.Math.Angle.Between(p.x, p.y, b.x, b.y);
    b.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
}

function shootBall() {
    canShoot = false;
    // Tira verso la porta avversaria
    let targetX = 750, targetY = 300;
    let angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY);
    angle += Phaser.Math.FloatBetween(-0.3, 0.3); // Imprecisione
    ball.setVelocity(Math.cos(angle) * ballSpeed, Math.sin(angle) * ballSpeed);
    
    this.time.delayedCall(500, () => { canShoot = true; });
    
    // Effetto
    this.cameras.main.shake(100, 0.01);
}

function goal(team) {
    if (team === 'player') scorePlayer++;
    else scoreEnemy++;
    
    scoreText.setText(`BLU ${scorePlayer} - ${scoreEnemy} ROSSI`);
    
    // Reset posizioni
    ball.setPosition(400, 300);
    ball.setVelocity(0, 0);
    player.setPosition(200, 300);
    teammate.setPosition(150, 200);
    enemy1.setPosition(600, 300);
    enemy2.setPosition(650, 400);
    goalie.setPosition(720, 300);
    
    // Effetto gol
    this.cameras.main.flash(500, 255, 255, 0);
    let goalText = this.add.text(400, 300, 'GOOOOOL!', { 
        fontSize: '64px', fill: '#ffff00', fontStyle: 'bold' 
    }).setOrigin(0.5);
    this.time.delayedCall(1500, () => goalText.destroy());
}

function endGame() {
    gameStarted = false;
    let winner = scorePlayer > scoreEnemy ? 'BLU VINCE!' : scoreEnemy > scorePlayer ? 'ROSSI VINCONO!' : 'PAREGGIO!';
    this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
    this.add.text(400, 300, winner + '\nF5 PER RIGIOCARE', { 
        fontSize: '48px', fill: '#fff', align: 'center' 
    }).setOrigin(0.5);
                        }
