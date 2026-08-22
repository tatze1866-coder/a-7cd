const JOBS = require('./Job');
const { ITEMS } = require('./Items');

let nextPlayerId = 1;

function expForLevel(level) {
  return Math.floor(30 * Math.pow(level, 1.6));
}

const EQUIP_SLOTS = ['weapon', 'helmet', 'chest', 'gloves', 'cape', 'pants', 'shoes', 'ring1', 'ring2'];
const STAT_KEYS = ['str', 'dex', 'int', 'luk'];

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

    // --- Stats & Punkte (5 Punkte pro Level-up, frei verteilbar) ---
    this.stats = { str: 4, dex: 4, int: 4, luk: 4 };
    this.statPoints = 0;

    // --- Skillbaum: 1 Skillpunkt pro Level-up (sobald ein Job gewählt ist) ---
    this.skillPoints = 0;
    this.skillLevels = {}; // skillKey -> 0..5, jede Stufe = +10% Effekt

    this.gold = 100;
    this.inventory = []; // { item: id, qty }
    this.equipment = { weapon: null, helmet: null, chest: null, gloves: null, cape: null, pants: null, shoes: null, ring1: null, ring2: null };

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

  // Summe eines Stat-Bonus (z.B. aus Ringen) über alle ausgerüsteten Items
  equippedStatBonus(stat) {
    let total = 0;
    for (const slot of EQUIP_SLOTS) {
      const id = this.equipment[slot];
      const def = id && ITEMS[id];
      if (def && def.statBonus && def.statBonus[stat]) total += def.statBonus[stat];
    }
    return total;
  }

  // Skalierung eines Skills über die aktuelle Skillbaum-Stufe (+10% pro Stufe)
  skillScale(key) {
    const lvl = this.skillLevels[key] || 0;
    return 1 + lvl * 0.1;
  }

  totalDamage() {
    const base = this.jobData().baseDamage + Math.floor(this.level * 1.5);
    let weaponBonus = 0;
    if (this.equipment.weapon && ITEMS[this.equipment.weapon]) {
      weaponBonus = ITEMS[this.equipment.weapon].damageBonus || 0;
    }
    const primary = this.jobData().primaryStat;
    const statBonus = primary ? Math.floor((this.stats[primary] + this.equippedStatBonus(primary)) * 0.8) : 0;
    let mult = 1;
    for (const key in this.buffs) {
      const b = this.buffs[key];
      if (b.until > Date.now() && b.damageMult) mult *= b.damageMult;
    }
    return Math.floor((base + weaponBonus + statBonus) * mult);
  }

  // Krit-Chance aus LUK (Basiswert + Ring-Boni), gedeckelt bei 35%
  critChance() {
    return Math.min(0.35, (this.stats.luk + this.equippedStatBonus('luk')) * 0.01);
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
    for (const slot of EQUIP_SLOTS) {
      if (slot === 'weapon') continue;
      const id = this.equipment[slot];
      if (id && ITEMS[id]) def += ITEMS[id].defBonus || 0;
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
      this.statPoints += 5;
      if (this.job !== 'beginner') this.skillPoints += 1;
      events.push({ type: 'levelup', level: this.level });
    }
    return events;
  }

  // Ein Statpunkt investieren. stat: 'str'|'dex'|'int'|'luk'|'hp'
  allocateStat(stat) {
    if (this.statPoints <= 0) return false;
    if (stat === 'hp') {
      this.statPoints -= 1;
      this.maxHp += 10;
      this.hp += 10;
      return true;
    }
    if (STAT_KEYS.includes(stat)) {
      this.statPoints -= 1;
      this.stats[stat] += 1;
      return true;
    }
    return false;
  }

  // Einen Skillpunkt in einen Skill des aktuellen Jobs investieren (max Stufe 5)
  allocateSkill(key) {
    const job = this.jobData();
    if (!job.skills || !job.skills[key]) return false;
    if (this.skillPoints <= 0) return false;
    const cur = this.skillLevels[key] || 0;
    if (cur >= 5) return false;
    this.skillPoints -= 1;
    this.skillLevels[key] = cur + 1;
    return true;
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
      equipment: this.equipment,
      stats: this.stats,
      statPoints: this.statPoints,
      skillPoints: this.skillPoints,
      skillLevels: this.skillLevels
    };
  }

  privateState() {
    return {
      inventory: this.inventory,
      buffs: Object.keys(this.buffs).filter(k => this.buffs[k].until > Date.now())
    };
  }
}

module.exports = { Player, expForLevel, EQUIP_SLOTS };
