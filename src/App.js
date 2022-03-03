import Phaser from "phaser";
import { IonPhaser } from "@ion-phaser/react";
import { useMoralis } from "react-moralis";

import BackgroundImage from "./assets/BG.png";
import tile from "./assets/tile.png";
import buddy from "./assets/buddy.png";
import coin from "./assets/coin.png";
import bomb from "./assets/bomb.png";

const App = () => {
  const { Moralis, authenticate, logout, isAuthenticated, user } = useMoralis();

  let platforms;
  let player;
  let cursors;
  let competitors = {};
  let stars;
  let score = 0;
  let scoreText;
  let bombs;

  const game = {
    width: 800,
    height: 600,
    type: Phaser.AUTO,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 300 },
        debug: false,
      },
    },
    scene: {
      preload: function () {
        this.load.setCORS("anonymous");
        this.textures.addBase64("tile", tile);
        this.textures.addBase64("buddy", buddy);
        this.textures.addBase64("coin", coin);
        this.textures.addBase64("bomb", bomb);
        this.load.image("background", BackgroundImage);
      },
      create: async function () {
        this.add.image(400, 300, "background").setScale(0.55);

        platforms = this.physics.add.staticGroup();
        platforms.create(200, 500, "tile").setScale(0.5).refreshBody();
        platforms.create(800, 400, "tile").setScale(0.5).refreshBody();
        platforms.create(635, 400, "tile").setScale(0.5).refreshBody();
        platforms.create(470, 400, "tile").setScale(0.5).refreshBody();
        platforms.create(100, 200, "tile").setScale(0.5).refreshBody();
        platforms.create(50, 300, "tile").setScale(0.5).refreshBody();
        platforms.create(160, 340, "tile").setScale(0.5).refreshBody();
        platforms.create(300, 500, "tile").setScale(0.5).refreshBody();
        platforms.create(400, 100, "tile").setScale(0.5).refreshBody();
        platforms.create(600, 100, "tile").setScale(0.5).refreshBody();
        platforms.create(700, 200, "tile").setScale(0.5).refreshBody();
        platforms.create(300, 250, "tile").setScale(0.5).refreshBody();

        player = this.physics.add
          .sprite(500, 200, "buddy")
          .setScale(0.1)
          .refreshBody();
        player.setBounce(0.2);
        player.setCollideWorldBounds(false);

        this.physics.add.collider(player, platforms);
        cursors = this.input.keyboard.createCursorKeys();

        stars = this.physics.add.group({
          key: "coin",
          repeat: 11,
          setXY: { x: 12, y: 0, stepX: 70 },
        });

        stars.children.iterate(function (child) {
          child.setScale(0.1);
          child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        });

        scoreText = this.add.text(16, 16, "score: 0", {
          fontSize: "32px",
          fill: "#BADA55",
        });

        function hitBomb(player, bomb) {
          this.physics.pause();

          player.setTint(0xff0000);

          player.anims.play("turn");
        }

        bombs = this.physics.add.group();

        this.physics.add.collider(bombs, platforms);

        this.physics.add.collider(player, bombs, hitBomb, null, this);

        function collectStar(player, star) {
          star.disableBody(true, true);
          score += 10;
          scoreText.setText("Score: " + score);

          if (stars.countActive(true) === 0) {
            stars.children.iterate(function (child) {
              child.enableBody(true, child.x, 0, true, true);
            });

            const x =
              player.x < 400
                ? Phaser.Math.Between(400, 800)
                : Phaser.Math.Between(0, 400);

            const bomb = bombs.create(x, 16, "bomb");
            bomb.setBounce(1);
            bomb.setScale(0.01);
            bomb.setCollideWorldBounds(true);
            bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
          }
        }

        this.physics.add.collider(stars, platforms);

        this.physics.add.overlap(player, stars, collectStar, null, this);

        let query = new Moralis.Query("PlayerPosition");
        let subscription = await query.subscribe();
        subscription.on("create", (plocation) => {
          if (plocation.get("player") !== user.get("ethAddress")) {
            if (competitors[plocation.get("player")] === undefined) {
              competitors[plocation.get("player")] = this.add
                .image(plocation.get("x"), plocation.get("y"), "buddy")
                .setScale(0.1);
            } else {
              competitors[plocation.get("player")].x = plocation.get("x");
              competitors[plocation.get("player")].y = plocation.get("y");
            }
          }
        });
      },
      update: async function () {
        if (cursors.left.isDown) {
          player.setVelocityX(-160);
          player.flipX = true;
        } else if (cursors.right.isDown) {
          player.setVelocityX(160);
          player.flipX = false;
        } else {
          player.setVelocityX(0);
        }

        if (cursors.up.isDown && player.body.touching.down) {
          player.setVelocityY(-330);
        }

        if (player.lastX !== player.x || player.lastY !== player.y) {
          let userPosition = user;

          const PlayerPosition = Moralis.Object.extend("PlayerPosition");
          const playerPosition = new PlayerPosition();

          playerPosition.set("player", userPosition.get("ethAddress"));
          playerPosition.set("x", player.x);
          playerPosition.set("y", player.y);

          player.lastX = player.x;
          player.lastY = player.y;

          await playerPosition.save();
        }
      },
    },
  };

  if (!isAuthenticated) {
    return (
      <div>
        <button onClick={() => authenticate()}>Connect Wallet</button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => logout()}>Disconnect Wallet</button>
      <IonPhaser game={game} initialize={true} />
    </>
  );
};

export default App;
