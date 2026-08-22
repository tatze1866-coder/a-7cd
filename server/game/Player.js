const JOBS = require('./Job');
const { ITEMS } = require('./Items');

let nextPlayerId = 1;

function expForLevel(level) {
  return Math.floor(30 * Math.pow(level, 1.6));
}

class Player {
  constructor(ws, name) {
    this.id = nextPlayerId++;
    this.ws = ws;
    this.name = name || `Player${this.id}`;
    this.job = 'beginner';
    this.level = 1;
    this.exp = 0;
    this.expNeeded = expForLevel(1);

    this.maxHp = 100;
    this.hp = 100;
    this.maxMp = 50;
    this.mp = 50;

    this.gold = 100;
    this.inventory = []; // { item: id, qty }
    this.equipment = { weapon: null, armor: null };

    this.mapId = 'henesys';
    this.x = 100;
    this.y = 600;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1; // 1 = rechts, -1 = links

    this.input = { left: false, right: false, up: false };
    this.lastAttackAt = 0;
    this.skillCooldowns = {}; // skillKey -> timestamp bis wann gesperrt
    this.buffs = {}; // skillKey -> { until, damageMult?, speedMult? }
    this.attackFlashUntil = 0;
    this.alive = true;
    this.respawnAt = 0;
  }

  jobData() {
    return JOBS[this.job];
  }

  totalDamage() {
    const base = this.jobData().baseDamage + Math.floor(this.level * 1.5);
    let weaponBonus = 0;
    if (this.equipment.weapon && ITEMS[this.equipment.weapon]) {
      weaponBonus = ITEMS[this.equipment.weapon].damageBonus || 0;
    }
    let mult = 1;
    for (const key in this.buffs) {
      const b = this.buffs[key];
      if (b.until > Date.now() && b.damageMult) mult *= b.damageMult;
    }
    return Math.floor((base + weaponBonus) * mult);
  }

  moveSpeedMult() {
    let mult = 1;
    for (const key in this.buffs) {
      const b = this.buffs[key];
      if (b.until > Date.now() && b.speedMult) mult *= b.speedMult;
    }
    return mult;
  }

  defense() {
    let def = Math.floor(this.level * 0.8);
    if (this.equipment.armor && ITEMS[this.equipment.armor]) {
      def += ITEMS[this.equipment.armor].defBonus || 0;
    }
    return def;
  }

  addItem(itemId, qty = 1) {
    const existing = this.inventory.find(i => i.item === itemId);
    if (existing) existing.qty += qty;
    else this.inventory.push({ item: itemId, qty });
  }

  removeItem(itemId, qty = 1) {
    const existing = this.inventory.find(i => i.item === itemId);
    if (!existing || existing.qty < qty) return false;
    existing.qty -= qty;
    if (existing.qty <= 0) this.inventory = this.inventory.filter(i => i.item !== itemId);
    return true;
  }

  gainExp(amount) {
    if (!this.alive) return null;
    this.exp += amount;
    const events = [];
    while (this.exp >= this.expNeeded) {
      this.exp -= this.expNeeded;
      this.level += 1;
      this.expNeeded = expForLevel(this.level);
      this.maxHp += 12;
      this.maxMp += 6;
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      events.push({ type: 'levelup', level: this.level });
    }
    return events;
  }

  takeDamage(dmg) {
    const reduced = Math.max(1, dmg - this.defense());
    this.hp -= reduced;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.respawnAt = Date.now() + 3000;
    }
    return reduced;
  }

  respawn(spawnPoint) {
    this.alive = true;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.x = spawnPoint.x;
    this.y = spawnPoint.y;
    this.vy = 0;
  }

  publicState() {
    return {
      id: this.id,
      name: this.name,
      job: this.job,
      level: this.level,
      exp: this.exp,
      expNeeded: this.expNeeded,
      hp: this.hp,
      maxHp: this.maxHp,
      mp: this.mp,
      maxMp: this.maxMp,
      gold: this.gold,
      mapId: this.mapId,
      x: this.x,
      y: this.y,
      facing: this.facing,
      vx: this.vx,
      onGround: this.onGround,
      alive: this.alive,
      attackFlash: Date.now() < this.attackFlashUntil,
      equipment: this.equipment
    };
  }

  privateState() {
    return {
      inventory: this.inventory,
      buffs: Object.keys(this.buffs).filter(k => this.buffs[k].until > Date.now())
    };
  }
}

module.exports = { Player, expForLevel };
