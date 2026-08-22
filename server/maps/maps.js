// Alle Maps: Plattformen (begehbare Flächen), Portale (Map-Wechsel), Mob-Spawns
// Koordinatensystem: x=0..worldWidth, y=0 oben .. worldHeight unten (Gravity zieht nach unten)

const MAPS = {
  henesys: {
    id: 'henesys',
    name: 'Henesys Field',
    worldWidth: 3200,
    worldHeight: 1400,
    bgColor: '#8fd0ff',
    groundColor: '#6ab04c',
    platforms: [
      { x: 0, y: 650, w: 3200, h: 750 },       // Boden (bis ganz nach unten, kein "Schweben" mehr)
      { x: 300, y: 500, w: 250, h: 20 },       // schwebende Plattform
      { x: 650, y: 420, w: 200, h: 20 },
      { x: 1000, y: 500, w: 250, h: 20 },
      { x: 1400, y: 400, w: 220, h: 20 },
      { x: 1700, y: 550, w: 200, h: 20 },
      { x: 2000, y: 460, w: 220, h: 20 },
      { x: 2350, y: 530, w: 250, h: 20 },
      { x: 2700, y: 420, w: 220, h: 20 },
      { x: 3000, y: 550, w: 180, h: 20 }
    ],
    spawnPoints: {
      default: { x: 100, y: 600 },
      fromKerning: { x: 3100, y: 600 }
    },
    portals: [
      { x: 3150, y: 550, w: 40, h: 100, targetMap: 'kerning', targetSpawn: 'default' }
    ],
    mobSpawns: [
      // Boden
      { type: 'slime', x: 500, y: 600, count: 8 },
      { type: 'slime', x: 1600, y: 600, count: 8 },
      { type: 'slime', x: 2700, y: 600, count: 8 },
      // Auf den schwebenden Plattformen
      { type: 'slime', x: 425, y: 500, count: 2 },
      { type: 'slime', x: 750, y: 420, count: 1 },
      { type: 'slime', x: 1125, y: 500, count: 2 },
      { type: 'slime', x: 1510, y: 400, count: 2 },
      { type: 'slime', x: 1800, y: 550, count: 1 },
      { type: 'slime', x: 2110, y: 460, count: 2 },
      { type: 'slime', x: 2475, y: 530, count: 2 },
      { type: 'slime', x: 2810, y: 420, count: 2 },
      { type: 'slime', x: 3090, y: 550, count: 1 }
    ]
  },

  kerning: {
    id: 'kerning',
    name: 'Kerning Forest',
    worldWidth: 2200,
    worldHeight: 800,
    bgColor: '#4a6d8c',
    groundColor: '#3c5a3c',
    platforms: [
      { x: 0, y: 650, w: 2200, h: 150 },
      { x: 250, y: 520, w: 200, h: 20 },
      { x: 550, y: 430, w: 180, h: 20 },
      { x: 850, y: 550, w: 220, h: 20 },
      { x: 1150, y: 420, w: 200, h: 20 },
      { x: 1500, y: 500, w: 250, h: 20 },
      { x: 1850, y: 420, w: 220, h: 20 }
    ],
    spawnPoints: {
      default: { x: 100, y: 600 },
      fromHenesys: { x: 100, y: 600 },
      fromSleepywood: { x: 2100, y: 600 }
    },
    portals: [
      { x: 20, y: 550, w: 40, h: 100, targetMap: 'henesys', targetSpawn: 'fromKerning' },
      { x: 2150, y: 550, w: 40, h: 100, targetMap: 'sleepywood', targetSpawn: 'default' }
    ],
    mobSpawns: [
      { type: 'wolf', x: 500, y: 600, count: 3 },
      { type: 'stump', x: 1000, y: 600, count: 2 },
      { type: 'wolf', x: 1600, y: 600, count: 3 },
      { type: 'stump', x: 2000, y: 600, count: 2 }
    ]
  },

  sleepywood: {
    id: 'sleepywood',
    name: 'Sleepywood Dungeon',
    worldWidth: 1800,
    worldHeight: 800,
    bgColor: '#1a1a2e',
    groundColor: '#2d2d44',
    platforms: [
      { x: 0, y: 650, w: 1800, h: 150 },
      { x: 300, y: 500, w: 200, h: 20 },
      { x: 600, y: 400, w: 180, h: 20 },
      { x: 900, y: 500, w: 220, h: 20 },
      { x: 1250, y: 420, w: 200, h: 20 },
      { x: 1550, y: 550, w: 200, h: 20 }
    ],
    spawnPoints: {
      default: { x: 100, y: 600 },
      fromKerning: { x: 100, y: 600 }
    },
    portals: [
      { x: 20, y: 550, w: 40, h: 100, targetMap: 'kerning', targetSpawn: 'fromSleepywood' }
    ],
    mobSpawns: [
      { type: 'zombie', x: 500, y: 600, count: 3 },
      { type: 'ghost', x: 1000, y: 600, count: 3 },
      { type: 'zombie', x: 1500, y: 600, count: 3 }
    ]
  }
};

module.exports = MAPS;
