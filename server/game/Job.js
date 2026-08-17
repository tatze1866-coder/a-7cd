// Job-Definitionen: Basiswerte, Skills, Sprite-Farbe (Platzhalter-Rechtecke)

const JOBS = {
  beginner: {
    name: 'Anfänger',
    color: '#cccccc',
    baseDamage: 4,
    attackRange: 45,
    skills: {}
  },
  warrior: {
    name: 'Warrior',
    color: '#d9534f',
    baseDamage: 10,
    attackRange: 50,
    skills: {
      slash: { name: 'Power Slash', mpCost: 5, cooldown: 1500, damageMult: 1.8, range: 60 },
      rage: { name: 'Rage', mpCost: 15, cooldown: 8000, buffDuration: 10000, damageMult: 1.4 }
    }
  },
  bowmaster: {
    name: 'Bowmaster',
    color: '#5cb85c',
    baseDamage: 7,
    attackRange: 350,
    skills: {
      arrowShot: { name: 'Double Shot', mpCost: 6, cooldown: 1200, damageMult: 1.6, range: 350, projectile: true },
      focus: { name: 'Focus', mpCost: 12, cooldown: 10000, buffDuration: 8000, damageMult: 1.3 }
    }
  },
  thief: {
    name: 'Thief',
    color: '#6f42c1',
    baseDamage: 8,
    attackRange: 45,
    skills: {
      disorder: { name: 'Lucky Seven', mpCost: 5, cooldown: 900, damageMult: 1.5, range: 50 },
      haste: { name: 'Haste', mpCost: 10, cooldown: 12000, buffDuration: 10000, speedMult: 1.5 }
    }
  },
  priest: {
    name: 'Priest',
    color: '#f0ad4e',
    baseDamage: 6,
    attackRange: 300,
    skills: {
      bolt: { name: 'Holy Bolt', mpCost: 8, cooldown: 1400, damageMult: 1.7, range: 300, projectile: true },
      heal: { name: 'Heal', mpCost: 20, cooldown: 6000, healAmount: 40 }
    }
  }
};

module.exports = JOBS;
