// Mob-Typ-Definitionen: Stats, Loot, Aggro-Verhalten, Farbe (Platzhalter-Sprites)

const MOB_TYPES = {
  snail: {
    name: 'Snail', hp: 20, damage: 3, expReward: 5, goldReward: [2, 6],
    color: '#8b5a2b', width: 30, height: 24, moveSpeed: 0.4, aggroRange: 0, chase: false,
    respawnMs: 8000
  },
  slime: {
    name: 'Blue Slime', hp: 15, damage: 2, expReward: 4, goldReward: [1, 4],
    color: '#3498db', width: 28, height: 22, moveSpeed: 0.6, aggroRange: 0, chase: false,
    respawnMs: 7000
  },
  wolf: {
    name: 'Wild Wolf', hp: 45, damage: 8, expReward: 14, goldReward: [5, 12],
    color: '#7f8c8d', width: 40, height: 28, moveSpeed: 1.4, aggroRange: 180, chase: true,
    respawnMs: 10000
  },
  stump: {
    name: 'Stirge Stump', hp: 60, damage: 6, expReward: 16, goldReward: [6, 14],
    color: '#654321', width: 36, height: 40, moveSpeed: 0.3, aggroRange: 100, chase: true,
    respawnMs: 12000
  },
  zombie: {
    name: 'Zombie Mushmom', hp: 90, damage: 12, expReward: 28, goldReward: [10, 22],
    color: '#556b2f', width: 38, height: 36, moveSpeed: 0.8, aggroRange: 150, chase: true,
    respawnMs: 14000
  },
  ghost: {
    name: 'Restless Ghost', hp: 70, damage: 14, expReward: 32, goldReward: [12, 25],
    color: '#e6e6fa', width: 32, height: 32, moveSpeed: 1.6, aggroRange: 220, chase: true,
    respawnMs: 14000
  }
};

module.exports = MOB_TYPES;
