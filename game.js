// NEON DEFENDER: SPACE INVASION
// Complete Arcade Game Engine

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Fixed logical resolution for sharp graphics and consistent physics
const GAME_WIDTH = 600;
const GAME_HEIGHT = 800;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Game State
const STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
};

let currentState = STATE.MENU;
let score = 0;
let highScore = parseInt(localStorage.getItem('neon_defender_highscore')) || 0;
let wave = 1;
let enemiesDestroyed = 0;
let screenShake = 0;

// Update UI High Score
document.getElementById('high-score').textContent = highScore;
document.getElementById('menu-high-score').textContent = highScore;

// Controls & Input Management
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
    Space: false,
    KeyB: false,
    KeyX: false
};

const mouse = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 100,
    isDown: false,
    isControlled: false
};

// Touch support
let touchActive = false;

// Starfield Background
class Starfield {
    constructor() {
        this.stars = [];
        this.numStars = 120;
        for (let i = 0; i < this.numStars; i++) {
            this.stars.push({
                x: Math.random() * GAME_WIDTH,
                y: Math.random() * GAME_HEIGHT,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 2 + 0.5,
                color: ['#ffffff', '#00f0ff', '#ff00aa', '#8888ff'][Math.floor(Math.random() * 4)],
                alpha: Math.random() * 0.8 + 0.2
            });
        }
    }

    update() {
        for (const star of this.stars) {
            star.y += star.speed;
            if (star.y > GAME_HEIGHT) {
                star.y = 0;
                star.x = Math.random() * GAME_WIDTH;
            }
        }
    }

    draw() {
        for (const star of this.stars) {
            ctx.save();
            ctx.globalAlpha = star.alpha;
            ctx.fillStyle = star.color;
            ctx.shadowBlur = star.size > 1.5 ? 8 : 0;
            ctx.shadowColor = star.color;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// Particle System
class Particle {
    constructor(x, y, color, speed, size, decay = 0.02) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.alpha = 1;
        this.decay = decay;

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * speed;
        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        this.size = Math.max(0, this.size - 0.05);
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Shockwave Ring Effect
class Shockwave {
    constructor(x, y, maxRadius = 150, color = '#00f0ff') {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.maxRadius = maxRadius;
        this.color = color;
        this.alpha = 1;
    }

    update() {
        this.radius += 8;
        this.alpha = 1 - (this.radius / this.maxRadius);
    }

    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.strokeStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// Floating Score Popups
class FloatingText {
    constructor(text, x, y, color = '#00f0ff') {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.alpha = 1;
        this.vy = -1.2;
    }

    update() {
        this.y += this.vy;
        this.alpha -= 0.02;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.font = 'bold 16px "Segoe UI", sans-serif';
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// Player Projectile
class Laser {
    constructor(x, y, vx = 0, vy = -12, color = '#00f0ff') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = 4;
        this.height = 16;
        this.color = color;
        this.toRemove = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y < -30 || this.y > GAME_HEIGHT + 30 || this.x < -30 || this.x > GAME_WIDTH + 30) {
            this.toRemove = true;
        }
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.roundRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height, 2);
        ctx.fill();
        ctx.restore();
    }
}

// Enemy Projectile
class EnemyBullet {
    constructor(x, y, vx, vy, color = '#ff0055') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 4;
        this.color = color;
        this.toRemove = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y < -30 || this.y > GAME_HEIGHT + 30 || this.x < -30 || this.x > GAME_WIDTH + 30) {
            this.toRemove = true;
        }
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Power-up Pickups
const POWERUP_TYPES = {
    SHIELD: { id: 'SHIELD', label: '🛡️ SHIELD', color: '#00f0ff', letter: 'S' },
    TRIPLE: { id: 'TRIPLE', label: '🔱 TRIPLE', color: '#ffaa00', letter: 'T' },
    RAPID: { id: 'RAPID', label: '⚡ RAPID', color: '#ff00aa', letter: 'R' },
    BOMB: { id: 'BOMB', label: '💣 BOMB', color: '#00ff66', letter: 'B' },
    HEAL: { id: 'HEAL', label: '❤️ HEAL', color: '#ff2255', letter: '+' }
};

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 16;
        this.vy = 1.8;
        this.wobble = Math.random() * Math.PI * 2;
        this.toRemove = false;
    }

    update() {
        this.y += this.vy;
        this.wobble += 0.05;
        this.x += Math.sin(this.wobble) * 0.8;
        if (this.y > GAME_HEIGHT + 50) this.toRemove = true;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.type.color;
        ctx.strokeStyle = this.type.color;
        ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.type.color;
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.letter, this.x, this.y);
        ctx.restore();
    }
}

// Player Ship
class Player {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = GAME_WIDTH / 2;
        this.y = GAME_HEIGHT - 120;
        this.radius = 18;
        this.speed = 6;
        this.hp = 100;
        this.maxHp = 100;
        this.bombs = 2;
        this.invulnerableTimer = 0;

