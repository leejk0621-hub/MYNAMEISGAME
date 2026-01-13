/**
 * gameEngine.js (V4: Final Ultimate)
 * - Object Pooling (No GC Lag)
 * - Optimized Rendering
 * - Juiciness (Shake, Flash, Scale)
 */

// --- OPTIMIZED PARTICLE SYSTEM (OBJECT POOLING) ---
class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.color = "#FFF";
    this.size = 0;
  }

  spawn(x, y, color) {
    this.active = true;
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.color = color;
    this.size = Math.random() * 6 + 4;
  }

  update() {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2; // Gravity
    this.life -= 0.03;
    this.size *= 0.96;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

class GameEngine {
  constructor() {
    this.ctx = null;
    this.canvas = null;

    // Game State
    this.state = "READY";
    this.score = 0;
    this.life = 3;
    this.level = 1;
    this.combo = 0;
    this.maxCombo = 0;

    // Entities
    this.items = [];
    this.laneCount = 3;

    // Player
    this.playerLane = 1;
    this.playerX = 0;
    this.targetX = 0;

    // Juiciness
    this.shakeTimer = 0;
    this.flashTimer = 0;

    // Performance Settings
    this.baseSpeed = 6.0;
    this.spawnTimer = 0;
    this.spawnInterval = 45;

    // Particle Pool (Pre-allocate 100 particles)
    this.particles = [];
    for (let i = 0; i < 100; i++) this.particles.push(new Particle());

    // Callbacks
    this.onScoreChange = null;
    this.onGameEnd = null;
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.playerX = canvas.width / 2;
    this.targetX = canvas.width / 2;
  }

  start() {
    this.state = "PLAYING";
    this.score = 0;
    this.life = 3;
    this.level = 1;
    this.combo = 0;
    this.items = [];
    this.baseSpeed = 6.0;

    // Reset Particles
    this.particles.forEach(p => p.active = false);

    console.log("Game V4 Started");
    this.notifyUI();
  }

  gameOver() {
    this.state = "GAME_OVER";
    if (this.onGameEnd) this.onGameEnd(this.score, this.level);
  }

  setPose(poseLabel) {
    if (this.state !== "PLAYING") return;
    const width = this.canvas.width;
    const laneWidth = width / 3;

    if (poseLabel === "Left") this.targetX = laneWidth * 0.5;
    else if (poseLabel === "Center") this.targetX = laneWidth * 1.5;
    else if (poseLabel === "Right") this.targetX = laneWidth * 2.5;
  }

  spawnExplosion(x, y, color) {
    let count = 0;
    for (const p of this.particles) {
      if (!p.active) {
        p.spawn(x, y, color);
        count++;
        if (count >= 15) break; // Spawn 15 particles
      }
    }
  }

  update() {
    if (this.state !== "PLAYING") return;

    // 1. Player Movement (Snappy)
    this.playerX += (this.targetX - this.playerX) * 0.4;

    // 2. Spawn System
    this.spawnTimer++;
    if (this.spawnTimer > this.spawnInterval) {
      this.spawnItem();
      this.spawnTimer = 0;
    }

    // 3. Logic Updates
    const playerY = this.canvas.height * 0.85;
    const hitDist = 50;

    // Update Items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.speed;
      item.angle += 0.05;

      // Collision
      if (Math.abs(item.y - playerY) < hitDist && Math.abs(item.x - this.playerX) < hitDist) {
        this.handleCollision(item);
        this.items.splice(i, 1);
        continue;
      }

      if (item.y > this.canvas.height) {
        this.items.splice(i, 1);
        this.resetCombo();
      }
    }

    // Update Particles (No allocation)
    for (const p of this.particles) {
      p.update();
    }

    // Juice Timers
    if (this.shakeTimer > 0) this.shakeTimer--;
    if (this.flashTimer > 0) this.flashTimer--;
  }

  spawnItem() {
    const lane = Math.floor(Math.random() * 3);
    const laneWidth = this.canvas.width / 3;
    const x = (lane * laneWidth) + (laneWidth / 2);

    // Expanded Item List
    const types = [
      { id: 'apple', score: 100, color: '#FF4444', icon: '🍎' }, // Red
      { id: 'grape', score: 200, color: '#AA44FF', icon: '🍇' }, // Purple
      { id: 'orange', score: 300, color: '#FFAA00', icon: '🍊' }, // Orange
      { id: 'diamond', score: 1000, color: '#00FFFF', icon: '💎' }, // Cyan
      { id: 'bomb', score: 0, color: '#666666', icon: '💣' }   // Gray
    ];

    const r = Math.random();
    let type = types[0];

    // Dynamic Difficulty Probabilities
    if (r < 0.2) type = types[4]; // 20% Bomb
    else if (r < 0.3) type = types[3]; // 10% Diamond
    else if (r < 0.5) type = types[2]; // 20% Orange
    else if (r < 0.7) type = types[1]; // 20% Grape

    this.items.push({
      x: x,
      y: -60,
      type: type.id,
      score: type.score,
      icon: type.icon,
      color: type.color,
      speed: this.baseSpeed + Math.random() * 2,
      angle: 0
    });
  }

  handleCollision(item) {
    if (item.type === 'bomb') {
      this.life--;
      this.resetCombo();
      this.shakeTimer = 20; // 20 frames of shake
      this.spawnExplosion(item.x, item.y, "#555");
    } else {
      this.combo++;
      let multiplier = 1 + Math.floor(this.combo / 10); // x1, x2, x3...
      this.score += item.score * multiplier;

      this.spawnExplosion(item.x, item.y, item.color);
      if (item.type === 'diamond') this.flashTimer = 5; // Flash screen

      // Difficulty Ramping
      if (this.score % 1000 < 200) this.baseSpeed += 0.05;
    }

    this.notifyUI();
    if (this.life <= 0) this.gameOver();
  }

  resetCombo() {
    if (this.combo > 5) {
      // Combo Break sound effect visual?
    }
    this.combo = 0;
    this.notifyUI();
  }

  notifyUI() {
    if (this.onScoreChange) this.onScoreChange(this.score, this.life, this.level, this.combo);
  }

  draw() {
    if (!this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Clear & Background
    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, w, h);

    // Screen Shake
    this.ctx.save();
    if (this.shakeTimer > 0) {
      const dx = (Math.random() - 0.5) * 10;
      const dy = (Math.random() - 0.5) * 10;
      this.ctx.translate(dx, dy);
    }

    // 2. Lanes
    this.ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      this.ctx.moveTo(w / 3 * i, 0);
      this.ctx.lineTo(w / 3 * i, h);
      this.ctx.stroke();
    }

    // Active Lane Highlight
    // const laneIdx = Math.floor(this.playerX / (w/3));
    // this.ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    // this.ctx.fillRect(laneIdx * (w/3), 0, w/3, h);

    // 3. Particles (Behind Items)
    for (const p of this.particles) p.draw(this.ctx);

    // 4. Items
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.font = "40px sans-serif";

    for (const item of this.items) {
      this.ctx.save();
      this.ctx.translate(item.x, item.y);
      this.ctx.rotate(item.angle);
      this.ctx.fillText(item.icon, 0, 0);
      this.ctx.restore();
    }

    // 5. Player
    const playerY = h * 0.85;
    this.ctx.fillStyle = this.combo > 10 ? "#FF00FF" : "#00FFFF"; // Color change on combo
    this.ctx.beginPath();
    // Basket Shape
    this.ctx.moveTo(this.playerX - 30, playerY - 20);
    this.ctx.lineTo(this.playerX + 30, playerY - 20);
    this.ctx.lineTo(this.playerX + 20, playerY + 20);
    this.ctx.lineTo(this.playerX - 20, playerY + 20);
    this.ctx.closePath();
    this.ctx.fill();

    // 6. Flash Effect
    if (this.flashTimer > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashTimer * 0.1})`;
      this.ctx.fillRect(0, 0, w, h);
    }

    this.ctx.restore(); // Restore Shake

    // 7. Game Over
    if (this.state === "GAME_OVER") {
      this.ctx.fillStyle = "rgba(0,0,0,0.8)";
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.fillStyle = "white";
      this.ctx.font = "bold 40px sans-serif";
      this.ctx.fillText("GAME OVER", w / 2, h / 2);
    }
  }
}

window.GameEngine = GameEngine;
