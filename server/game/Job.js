// Job-Definitionen: Basiswerte, Skills, Sprite-Farbe (Platzhalter-Rechtecke)
// Jeder Skill trägt ein "fx"-Feld -> Key aus public/client.js EFFECT_DEFS,
// bestimmt welches 32x32-Pixel-Effekt-Sheet beim Cast abgespielt wird.
// Das "icon"-Feld verweist auf public/assets/skillicons/<icon>.png (16x16 Icon-Pack)
// und wird im Client für Skillleiste + Skillbaum angezeigt.

const JOBS = {
  beginner: {
    name: 'Anfänger',
    color: '#cccccc',
    baseDamage: 4,
    attackRange: 45,
    primaryStat: null,
    skills: {}
  },
  warrior: {
    name: 'Warrior',
    color: '#d9534f',
    baseDamage: 10,
    attackRange: 50,
    primaryStat: 'str',
    skills: {
      slash: { name: 'Power Slash', mpCost: 5, cooldown: 1500, damageMult: 1.8, range: 60, fx: 'fx_warrior_slash', icon: 'fire_spell' },
      rage: { name: 'Rage', mpCost: 15, cooldown: 8000, buffDuration: 10000, damageMult: 1.4, fx: 'fx_warrior_rage', icon: 'attack_boost' },
      cleave: { name: 'Cleave', mpCost: 9, cooldown: 3500, damageMult: 2.2, range: 65, fx: 'fx_warrior_cleave', icon: 'fire_spell_2' },
      charge: { name: 'Flame Charge', mpCost: 7, cooldown: 4000, damageMult: 1.6, range: 70, fx: 'fx_warrior_charge', icon: 'lightning_spell' },
      meteorSlam: { name: 'Meteor Slam', mpCost: 22, cooldown: 12000, damageMult: 3.0, range: 70, fx: 'fx_warrior_meteor', icon: 'knockback_boost' }
    }
  },
  bowmaster: {
    name: 'Bowmaster',
    color: '#5cb85c',
    baseDamage: 7,
    attackRange: 350,
    primaryStat: 'dex',
    skills: {
      arrowShot: { name: 'Double Shot', mpCost: 6, cooldown: 1200, damageMult: 1.6, range: 350, projectile: true, fx: 'fx_bow_doubleshot', icon: 'ice_spell' },
      focus: { name: 'Focus', mpCost: 12, cooldown: 10000, buffDuration: 8000, damageMult: 1.3, fx: 'fx_bow_focus', icon: 'critical_boost' },
      snipe: { name: 'Snipe', mpCost: 16, cooldown: 5000, damageMult: 2.6, range: 420, projectile: true, fx: 'fx_bow_snipe', icon: 'water_spell' },
      rainOfArrows: { name: 'Rain of Arrows', mpCost: 14, cooldown: 6000, damageMult: 2.0, range: 380, projectile: true, fx: 'fx_bow_rain', icon: 'summoning_spell' },
      naturesGrasp: { name: "Nature's Grasp", mpCost: 10, cooldown: 5000, damageMult: 1.7, range: 300, projectile: true, fx: 'fx_bow_grasp', icon: 'thorn_vine_spell' }
    }
  },
  thief: {
    name: 'Thief',
    color: '#6f42c1',
    baseDamage: 8,
    attackRange: 45,
    primaryStat: 'luk',
    skills: {
      disorder: { name: 'Lucky Seven', mpCost: 5, cooldown: 900, damageMult: 1.5, range: 50, fx: 'fx_thief_lucky7', icon: 'lucky_boost' },
      haste: { name: 'Haste', mpCost: 10, cooldown: 12000, buffDuration: 10000, speedMult: 1.5, fx: 'fx_thief_haste', icon: 'swiftness' },
      backstab: { name: 'Backstab', mpCost: 9, cooldown: 4000, damageMult: 2.4, range: 50, fx: 'fx_thief_backstab', icon: 'poison_dagger' },
      shadowVeil: { name: 'Shadow Veil', mpCost: 8, cooldown: 3000, damageMult: 1.6, range: 50, fx: 'fx_thief_shadowveil', icon: 'ghost_form' },
      assassinate: { name: 'Assassinate', mpCost: 24, cooldown: 13000, damageMult: 3.2, range: 55, fx: 'fx_thief_assassinate', icon: 'bleeding' }
    }
  },
  priest: {
    name: 'Priest',
    color: '#f0ad4e',
    baseDamage: 6,
    attackRange: 300,
    primaryStat: 'int',
    skills: {
      bolt: { name: 'Holy Bolt', mpCost: 8, cooldown: 1400, damageMult: 1.7, range: 300, projectile: true, fx: 'fx_priest_bolt', icon: 'blinding_light_spell' },
      heal: { name: 'Heal', mpCost: 20, cooldown: 6000, healAmount: 40, fx: 'fx_priest_heal', icon: 'healing_spell' },
      bless: { name: 'Bless', mpCost: 12, cooldown: 9000, buffDuration: 9000, damageMult: 1.3, fx: 'fx_priest_bless', icon: 'divine_protection_spell' },
      divineComet: { name: 'Divine Comet', mpCost: 26, cooldown: 13000, damageMult: 3.0, range: 320, projectile: true, fx: 'fx_priest_comet', icon: 'magic_amplification' },
      sanctuary: { name: 'Sanctuary', mpCost: 18, cooldown: 9000, healAmount: 70, fx: 'fx_priest_sanctuary', icon: 'fortify_spell' }
    }
  }
};

module.exports = JOBS;