        // Active Powerups
        this.activePowerups = {
            triple: 0,
            rapid: 0,
            shield: 0
        };

        this.shootCooldown = 0;
        this.baseCooldown = 15; // frames between shots
    }

    takeDamage(amount) {
        if (this.invulnerableTimer > 0) return;

        if (this.activePowerups.shield > 0) {
            this.activePowerups.shield = 0;
            updatePowerupHUD();
            window.soundController.playShieldHit();
            createExplosion(this.x, this.y, '#00f0ff', 12);
            this.invulnerableTimer = 30;
            return;
        }

        this.hp -= amount;
        screenShake = 12;
        this.invulnerableTimer = 45;
        window.soundController.playExplosion(false);
        createExplosion(this.x, this.y, '#ff0055', 18);

        updateHealthHUD(this.hp, this.maxHp);

        if (this.hp <= 0) {
            this.hp = 0;
            gameOver();
        }
    }

    useBomb() {
        if (this.bombs <= 0 || currentState !== STATE.PLAYING) return;
        this.bombs--;
        updateBombHUD();
        screenShake = 25;
        window.soundController.playBomb();

        shockwaves.push(new Shockwave(this.x, this.y, 400, '#00ffaa'));

        // Clear regular enemies & enemy bullets
        enemyBullets.length = 0;
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e.isBoss) {
                e.hp -= 350;
                createExplosion(e.x, e.y, '#ff0055', 20);
                if (e.hp <= 0) e.destroy();
            } else {
                e.destroy(true);
            }
        }
    }

    update() {
        // Controls: Keyboard
        let dx = 0;
        let dy = 0;

        if (keys.ArrowLeft || keys.KeyA) dx -= 1;
        if (keys.ArrowRight || keys.KeyD) dx += 1;
        if (keys.ArrowUp || keys.KeyW) dy -= 1;
        if (keys.ArrowDown || keys.KeyS) dy += 1;

        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        if (dx !== 0 || dy !== 0) {
            this.x += dx * this.speed;
            this.y += dy * this.speed;
            mouse.isControlled = false;
        } else if (mouse.isControlled) {
            // Smooth lerp to mouse position
            this.x += (mouse.x - this.x) * 0.15;
            this.y += (mouse.y - this.y) * 0.15;
        }

        // Clamp boundaries
        this.x = Math.max(this.radius + 5, Math.min(GAME_WIDTH - this.radius - 5, this.x));
        this.y = Math.max(this.radius + 50, Math.min(GAME_HEIGHT - this.radius - 20, this.y));

        // Engine thruster particles
        if (Math.random() < 0.8) {
            particles.push(new Particle(
                this.x + (Math.random() * 8 - 4),
                this.y + 18,
                Math.random() < 0.5 ? '#00f0ff' : '#ff0088',
                1.5,
                Math.random() * 3 + 2,
                0.04
            ));
        }

        // Handle Invulnerability Timer
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer--;
        }

        // Handle Powerup Timers
        let hudNeedsUpdate = false;
        for (const key in this.activePowerups) {
            if (this.activePowerups[key] > 0) {
                this.activePowerups[key]--;
                if (this.activePowerups[key] === 0) hudNeedsUpdate = true;
            }
        }
        if (hudNeedsUpdate) updatePowerupHUD();

        // Shooting logic
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        const wantsToShoot = keys.Space || mouse.isDown || touchActive;
        const currentCooldown = this.activePowerups.rapid > 0 ? this.baseCooldown / 2 : this.baseCooldown;

        if (wantsToShoot && this.shootCooldown <= 0) {
            this.shoot();
            this.shootCooldown = currentCooldown;
        }
    }

    shoot() {
        window.soundController.playLaser();

        if (this.activePowerups.triple > 0) {
            // Center, Left Spread, Right Spread
            lasers.push(new Laser(this.x, this.y - 15, 0, -14, '#ffaa00'));
            lasers.push(new Laser(this.x - 12, this.y - 5, -2.5, -13, '#ffaa00'));
            lasers.push(new Laser(this.x + 12, this.y - 5, 2.5, -13, '#ffaa00'));
        } else {
            // Dual laser cannons
            lasers.push(new Laser(this.x - 9, this.y - 12, 0, -14, '#00f0ff'));
            lasers.push(new Laser(this.x + 9, this.y - 12, 0, -14, '#00f0ff'));
        }
    }

    draw() {
        // Flicker when hit / invulnerable
        if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 4) % 2 === 0) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Shield Bubble
        if (this.activePowerups.shield > 0) {
            ctx.save();
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#00f0ff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
            ctx.fill();
            ctx.restore();
        }

        // Ship Body (Vector Art Neon)
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f0ff';

        // Outer Hull
        ctx.fillStyle = '#060a17';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -22); // Tip
        ctx.lineTo(18, 16);  // Right Wing
        ctx.lineTo(8, 12);   // Right Indent
        ctx.lineTo(0, 18);   // Engine Center
        ctx.lineTo(-8, 12);  // Left Indent
        ctx.lineTo(-18, 16); // Left Wing
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit Glow
        ctx.fillStyle = '#ff00aa';
        ctx.shadowColor = '#ff00aa';
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(4, 2);
        ctx.lineTo(-4, 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// Enemy Base Class
class Enemy {
    constructor(x, y, hp, scoreValue) {
        this.x = x;
        this.y = y;
        this.hp = hp;
        this.maxHp = hp;
        this.scoreValue = scoreValue;
        this.toRemove = false;
        this.isBoss = false;
    }

    takeDamage(dmg) {
        this.hp -= dmg;
        createExplosion(this.x, this.y, '#ffffff', 3, 0.08);
        if (this.hp <= 0) {
            this.destroy();
        }
    }

    destroy(silent = false) {
        this.toRemove = true;
        enemiesDestroyed++;
        addScore(this.scoreValue);

        if (!silent) {
            window.soundController.playExplosion(this.isBoss);
            createExplosion(this.x, this.y, this.explosionColor || '#ff0055', this.isBoss ? 45 : 18);
        }

        floatingTexts.push(new FloatingText(`+${this.scoreValue}`, this.x, this.y));

        // Chance to drop power-up
        const dropRate = this.isBoss ? 1.0 : 0.14;
        if (Math.random() < dropRate) {
            spawnPowerUp(this.x, this.y);
        }
    }
}

// Asteroid Hazard
class Asteroid extends Enemy {
    constructor(x, y, sizeTier = 2) {
        super(x, y, sizeTier * 2, sizeTier * 25);
        this.sizeTier = sizeTier;
        this.radius = sizeTier === 2 ? 26 : 14;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = Math.random() * 1.5 + 1.2;
        this.rotation = 0;
        this.rotSpeed = (Math.random() - 0.5) * 0.04;
        this.explosionColor = '#ff9900';
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotSpeed;
        if (this.y > GAME_HEIGHT + 50) this.toRemove = true;
    }

    destroy() {
        super.destroy();
        // Split into 2 smaller asteroids if large
        if (this.sizeTier === 2) {
            const a1 = new Asteroid(this.x - 10, this.y, 1);
            const a2 = new Asteroid(this.x + 10, this.y, 1);
            a1.vx = -1.8;
            a2.vx = 1.8;
            enemies.push(a1, a2);
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.strokeStyle = '#ff9900';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff9900';
        ctx.fillStyle = '#1a1005';
        ctx.lineWidth = 2;

        ctx.beginPath();
        const numSides = 7;
        for (let i = 0; i < numSides; i++) {
            const angle = (i / numSides) * Math.PI * 2;
            const r = this.radius * (0.8 + ((i % 3) * 0.15));
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

// Fast Scout Drone
class ScoutDrone extends Enemy {
    constructor(x, y) {
        super(x, y, 2, 60);
        this.radius = 14;
        this.speed = 3.5;
        this.angle = 0;
        this.startX = x;
        this.explosionColor = '#00ff66';
    }

    update() {
        this.y += this.speed;
        this.angle += 0.08;
        this.x = this.startX + Math.sin(this.angle) * 60;
        if (this.y > GAME_HEIGHT + 40) this.toRemove = true;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.strokeStyle = '#00ff66';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00ff66';
        ctx.fillStyle = '#05180c';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(12, -10);
        ctx.lineTo(-12, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

// Assault Fighter (Shoots back!)
class AssaultFighter extends Enemy {
    constructor(x, y) {
        super(x, y, 4, 120);
        this.radius = 18;
        this.vy = 2.2;
        this.shootTimer = Math.floor(Math.random() * 40) + 40;
        this.explosionColor = '#ff0055';
    }

    update() {
        this.y += this.vy;

        // Shoot at player
        this.shootTimer--;
        if (this.shootTimer <= 0) {
            this.shootTimer = 90;
            this.shoot();
        }

        if (this.y > GAME_HEIGHT + 40) this.toRemove = true;
    }

    shoot() {
        window.soundController.playEnemyLaser();
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const speed = 5;
        enemyBullets.push(new EnemyBullet(
            this.x,
            this.y + 10,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            '#ff0055'
        ));
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.strokeStyle = '#ff0055';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#ff0055';
        ctx.fillStyle = '#1c050d';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, 16);
        ctx.lineTo(16, -14);
        ctx.lineTo(0, -6);
        ctx.lineTo(-16, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

// Heavy Cruiser (Mini-Boss)
class HeavyCruiser extends Enemy {
    constructor(x, y) {
        super(x, y, 14, 250);
        this.radius = 26;
        this.vy = 1.0;
        this.shootTimer = 60;
        this.explosionColor = '#cc00ff';
    }

    update() {
        this.y += this.vy;
        this.shootTimer--;
        if (this.shootTimer <= 0) {
            this.shootTimer = 75;
            this.shootSpread();
        }
        if (this.y > GAME_HEIGHT + 50) this.toRemove = true;
    }

    shootSpread() {
        window.soundController.playEnemyLaser();
        [-0.4, 0, 0.4].forEach(offset => {
            enemyBullets.push(new EnemyBullet(
                this.x,
                this.y + 20,
                offset * 4,
                4.5,
                '#cc00ff'
            ));
        });
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.strokeStyle = '#cc00ff';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#cc00ff';
        ctx.fillStyle = '#17051d';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(0, 24);
        ctx.lineTo(24, 6);
        ctx.lineTo(18, -20);
        ctx.lineTo(-18, -20);
        ctx.lineTo(-24, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Mini HP indicator
        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = '#cc00ff';
        ctx.fillRect(-18, -26, 36 * hpPercent, 3);
        ctx.restore();
    }
}

// Mother Boss
class Boss extends Enemy {
    constructor(x, y, waveLevel) {
        super(x, y, 60 + waveLevel * 30, 1500);
        this.isBoss = true;
        this.radius = 48;
        this.targetY = 120;
        this.vx = 2.2;
        this.attackTimer = 50;
        this.phase = 0;
        this.explosionColor = '#ffdd00';
    }

    update() {
        // Fly down to battle position
        if (this.y < this.targetY) {
            this.y += 1.5;
        } else {
            // Patrol left-right
            this.x += this.vx;
            if (this.x > GAME_WIDTH - 80 || this.x < 80) {
                this.vx *= -1;
            }
        }

        // Attacks
        this.attackTimer--;
        if (this.attackTimer <= 0) {
            this.phase = (this.phase + 1) % 3;
            this.executeAttack();
            this.attackTimer = 60;
        }
    }

    executeAttack() {
        window.soundController.playEnemyLaser();
        if (this.phase === 0) {
            // Radial bullet burst
            const numBullets = 10;
            for (let i = 0; i < numBullets; i++) {
                const angle = (i / numBullets) * Math.PI * 2;
                enemyBullets.push(new EnemyBullet(
                    this.x,
                    this.y + 20,
                    Math.cos(angle) * 3.5,
                    Math.sin(angle) * 3.5,
                    '#ffaa00'
                ));
            }
        } else if (this.phase === 1) {
            // Targeted quad blast
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            for (let i = -1; i <= 1; i++) {
                enemyBullets.push(new EnemyBullet(
                    this.x + i * 20,
                    this.y + 20,
                    Math.cos(angle + i * 0.25) * 5,
                    Math.sin(angle + i * 0.25) * 5,
                    '#ff0055'
                ));
            }
        } else {
            // Spawn scout drone escort
            enemies.push(new ScoutDrone(this.x - 30, this.y));
            enemies.push(new ScoutDrone(this.x + 30, this.y));
        }
    }

    destroy() {
        super.destroy();
        screenShake = 30;
        shockwaves.push(new Shockwave(this.x, this.y, 500, '#ffcc00'));
        player.bombs = Math.min(3, player.bombs + 1);
        updateBombHUD();
        floatingTexts.push(new FloatingText('BOSS DEFEATED!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, '#ffdd00'));
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.strokeStyle = '#ffdd00';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffdd00';
        ctx.fillStyle = '#1c1503';
        ctx.lineWidth = 3;

        // Big Mothership Geometry
        ctx.beginPath();
        ctx.moveTo(0, 42);
        ctx.lineTo(46, 12);
        ctx.lineTo(38, -30);
        ctx.lineTo(0, -18);
        ctx.lineTo(-38, -30);
        ctx.lineTo(-46, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Pulsing Core
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.beginPath();
        ctx.arc(0, 5, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Draw Boss HP Bar on Top Screen
        ctx.save();
        const barWidth = 360;
        const barHeight = 14;
        const barX = (GAME_WIDTH - barWidth) / 2;
        const barY = 70;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
        ctx.strokeStyle = '#ffdd00';
        ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

        const hpRatio = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = 'linear-gradient(90deg, #ff0055, #ffdd00)';
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`MOTHERSHIP BOSS: ${Math.max(0, Math.ceil(this.hp))}`, GAME_WIDTH / 2, barY + 11);
        ctx.restore();
    }
}

// Global Containers
const starfield = new Starfield();
const player = new Player();
const lasers = [];
const enemyBullets = [];
const enemies = [];
const particles = [];
const powerups = [];
const shockwaves = [];
const floatingTexts = [];

// Wave & Spawning Controller
let spawnTimer = 0;
let bossSpawnedForWave = false;

function handleSpawning() {
    spawnTimer++;

    // Boss milestone: Every 1200 points per wave
    const targetBossScore = wave * 1200;
    if (score >= targetBossScore && !bossSpawnedForWave) {
        bossSpawnedForWave = true;
        enemies.push(new Boss(GAME_WIDTH / 2, -60, wave));
        floatingTexts.push(new FloatingText('WARNING: BOSS APPROACHING!', GAME_WIDTH / 2, 200, '#ff0055'));
        return;
    }

    // Normal spawn loop
    const spawnInterval = Math.max(30, 80 - wave * 6);
    if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        const spawnX = Math.random() * (GAME_WIDTH - 100) + 50;
        const rand = Math.random();

        if (rand < 0.40) {
            enemies.push(new Asteroid(spawnX, -40, 2));
        } else if (rand < 0.70) {
            enemies.push(new ScoutDrone(spawnX, -30));
        } else if (rand < 0.90) {
            enemies.push(new AssaultFighter(spawnX, -35));
        } else {
            enemies.push(new HeavyCruiser(spawnX, -45));
        }
    }

    // Wave progress
    if (enemiesDestroyed >= wave * 18 && !enemies.some(e => e.isBoss)) {
        wave++;
        bossSpawnedForWave = false;
        enemiesDestroyed = 0;
        document.getElementById('wave-display').textContent = wave;
        floatingTexts.push(new FloatingText(`WAVE ${wave} COMMENCING`, GAME_WIDTH / 2, GAME_HEIGHT / 2, '#00f0ff'));
    }
}

function spawnPowerUp(x, y) {
    const types = [
        POWERUP_TYPES.SHIELD,
        POWERUP_TYPES.TRIPLE,
        POWERUP_TYPES.RAPID,
        POWERUP_TYPES.BOMB,
        POWERUP_TYPES.HEAL
    ];
    const chosen = types[Math.floor(Math.random() * types.length)];
    powerups.push(new PowerUp(x, y, chosen));
}

function createExplosion(x, y, color, count = 15, decay = 0.02) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(
            x,
            y,
            color,
            Math.random() * 4 + 2,
            Math.random() * 4 + 2,
            decay
        ));
    }
}

// Collisions
function checkCollisions() {
    // 1. Lasers hitting Enemies
    for (let l = lasers.length - 1; l >= 0; l--) {
        const laser = lasers[l];
        for (let e = enemies.length - 1; e >= 0; e--) {
            const enemy = enemies[e];
            const dist = Math.hypot(laser.x - enemy.x, laser.y - enemy.y);
            if (dist < enemy.radius + 6) {
                laser.toRemove = true;
                enemy.takeDamage(1);
                createExplosion(laser.x, laser.y, laser.color, 4, 0.08);
                break;
            }
        }
    }

    // 2. Enemy Bullets hitting Player
    for (let b = enemyBullets.length - 1; b >= 0; b--) {
        const bullet = enemyBullets[b];
        const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y);
        if (dist < player.radius + bullet.radius) {
            bullet.toRemove = true;
            player.takeDamage(15);
        }
    }

    // 3. Enemies colliding with Player
    for (let e = enemies.length - 1; e >= 0; e--) {
        const enemy = enemies[e];
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist < player.radius + enemy.radius) {
            player.takeDamage(25);
            if (!enemy.isBoss) {
                enemy.destroy(false);
            }
        }
    }

    // 4. Powerups collected by Player
    for (let p = powerups.length - 1; p >= 0; p--) {
        const pup = powerups[p];
        const dist = Math.hypot(pup.x - player.x, pup.y - player.y);
        if (dist < player.radius + pup.radius + 10) {
            pup.toRemove = true;
            applyPowerUp(pup.type);
        }
    }
}

function applyPowerUp(type) {
    window.soundController.playPowerup();
    floatingTexts.push(new FloatingText(type.label, player.x, player.y - 30, type.color));

    const duration = 600; // ~10 seconds at 60fps
    if (type.id === 'SHIELD') {
        player.activePowerups.shield = duration;
    } else if (type.id === 'TRIPLE') {
        player.activePowerups.triple = duration;
    } else if (type.id === 'RAPID') {
        player.activePowerups.rapid = duration;
    } else if (type.id === 'BOMB') {
        player.bombs = Math.min(4, player.bombs + 1);
        updateBombHUD();
    } else if (type.id === 'HEAL') {
        player.hp = Math.min(player.maxHp, player.hp + 35);
        updateHealthHUD(player.hp, player.maxHp);
    }
    updatePowerupHUD();
}

function addScore(amount) {
    score += amount;
    document.getElementById('score-display').textContent = score;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('neon_defender_highscore', highScore);
        document.getElementById('high-score').textContent = highScore;
        document.getElementById('menu-high-score').textContent = highScore;
    }
}

// HUD Updates
function updateHealthHUD(hp, maxHp) {
    const percent = Math.max(0, (hp / maxHp) * 100);
    document.getElementById('health-bar-fill').style.width = `${percent}%`;
}

function updateBombHUD() {
    document.getElementById('bomb-count').textContent = player.bombs;
}

function updatePowerupHUD() {
    const bar = document.getElementById('powerup-bar');
    bar.innerHTML = '';

    if (player.activePowerups.shield > 0) {
        bar.innerHTML += `<div class="powerup-tag" style="border-color:#00f0ff; color:#00f0ff">🛡️ PERISAI</div>`;
    }
    if (player.activePowerups.triple > 0) {
        bar.innerHTML += `<div class="powerup-tag" style="border-color:#ffaa00; color:#ffaa00">🔱 TRIPLE SHOT</div>`;
    }
    if (player.activePowerups.rapid > 0) {
        bar.innerHTML += `<div class="powerup-tag" style="border-color:#ff00aa; color:#ff00aa">⚡ RAPID FIRE</div>`;
    }
}

// Game Flow Functions
function startGame() {
    window.soundController.init();
    window.soundController.startBgm();

    score = 0;
    wave = 1;
    enemiesDestroyed = 0;
    screenShake = 0;
    bossSpawnedForWave = false;

    lasers.length = 0;
    enemyBullets.length = 0;
    enemies.length = 0;
    particles.length = 0;
    powerups.length = 0;
    shockwaves.length = 0;
    floatingTexts.length = 0;

    player.reset();
    updateHealthHUD(player.hp, player.maxHp);
    updateBombHUD();
    updatePowerupHUD();
    document.getElementById('score-display').textContent = '0';
    document.getElementById('wave-display').textContent = '1';

    hideAllScreens();
    currentState = STATE.PLAYING;
}

function pauseGame() {
    if (currentState === STATE.PLAYING) {
        currentState = STATE.PAUSED;
        document.getElementById('pause-screen').classList.remove('hidden');
    } else if (currentState === STATE.PAUSED) {
        currentState = STATE.PLAYING;
        document.getElementById('pause-screen').classList.add('hidden');
    }
}

function gameOver() {
    currentState = STATE.GAMEOVER;
    window.soundController.playGameOver();
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-wave').textContent = wave;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function hideAllScreens() {
    document.querySelectorAll('.overlay-screen').forEach(el => el.classList.add('hidden'));
}

// Main Game Loop
function gameLoop() {
    // Screen Shake effect
    ctx.save();
    if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;
        ctx.translate(shakeX, shakeY);
        screenShake = Math.max(0, screenShake - 0.8);
    }

    // Clear Screen
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Update & Draw Starfield
    starfield.update();
    starfield.draw();

    if (currentState === STATE.PLAYING) {
        handleSpawning();
        player.update();
        checkCollisions();

        // Projectiles
        for (let i = lasers.length - 1; i >= 0; i--) {
            lasers[i].update();
            lasers[i].draw();
            if (lasers[i].toRemove) lasers.splice(i, 1);
        }

        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            enemyBullets[i].update();
            enemyBullets[i].draw();
            if (enemyBullets[i].toRemove) enemyBullets.splice(i, 1);
        }

        // Enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].update();
            enemies[i].draw();
            if (enemies[i].toRemove) enemies.splice(i, 1);
        }

        // Powerups
        for (let i = powerups.length - 1; i >= 0; i--) {
            powerups[i].update();
            powerups[i].draw();
            if (powerups[i].toRemove) powerups.splice(i, 1);
        }

        // Shockwaves
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            shockwaves[i].update();
            shockwaves[i].draw();
            if (shockwaves[i].alpha <= 0) shockwaves.splice(i, 1);
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].alpha <= 0 || particles[i].size <= 0) particles.splice(i, 1);
        }

        // Floating texts
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            floatingTexts[i].update();
            floatingTexts[i].draw();
            if (floatingTexts[i].alpha <= 0) floatingTexts.splice(i, 1);
        }

        // Player
        player.draw();
    } else if (currentState === STATE.PAUSED || currentState === STATE.GAMEOVER) {
        // Draw static scene during pause / game over
        for (const l of lasers) l.draw();
        for (const eb of enemyBullets) eb.draw();
        for (const e of enemies) e.draw();
        for (const p of powerups) p.draw();
        for (const pt of particles) pt.draw();
        player.draw();
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// Mouse / Touch coordinate helper
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
        pauseGame();
    }
    if ((e.code === 'KeyB' || e.code === 'KeyX') && currentState === STATE.PLAYING) {
        player.useBomb();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});

