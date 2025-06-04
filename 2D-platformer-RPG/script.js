// Game initialization
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('start-screen');
const levelCompleteScreen = document.getElementById('level-complete');
const gameOverScreen = document.getElementById('game-over');
const startButton = document.getElementById('start-button');
const nextLevelButton = document.getElementById('next-level-button');
const restartButton = document.getElementById('restart-button');
const healthFill = document.getElementById('health-fill');
const xpFill = document.getElementById('xp-fill');
const playerLevelElement = document.getElementById('player-level');
const playerAttackElement = document.getElementById('player-attack');
const playerDefenseElement = document.getElementById('player-defense');
const playerLivesElement = document.getElementById('player-lives');
const currentLevelElement = document.getElementById('current-level');
const xpGainedElement = document.getElementById('xp-gained');
const dialogBox = document.getElementById('dialog-box');
const dialogName = document.getElementById('dialog-name');
const dialogText = document.getElementById('dialog-text');
const attackRangeSlider = document.getElementById('attack-range');
const attackRangeValue = document.getElementById('attack-range-value');

// Game state
let gameRunning = false;
let currentLevel = 1;
let levels = [];
let player = null;
let platforms = [];
let enemies = [];
let npcs = [];
let items = [];
let portals = [];
let arrows = [];
let gravity = 0.5;
let camera = { x: 0, y: 0 };
let keys = {};
let lastTime = 0;
let dialogActive = false;
let currentDialog = [];
let dialogIndex = 0;

// Sprite assets (using colored rectangles and simple shapes for this demo)
const sprites = {
  player: { width: 30, height: 50, color: '#4e9eff' },
  enemy: { width: 30, height: 50, color: '#ff3e3e' },
  npc: { width: 30, height: 50, color: '#4eff83' },
  platform: { color: '#8a5ec7' },
  item: { width: 20, height: 20, color: '#ffcc00' },
  portal: { width: 40, height: 60, color: '#ff00ff' }
};

