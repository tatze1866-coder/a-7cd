const MOB_TYPES = require('./MobTypes');

let nextMobId = 1;

class Mob {
  constructor(type, x, y, mapId) {
    this.id = nextMobId++;
    this.type = type;
    this.def = MOB_TYPES[type];
    this.spawnX = x;
    this.spawnY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.mapId = mapId;
    this.maxHp = this.def.hp;
    this.hp = this.def.hp;
    this.alive = true;
    this.respawnAt = 0;
    this.targetId = null;
    this.direction = Math.random() < 0.5 ? -1 : 1;
    this.wanderTimer = 0;
    this.hitFlashUntil = 0;
  }

  // Einfache KI: ohne Ziel -> wandert zufällig; mit Aggro-Range -> verfolgt nächsten Spieler
  updateAI(players, dtMs) {
    if (!this.alive) return;
    const def = this.def;

    let target = null;
    if (def.chase) {
      let closestDist = def.aggroRange;
      for (const p of players) {
        if (p.mapId !== this.mapId || !p.alive) continue;
        const d = Math.abs(p.x - this.x);
        if (d < closestDist) {
          closestDist = d;
          target = p;
        }
      }
    }

    if (target) {
      this.direction = target.x > this.x ? 1 : -1;
      this.vx = this.direction * def.moveSpeed * 2;
    } else {
      this.wanderTimer -= dtMs;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 1500 + Math.random() * 2000;
        this.direction = Math.random() < 0.5 ? -1 : 1;
        if (Math.random() < 0.3) this.direction = 0; // kurz stehen bleiben
      }
      this.vx = this.direction * def.moveSpeed;
    }
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    this.hitFlashUntil = Date.now() + 150;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.respawnAt = Date.now() + def_respawn(this.def);
      return true; // gestorben
    }
    return false;
  }

  tryRespawn() {
    if (!this.alive && Date.now() >= this.respawnAt) {
      this.alive = true;
      this.hp = this.maxHp;
      this.x = this.spawnX;
      this.y = this.spawnY;
      this.vx = 0;
      this.vy = 0;
    }
  }

  publicState() {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHp: this.maxHp,
      alive: this.alive,
      direction: this.direction,
      hitFlash: Date.now() < this.hitFlashUntil
    };
  }
}

function def_respawn(def) {
  return def.respawnMs;
}

module.exports = Mob;