canvas.addEventListener('mousemove', (e) => {
    const coords = getCanvasCoordinates(e);
    mouse.x = coords.x;
    mouse.y = coords.y;
    mouse.isControlled = true;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        mouse.isDown = true;
    } else if (e.button === 2) {
        player.useBomb();
    }
});

window.addEventListener('mouseup', () => {
    mouse.isDown = false;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Touch Controls
canvas.addEventListener('touchstart', (e) => {
    touchActive = true;
    const coords = getCanvasCoordinates(e);
    mouse.x = coords.x;
    mouse.y = coords.y;
    mouse.isControlled = true;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    const coords = getCanvasCoordinates(e);
    mouse.x = coords.x;
    mouse.y = coords.y;
    mouse.isControlled = true;
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', () => {
    touchActive = false;
});

// UI Buttons
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('resume-btn').addEventListener('click', pauseGame);

document.getElementById('mute-btn').addEventListener('click', () => {
    const muted = window.soundController.toggleMute();
    document.getElementById('mute-btn').textContent = muted ? '🔇' : '🔊';
});

document.getElementById('pause-btn').addEventListener('click', pauseGame);

document.getElementById('touch-bomb-btn').addEventListener('click', () => {
    if (currentState === STATE.PLAYING) player.useBomb();
});

// Start loop
requestAnimationFrame(gameLoop);