// Player class
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = sprites.player.width;
    this.height = sprites.player.height;
    this.velocityX = 0;
    this.velocityY = 0;
    this.speed = 5;
    this.isDashing = false;
    this.dashForce = 15;
    this.dashCooldown = 0;
    this.dashCooldownMax = 120; // 2 seconds at 60fps
    this.dashDuration = 0;
    this.dashDurationMax = 12; // 0.2 seconds at 60fps
    this.dashDistance = 200;
    this.dashStartX = 0;
    this.canDash = true;
    this.jumpForce = 12;
    this.isJumping = false;
    this.direction = 1; // 1 for right, -1 for left
    this.health = 100;
    this.maxHealth = 100;
    this.lives = 3;
    this.maxLives = 3;
    this.xp = 0;
    this.xpToNextLevel = 100;
    this.level = 1;
    this.attack = 5;
    this.defense = 2;
    this.spawnX = x;
    this.spawnY = y;
    this.averageAttackSpeed = 20;
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.attackDuration = 0;
    this.attackDurationMax = 8; // How long attack animation lasts
    this.invulnerable = false;
    this.invulnerableTime = 0;
    this.attackBox = { width: 60, height: 35 }; // Configurable attack range
    this.hasBow = true; // Player starts with bow
    this.arrowSpeed = 8;
    this.bowCooldown = 0;
    this.bowCooldownMax = 30; // 0.5 seconds at 60fps
  }

  update() {
    // Handle dashing
    if (keys['shift'] && this.canDash && !this.isDashing) {
      this.startDash();
    }

    // Update dash state
    if (this.isDashing) {
      this.dashDuration--;
      if (this.dashDuration <= 0 || Math.abs(this.x - this.dashStartX) >= this.dashDistance) {
        this.endDash();
      }
    }

    // Update dash cooldown
    if (this.dashCooldown > 0) {
      this.dashCooldown--;
      if (this.dashCooldown <= 0) {
        this.canDash = true;
      }
    }

    // Movement (reduced during dash)
    if (!this.isDashing) {
      if (keys['ArrowLeft'] || keys['a']) {
        this.velocityX = -this.speed;
        this.direction = -1;
      } else if (keys['ArrowRight'] || keys['d']) {
        this.velocityX = this.speed;
        this.direction = 1;
      } else {
        this.velocityX = 0;
      }
    } else {
      // During dash, maintain dash velocity
      this.velocityX = this.dashForce * this.direction;
    }

    // Jumping
    if ((keys['ArrowUp'] || keys[' '] || keys['w']) && !this.isJumping) {
      this.velocityY = -this.jumpForce;
      this.isJumping = true;
    }

    // Attacking - trigger on key press or mouse click (not hold)
    if ((keys['j'] || keys['mouseclick']) && this.attackCooldown <= 0 && !this.isAttacking) {
      this.isAttacking = true;
      this.attackDuration = this.attackDurationMax;
      this.attackCooldown = this.averageAttackSpeed; // Attack Speed frames cooldown
    }

    // Bow shooting - trigger on K key or right click
    if ((keys['k'] || keys['rightclick']) && this.bowCooldown <= 0 && this.hasBow) {
      this.shootArrow();
      this.bowCooldown = this.bowCooldownMax;
    }

    // Update attack duration
    if (this.isAttacking) {
      this.attackDuration--;
      if (this.attackDuration <= 0) {
        this.isAttacking = false;
      }
    }

    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }

    // Update bow cooldown
    if (this.bowCooldown > 0) {
      this.bowCooldown--;
    }

    // Reset mouse click after processing
    if (keys['mouseclick']) {
      keys['mouseclick'] = false;
    }
    if (keys['rightclick']) {
      keys['rightclick'] = false;
    }

    // Apply gravity
    this.velocityY += gravity;

    // Update position
    this.x += this.velocityX;
    this.y += this.velocityY;
    
    // Check if player fell off the map
    if (this.y >= 900) {
      this.respawn();
    }
    // Check platform collisions
    this.checkPlatformCollisions();

    // Check enemy collisions
    this.checkEnemyCollisions();

    // Check item collisions
    this.checkItemCollisions();

    // Check portal collisions
    this.checkPortalCollisions();

    // Check NPC interactions
    if (keys['e'] && !dialogActive) {
      this.checkNPCInteractions();
    }

    // Update invulnerability
    if (this.invulnerable) {
      this.invulnerableTime--;
      if (this.invulnerableTime <= 0) {
        this.invulnerable = false;
      }
    }

    // Update UI
    healthFill.style.width = `${(this.health / this.maxHealth) * 100}%`;
    xpFill.style.width = `${(this.xp / this.xpToNextLevel) * 100}%`;
    playerLevelElement.textContent = this.level;
    playerAttackElement.textContent = this.attack;
    playerDefenseElement.textContent = this.defense;
    playerLivesElement.textContent = this.lives;
  }

  checkPlatformCollisions() {
    let onPlatform = false;

    for (const platform of platforms) {
      // Check if player is colliding with platform
      if (
        this.x + this.width > platform.x &&
        this.x < platform.x + platform.width &&
        this.y + this.height > platform.y &&
        this.y < platform.y + platform.height
      ) {
        // Collision from top
        if (this.y + this.height - this.velocityY <= platform.y) {
          this.y = platform.y - this.height;
          this.velocityY = 0;
          this.isJumping = false;
          onPlatform = true;
        }
        // Collision from bottom
        else if (this.y - this.velocityY >= platform.y + platform.height) {
          this.y = platform.y + platform.height;
          this.velocityY = 0;
        }
        // Collision from left
        else if (this.x + this.width - this.velocityX <= platform.x) {
          this.x = platform.x - this.width;
          this.velocityX = 0;
        }
        // Collision from right
        else if (this.x - this.velocityX >= platform.x + platform.width) {
          this.x = platform.x + platform.width;
          this.velocityX = 0;
        }
        // Check if is bellow map
      }
    }

    // If not on any platform, player is jumping/falling
    if (!onPlatform && this.velocityY === 0) {
      this.isJumping = true;
    }
  }

  checkEnemyCollisions() {
    // Only deal damage during the first few frames of attack
    if (this.isAttacking && this.attackDuration > this.attackDurationMax - 3) {
      const attackX = this.direction === 1 ? this.x + this.width : this.x - this.attackBox.width;
      const attackY = this.y + this.height / 2 - this.attackBox.height / 2;

      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // Check if attack box hits enemy
        if (
          attackX + this.attackBox.width > enemy.x &&
          attackX < enemy.x + enemy.width &&
          attackY + this.attackBox.height > enemy.y &&
          attackY < enemy.y + enemy.height
        ) {
          enemy.takeDamage(this.attack);
          if (enemy.health <= 0) {
            this.gainXP(enemy.xpValue);
            enemies.splice(i, 1);
          }
        }
      }
    }
  }

  checkItemCollisions() {
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];

      // Check if player collides with item
      if (
        this.x + this.width > item.x &&
        this.x < item.x + item.width &&
        this.y + this.height > item.y &&
        this.y < item.y + item.height
      ) {
        // Apply item effect
        if (item.type === 'health') {
          this.health = Math.min(this.health + 20, this.maxHealth);
        } else if (item.type === 'attack') {
          this.attack += 1;
        } else if (item.type === 'defense') {
          this.defense += 1;
        } else if (item.type === 'xp') {
          this.xp += 50;
        } else if (item.type === 'speed') {
          this.speed += 1;
        } else if (item.type === 'attackspeed') {
          this.averageAttackSpeed -= 5;
        } else if (item.type === '1up') {
          this.lives = Math.min(this.lives + 1, this.maxLives);
        }

        // Remove item
        items.splice(i, 1);
      }
    }
  }

  checkPortalCollisions() {
    for (const portal of portals) {
      // Check if player collides with portal
      if (
        this.x + this.width > portal.x &&
        this.x < portal.x + portal.width &&
        this.y + this.height > portal.y &&
        this.y < portal.y + portal.height
      ) {
        // Complete level
        completeLevel();
      }
    }
  }

  checkNPCInteractions() {
    for (const npc of npcs) {
      // Check if player is near NPC
      const distance = Math.sqrt(
        Math.pow(this.x + this.width / 2 - (npc.x + npc.width / 2), 2) +
        Math.pow(this.y + this.height / 2 - (npc.y + npc.height / 2), 2)
      );

      if (distance < 80) {
        startDialog(npc.name, npc.dialog);
        break;
      }
    }
  }

  takeDamage(damage) {
    if (!this.invulnerable) {
      const actualDamage = Math.max(1, damage - this.defense);
      this.health -= actualDamage;

      if (this.health <= 0) {
        this.respawn();
      } else {
        // Make player invulnerable for a short time
        this.invulnerable = true;
        this.invulnerableTime = 60; // 60 frames (1 second at 60fps)
      }
    }
  }

  gainXP(amount) {
    this.xp += amount;

    // Level up if enough XP
    if (this.xp >= this.xpToNextLevel) {
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpToNextLevel;
    this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
    this.attack += 2;
    this.defense += 1;
    this.maxHealth += 10;
    this.speed += 1;
    this.arrowSpeed += 1;
    this.health = this.maxHealth;
  }

  startDash() {
    this.isDashing = true;
    this.canDash = false;
    this.dashDuration = this.dashDurationMax;
    this.dashCooldown = this.dashCooldownMax;
    this.dashStartX = this.x;
    this.invulnerable = true;
    this.invulnerableTime = this.dashDurationMax; // Invulnerable during dash
  }

  endDash() {
    this.isDashing = false;
    this.dashDuration = 0;
  }

  shootArrow() {
    const arrow = new Arrow(
      this.x + (this.direction === 1 ? this.width : 0),
      this.y + this.height / 2,
      this.direction,
      this.arrowSpeed,
      this.attack
    );
    arrows.push(arrow);
  }

  respawn() {
    this.lives--;
    
    if (this.lives <= 0) {
      gameOver();
    } else {
      // Reset player position to spawn point
      this.x = this.spawnX;
      this.y = this.spawnY;
      this.velocityX = 0;
      this.velocityY = 0;
      this.health = this.maxHealth; // Restore to full health but keep maxHealth upgrades
      this.isJumping = false;
      this.isDashing = false;
      this.canDash = true;
      this.dashCooldown = 0;
      this.dashDuration = 0;
      
      // Brief invulnerability after respawn
      this.invulnerable = true;
      this.invulnerableTime = 120; // 2 seconds at 60fps
    }
  }

  draw() {
    // Draw player with dash effects
    let playerColor = sprites.player.color;
    
    if (this.isDashing) {
      playerColor = 'rgba(255, 255, 255, 0.8)';
      
      // Draw dash trail
      ctx.fillStyle = 'rgba(78, 158, 255, 0.3)';
      for (let i = 1; i <= 3; i++) {
        ctx.fillRect(
          this.x - camera.x - (this.direction * i * 10),
          this.y - camera.y,
          this.width,
          this.height
        );
      }
    } else if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
      playerColor = 'rgba(78, 158, 255, 0.5)';
    }

    ctx.fillStyle = playerColor;
    ctx.fillRect(
      this.x - camera.x,
      this.y - camera.y,
      this.width,
      this.height
    );

    // Draw dash cooldown indicator
    if (!this.canDash) {
      const cooldownPercent = 1 - (this.dashCooldown / this.dashCooldownMax);
      ctx.fillStyle = '#333';
      ctx.fillRect(
        this.x - camera.x,
        this.y - 15 - camera.y,
        this.width,
        3
      );
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(
        this.x - camera.x,
        this.y - 15 - camera.y,
        this.width * cooldownPercent,
        3
      );
    }

    // Draw attack box if attacking with animation
    if (this.isAttacking) {
      const attackProgress = 1 - (this.attackDuration / this.attackDurationMax);
      const attackScale = Math.sin(attackProgress * Math.PI) * 1.2 + 0.8; // Scale animation
      const alpha = Math.max(0.3, 1 - attackProgress); // Fade out
      
      ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.7})`;
      const attackX = this.direction === 1 ? this.x + this.width : this.x - this.attackBox.width * attackScale;
      const attackY = this.y + this.height / 2 - (this.attackBox.height * attackScale) / 2;
      
      ctx.fillRect(
        attackX - camera.x,
        attackY - camera.y,
        this.attackBox.width * attackScale,
        this.attackBox.height * attackScale
      );
      
      // Add slash effect
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (this.direction === 1) {
        ctx.moveTo(this.x + this.width - camera.x, this.y + this.height * 0.3 - camera.y);
        ctx.lineTo(this.x + this.width + this.attackBox.width * attackScale - camera.x, 
                   this.y + this.height * 0.7 - camera.y);
      } else {
        ctx.moveTo(this.x - camera.x, this.y + this.height * 0.3 - camera.y);
        ctx.lineTo(this.x - this.attackBox.width * attackScale - camera.x, 
                   this.y + this.height * 0.7 - camera.y);
      }
      ctx.stroke();
    }

    // Draw bow cooldown indicator
    if (this.bowCooldown > 0) {
      const cooldownPercent = 1 - (this.bowCooldown / this.bowCooldownMax);
      ctx.fillStyle = '#333';
      ctx.fillRect(
        this.x - camera.x,
        this.y - 20 - camera.y,
        this.width,
        3
      );
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(
        this.x - camera.x,
        this.y - 20 - camera.y,
        this.width * cooldownPercent,
        3
      );
    }
  }
}

// Enemy class
class Enemy {
  constructor(x, y, type = 'basic') {
    this.x = x;
    this.y = y;
    this.width = sprites.enemy.width;
    this.height = sprites.enemy.height;
    this.velocityX = 0;
    this.velocityY = 0;
    this.speed = 2;
    this.direction = 1;
    this.averageAttackCool = 30;
    this.health = 20;
    this.attack = 30;
    this.xpValue = 20;
    this.type = type;
    this.patrolDistance = 100;
    this.startX = x;
    this.attackCooldown = 0;

    // Adjust stats based on type
    if (type === 'strong') {
      this.health = 40;
      this.attack = 40;
      this.xpValue = 40;
      this.speed = 1.5;
      this.averageAttackCool = 40;
    } else if (type === 'fast') {
      this.health = 15;
      this.attack = 20;
      this.xpValue = 30;
      this.averageAttackCool = 20;
      this.speed = 4;
    } else if (type === 'boss') {
      this.health = 200;
      this.attack = 50;
      this.xpValue = 150;
      this.averageAttackCool = 35;
      this.speed = 2;
    }
  }

  update() {
    // Basic AI - patrol back and forth
    if (this.type === 'basic' || this.type === 'strong' || this.type === 'fast') {
      if (this.x > this.startX + this.patrolDistance) {
        this.direction = -1;
      } else if (this.x < this.startX - this.patrolDistance) {
        this.direction = 1;
      }

      this.velocityX = this.speed * this.direction;
    }

    // Apply gravity
    this.velocityY += gravity;

    // Update position
    this.x += this.velocityX;
    this.y += this.velocityY;

    // Check platform collisions
    this.checkPlatformCollisions();

    // Check player collision for damage
    this.checkPlayerCollision();

    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }
  }

  checkPlatformCollisions() {
    for (const platform of platforms) {
      // Check if enemy is colliding with platform
      if (
        this.x + this.width > platform.x &&
        this.x < platform.x + platform.width &&
        this.y + this.height > platform.y &&
        this.y < platform.y + platform.height
      ) {
        // Collision from top
        if (this.y + this.height - this.velocityY <= platform.y) {
          this.y = platform.y - this.height;
          this.velocityY = 0;
        }
        // Collision from bottom
        else if (this.y - this.velocityY >= platform.y + platform.height) {
          this.y = platform.y + platform.height;
          this.velocityY = 0;
        }
        // Collision from left or right
        else if (this.velocityX !== 0) {
          this.direction *= -1;
          this.x += this.direction * 5;
        }
      }
    }
  }

  checkPlayerCollision() {
    if (this.attackCooldown <= 0 && player && !dialogActive) {
      // Check if enemy collides with player
      if (
        this.x + this.width > player.x &&
        this.x < player.x + player.width &&
        this.y + this.height > player.y &&
        this.y < player.y + player.height
      ) {
        player.takeDamage(this.attack);
        this.attackCooldown = this.averageAttackCool; // 30 frames cooldown
      }
    }
  }

  takeDamage(damage) {
    this.health -= damage;

    // Knockback
    this.x += (player.direction * 10);
  }

  draw() {
    ctx.fillStyle = sprites.enemy.color;
    ctx.fillRect(
      this.x - camera.x,
      this.y - camera.y,
      this.width,
      this.height
    );

    // Draw health bar
    const healthBarWidth = this.width;
    const healthBarHeight = 5;
    const healthPercent = Math.max(0, this.health / (this.type === 'strong' ? 40 : 20));

    ctx.fillStyle = '#333';
    ctx.fillRect(
      this.x - camera.x,
      this.y - 10 - camera.y,
      healthBarWidth,
      healthBarHeight
    );

    ctx.fillStyle = '#ff3e3e';
    ctx.fillRect(
      this.x - camera.x,
      this.y - 10 - camera.y,
      healthBarWidth * healthPercent,
      healthBarHeight
    );
  }
}

// NPC class
class NPC {
  constructor(x, y, name, dialog) {
    this.x = x;
    this.y = y;
    this.width = sprites.npc.width;
    this.height = sprites.npc.height;
    this.name = name;
    this.dialog = dialog;
  }

  draw() {
    ctx.fillStyle = sprites.npc.color;
    ctx.fillRect(
      this.x - camera.x,
      this.y - camera.y,
      this.width,
      this.height
    );

    // Draw name above NPC
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.name,
      this.x + this.width / 2 - camera.x,
      this.y - 10 - camera.y
    );

    // Draw interaction hint
    const distance = Math.sqrt(
      Math.pow(player.x + player.width / 2 - (this.x + this.width / 2), 2) +
      Math.pow(player.y + player.height / 2 - (this.y + this.height / 2), 2)
    );

    if (distance < 80) {
      ctx.fillStyle = '#ffcc00';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Press E to talk',
        this.x + this.width / 2 - camera.x,
        this.y - 25 - camera.y
      );
    }
  }
}

// Item class
class Item {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.width = sprites.item.width;
    this.height = sprites.item.height;
    this.type = type; // 'health', 'attack', 'defense'
  }

  draw() {
    ctx.fillStyle = sprites.item.color;
    ctx.beginPath();
    ctx.arc(
      this.x + this.width / 2 - camera.x,
      this.y + this.height / 2 - camera.y,
      this.width / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw icon based on type
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let icon = '';
    if (this.type === 'health') icon = '❤️';
    else if (this.type === 'attack') icon = '⚔️';
    else if (this.type === 'defense') icon = '🛡️';
    else if (this.type === '1up') icon = '🟢';
    else if (this.type === 'speed') icon = '💨';
    else if (this.type === 'attackspeed') icon = '⚡';

    ctx.fillText(
      icon,
      this.x + this.width / 2 - camera.x,
      this.y + this.height / 2 - camera.y
    );
  }
}

// Arrow class
class Arrow {
  constructor(x, y, direction, speed, damage) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.speed = speed;
    this.damage = damage;
    this.width = 20;
    this.height = 4;
    this.velocityX = this.speed * this.direction;
    this.velocityY = 0;
    this.gravity = 0.1;
    this.lifeTime = 300; // 5 seconds at 60fps
  }

  update() {
    // Apply gravity
    this.velocityY += this.gravity;
    
    // Update position
    this.x += this.velocityX;
    this.y += this.velocityY;

    // Decrease lifetime
    this.lifeTime--;

    // Check platform collisions
    this.checkPlatformCollisions();

    // Check enemy collisions
    this.checkEnemyCollisions();

    return this.lifeTime > 0;
  }

  checkPlatformCollisions() {
    for (const platform of platforms) {
      if (
        this.x + this.width > platform.x &&
        this.x < platform.x + platform.width &&
        this.y + this.height > platform.y &&
        this.y < platform.y + platform.height
      ) {
        // Arrow hits platform, remove it
        this.lifeTime = 0;
        break;
      }
    }
  }

  checkEnemyCollisions() {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      
      if (
        this.x + this.width > enemy.x &&
        this.x < enemy.x + enemy.width &&
        this.y + this.height > enemy.y &&
        this.y < enemy.y + enemy.height
      ) {
        // Arrow hits enemy
        enemy.takeDamage(this.damage);
        if (enemy.health <= 0) {
          player.gainXP(enemy.xpValue);
          enemies.splice(i, 1);
        }
        
        // Remove arrow
        this.lifeTime = 0;
        break;
      }
    }
  }

  draw() {
    ctx.fillStyle = '#8B4513'; // Brown color for arrow shaft
    ctx.fillRect(
      this.x - camera.x,
      this.y - camera.y,
      this.width * 0.8,
      this.height
    );

    // Arrow head (triangle)
    ctx.fillStyle = '#C0C0C0'; // Silver color for arrow head
    ctx.beginPath();
    const headX = this.direction === 1 ? this.x + this.width * 0.8 : this.x;
    const headY = this.y + this.height / 2;
    
    if (this.direction === 1) {
      ctx.moveTo(headX - camera.x, headY - camera.y);
      ctx.lineTo(headX + this.width * 0.2 - camera.x, headY - this.height / 2 - camera.y);
      ctx.lineTo(headX + this.width * 0.2 - camera.x, headY + this.height / 2 - camera.y);
    } else {
      ctx.moveTo(headX - camera.x, headY - camera.y);
      ctx.lineTo(headX - this.width * 0.2 - camera.x, headY - this.height / 2 - camera.y);
      ctx.lineTo(headX - this.width * 0.2 - camera.x, headY + this.height / 2 - camera.y);
    }
    ctx.closePath();
    ctx.fill();

    // Fletching (feathers)
    ctx.fillStyle = '#FF0000'; // Red feathers
    const fletchX = this.direction === 1 ? this.x : this.x + this.width * 0.8;
    ctx.fillRect(
      fletchX - camera.x,
      this.y - 1 - camera.y,
      this.width * 0.2,
      this.height + 2
    );
  }
}

// Portal class
class Portal {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = sprites.portal.width;
    this.height = sprites.portal.height;
    this.animation = 0;
  }

  update() {
    this.animation += 0.05;
  }

  draw() {
    // Draw portal with pulsing effect
    const pulseSize = Math.sin(this.animation) * 5;

    ctx.fillStyle = sprites.portal.color;
    ctx.beginPath();
    ctx.ellipse(
      this.x + this.width / 2 - camera.x,
      this.y + this.height / 2 - camera.y,
      this.width / 2 + pulseSize,
      this.height / 2 + pulseSize,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Inner portal
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(
      this.x + this.width / 2 - camera.x,
      this.y + this.height / 2 - camera.y,
      (this.width / 4) + pulseSize / 2,
      (this.height / 4) + pulseSize / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

// Level definition
function defineLevel(levelNumber) {
  const level = {
    platforms: [],
    enemies: [],
    npcs: [],
    items: [],
    portals: [],
    playerStart: { x: 50, y: 300 },
    width: 2000
  };

  // Define level based on level number
  if (levelNumber === 1) {
    // Ground
    level.platforms.push({ x: 0, y: 400, width: 2000, height: 50 });

    // Platforms
    level.platforms.push({ x: 200, y: 300, width: 100, height: 20 });
    level.platforms.push({ x: 350, y: 250, width: 100, height: 20 });
    level.platforms.push({ x: 500, y: 200, width: 100, height: 20 });
    level.platforms.push({ x: 700, y: 300, width: 200, height: 20 });
    level.platforms.push({ x: 1000, y: 350, width: 100, height: 20 });
    level.platforms.push({ x: 1200, y: 300, width: 100, height: 20 });
    level.platforms.push({ x: 1400, y: 250, width: 100, height: 20 });
    level.platforms.push({ x: 1600, y: 300, width: 200, height: 20 });

    // Enemies
    level.enemies.push({ x: 300, y: 350, type: 'basic' });
    level.enemies.push({ x: 800, y: 250, type: 'basic' });
    level.enemies.push({ x: 1300, y: 250, type: 'fast' });

    // NPCs
    level.npcs.push({
      x: 100,
      y: 350,
      name: 'Guide',
      dialog: [
        'Welcome to Adventure Quest!',
        'Use WASD or arrow keys to move, SPACE to jump, and J to attack.',
        'Defeat enemies to gain XP and level up.',
        'Good luck on your journey!'
      ]
    });

    // Items
    level.items.push({ x: 400, y: 220, type: 'health' });
    level.items.push({ x: 900, y: 270, type: 'attack' });
    level.items.push({ x: 1500, y: 270, type: '1up' });

    // Portal to next level
    level.portals.push({ x: 1700, y: 240 });
  } else if (levelNumber === 2) {
    // Ground with gaps
    level.platforms.push({ x: 0, y: 400, width: 300, height: 50 });
    level.platforms.push({ x: 400, y: 400, width: 300, height: 50 });
    level.platforms.push({ x: 800, y: 400, width: 300, height: 50 });
    level.platforms.push({ x: 1200, y: 400, width: 300, height: 50 });
    level.platforms.push({ x: 1600, y: 400, width: 400, height: 50 });

    // Platforms
    level.platforms.push({ x: 150, y: 300, width: 100, height: 20 });
    level.platforms.push({ x: 350, y: 250, width: 100, height: 20 });
    level.platforms.push({ x: 550, y: 200, width: 100, height: 20 });
    level.platforms.push({ x: 750, y: 250, width: 100, height: 20 });
    level.platforms.push({ x: 950, y: 300, width: 100, height: 20 });
    level.platforms.push({ x: 1150, y: 250, width: 100, height: 20 });
    level.platforms.push({ x: 1350, y: 200, width: 100, height: 20 });
    level.platforms.push({ x: 1550, y: 250, width: 100, height: 20 });

    // Enemies
    level.enemies.push({ x: 200, y: 350, type: 'basic' });
    level.enemies.push({ x: 500, y: 350, type: 'fast' });
    level.enemies.push({ x: 900, y: 350, type: 'basic' });
    level.enemies.push({ x: 1300, y: 350, type: 'strong' });
    level.enemies.push({ x: 1700, y: 350, type: 'fast' });

    // NPCs
    level.npcs.push({
      x: 600,
      y: 150,
      name: 'Wizard',
      dialog: [
        'Ah, you made it to the second level!',
        'Be careful, there are stronger enemies here.',
        'The gaps in the ground can be deadly.',
        'Find the portal at the end to complete your quest!'
      ]
    });

    // Items
    level.items.push({ x: 250, y: 270, type: 'health' });
    level.items.push({ x: 650, y: 170, type: 'attack' });
    level.items.push({ x: 1050, y: 270, type: 'defense' });
    level.items.push({ x: 1450, y: 170, type: 'health' });
    level.items.push({ x: 800, y: 170, type: '1up' });

    // Portal to next level
    level.portals.push({ x: 1800, y: 340 });
  } else if (levelNumber === 3) {
    // Ground
    level.platforms.push({ x: 0, y: 400, width: 2000, height: 50 });

    // Complex platform layout
    level.platforms.push({ x: 100, y: 350, width: 100, height: 20 });
    level.platforms.push({ x: 250, y: 300, width: 100, height: 20 });
    level.platforms.push({ x: 400, y: 250, width: 100, height: 20 });
    level.platforms.push({ x: 550, y: 200, width: 100, height: 20 });
    level.platforms.push({ x: 700, y: 150, width: 100, height: 20 });
    level.platforms.push({ x: 850, y: 200, width: 100, height: 20 });
    level.platforms.push({ x: 1000, y: 250, width: 100, height: 20 });
    level.platforms.push({ x: 1150, y: 300, width: 100, height: 20 });
    level.platforms.push({ x: 1300, y: 350, width: 100, height: 20 });

    // Vertical platforms (walls)
    level.platforms.push({ x: 500, y: 300, width: 20, height: 100 });
    level.platforms.push({ x: 800, y: 200, width: 20, height: 200 });
    level.platforms.push({ x: 1100, y: 300, width: 20, height: 100 });

    // Enemies
    level.enemies.push({ x: 200, y: 300, type: 'fast' });
    level.enemies.push({ x: 450, y: 200, type: 'strong' });
    level.enemies.push({ x: 750, y: 100, type: 'basic' });
    level.enemies.push({ x: 900, y: 150, type: 'fast' });
    level.enemies.push({ x: 1050, y: 200, type: 'strong' });
    level.enemies.push({ x: 1200, y: 250, type: 'basic' });
    level.enemies.push({ x: 1350, y: 300, type: 'fast' });
    level.enemies.push({ x: 1500, y: 350, type: 'strong' });

    // NPCs
    level.npcs.push({
      x: 50,
      y: 350,
      name: 'Elder',
      dialog: [
        'You have reached the final level!',
        'This is the most challenging part of your journey.',
        'Defeat all enemies and find the final portal.',
        'May your skills be sharp and your courage unwavering!'
      ]
    });

    // Items
    level.items.push({ x: 300, y: 270, type: 'health' });
    level.items.push({ x: 600, y: 170, type: 'attack' });
    level.items.push({ x: 900, y: 170, type: 'defense' });
    level.items.push({ x: 1200, y: 270, type: 'health' });
    level.items.push({ x: 1400, y: 320, type: 'attack' });
    level.items.push({ x: 750, y: 120, type: '1up' });

    // Final portal
    level.portals.push({ x: 1800, y: 340 });
  }

  return level;
}

// Initialize level
function initLevel(levelNumber) {
  const levelData = defineLevel(levelNumber);

  // Clear existing objects
  platforms = [];
  enemies = [];
  npcs = [];
  items = [];
  portals = [];
  arrows = [];

  // Create player (preserve stats when moving between levels, reset only on game restart)
  const currentStats = player ? {
    lives: player.lives,
    level: player.level,
    xp: player.xp,
    xpToNextLevel: player.xpToNextLevel,
    attack: player.attack,
    defense: player.defense,
    health: player.health,
    maxHealth: player.maxHealth,
    speed: player.speed,
    averageAttackSpeed: player.averageAttackSpeed
  } : null;
  
  player = new Player(levelData.playerStart.x, levelData.playerStart.y);
  
  // Preserve all stats when moving between levels (but not when restarting game)
  if (currentStats && levelNumber !== 1) {
    player.lives = currentStats.lives;
    player.level = currentStats.level;
    player.xp = currentStats.xp;
    player.xpToNextLevel = currentStats.xpToNextLevel;
    player.attack = currentStats.attack;
    player.defense = currentStats.defense;
    player.health = currentStats.health;
    player.maxHealth = currentStats.maxHealth;
    player.speed = currentStats.speed;
    player.averageAttackSpeed = currentStats.averageAttackSpeed;
  }

  // Create platforms
  for (const platformData of levelData.platforms) {
    platforms.push(platformData);
  }

  // Create enemies
  for (const enemyData of levelData.enemies) {
    enemies.push(new Enemy(enemyData.x, enemyData.y, enemyData.type));
  }

  // Create NPCs
  for (const npcData of levelData.npcs) {
    npcs.push(new NPC(npcData.x, npcData.y, npcData.name, npcData.dialog));
  }

  // Create items
  for (const itemData of levelData.items) {
    items.push(new Item(itemData.x, itemData.y, itemData.type));
  }

  // Create portals
  for (const portalData of levelData.portals) {
    portals.push(new Portal(portalData.x, portalData.y));
  }

  // Set level width
  levelWidth = levelData.width;

  // Update UI
  currentLevelElement.textContent = currentLevel;
}

// Game loop
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameRunning && !dialogActive) {
    // Update player
    player.update();

    // Update camera to follow player
    camera.x = player.x - canvas.width / 2 + player.width / 2;
    camera.y = player.y - canvas.height / 2 + player.height / 2;

    // Keep camera within level bounds
    camera.x = Math.max(0, Math.min(camera.x, levelWidth - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, 450 - canvas.height));

    // Update enemies
    for (const enemy of enemies) {
      enemy.update();
    }

    // Update portals
    for (const portal of portals) {
      portal.update();
    }

    // Update arrows
    for (let i = arrows.length - 1; i >= 0; i--) {
      const arrow = arrows[i];
      if (!arrow.update()) {
        arrows.splice(i, 1);
      }
    }
  }

  // Draw background
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw platforms
  for (const platform of platforms) {
    ctx.fillStyle = sprites.platform.color;
    ctx.fillRect(
      platform.x - camera.x,
      platform.y - camera.y,
      platform.width,
      platform.height
    );
  }

  // Draw items
  for (const item of items) {
    item.draw();
  }

  // Draw portals
  for (const portal of portals) {
    portal.draw();
  }

  // Draw arrows
  for (const arrow of arrows) {
    arrow.draw();
  }

  // Draw NPCs
  for (const npc of npcs) {
    npc.draw();
  }

  // Draw enemies
  for (const enemy of enemies) {
    enemy.draw();
  }

  // Draw player
  player.draw();

  // Request next frame
  if (gameRunning) {
    requestAnimationFrame(gameLoop);
  }
}

// Start game
function startGame() {
  gameRunning = true;
  initLevel(currentLevel);
  requestAnimationFrame(gameLoop);
}

// Complete level
function completeLevel() {
  gameRunning = false;

  // Calculate XP gained
  const xpGained = currentLevel * 100;
  xpGainedElement.textContent = xpGained;
  player.gainXP(xpGained);

  // Show level complete screen
  levelCompleteScreen.style.display = 'flex';

  // If final level, show game over screen instead
  if (currentLevel === 3) {
    levelCompleteScreen.style.display = 'none';
    gameOverScreen.querySelector('.subtitle').textContent = 'Congratulations! You completed the game!';
    gameOverScreen.style.display = 'flex';
  }
}

// Game over
function gameOver() {
  gameRunning = false;
  gameOverScreen.style.display = 'flex';
}

// Dialog system
function startDialog(name, text) {
  dialogActive = true;
  currentDialog = text;
  dialogIndex = 0;

  dialogName.textContent = name;
  dialogText.textContent = currentDialog[dialogIndex];
  dialogBox.style.display = 'block';

  // Add event listener for continuing dialog
  document.addEventListener('keydown', continueDialog);
}

function continueDialog(e) {
  if (e.key.toLowerCase() === 'e') {
    dialogIndex++;

    if (dialogIndex < currentDialog.length) {
      dialogText.textContent = currentDialog[dialogIndex];
    } else {
      endDialog();
    }
  }
}

function endDialog() {
  dialogActive = false;
  dialogBox.style.display = 'none';
  document.removeEventListener('keydown', continueDialog);
}

// Event listeners
startButton.addEventListener('click', () => {
  startScreen.style.display = 'none';
  startGame();
});

nextLevelButton.addEventListener('click', () => {
  levelCompleteScreen.style.display = 'none';
  currentLevel++;
  initLevel(currentLevel);
  gameRunning = true;
  requestAnimationFrame(gameLoop);
});

restartButton.addEventListener('click', () => {
  gameOverScreen.style.display = 'none';
  currentLevel = 1;
  player = null; // Reset player to ensure fresh start
  initLevel(currentLevel);
  gameRunning = true;
  requestAnimationFrame(gameLoop);
});

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

// Mouse event listeners for attacking
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) { // Left mouse button
    keys['mouseclick'] = true;
  } else if (e.button === 2) { // Right mouse button
    keys['rightclick'] = true;
  }
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault(); // Prevent right-click menu
});

// Attack range configuration
attackRangeSlider.addEventListener('input', (e) => {
  const newRange = parseInt(e.target.value);
  attackRangeValue.textContent = newRange;
  
  if (player) {
    player.attackBox.width = newRange;
    player.attackBox.height = Math.floor(newRange * 0.6); // Keep proportional
  }
});

// Resize canvas to fit window
function resizeCanvas() {
  const container = document.getElementById('game-container');
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Maintain aspect ratio
  const aspectRatio = 16 / 9;
  let width = containerWidth;
  let height = width / aspectRatio;

  if (height > containerHeight) {
    height = containerHeight;
    width = height * aspectRatio;
  }

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();