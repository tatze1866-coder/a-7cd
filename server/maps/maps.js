// Alle Maps: Plattformen (begehbare Flächen), Portale (Map-Wechsel), Mob-Spawns
// Koordinatensystem: x=0..worldWidth, y=0 oben .. worldHeight unten (Gravity zieht nach unten)

const MAPS = {
  henesys: {
    id: 'henesys',
    name: 'Henesys Field',
    worldWidth: 2600,
    worldHeight: 1000,
    bgColor: '#8fd0ff',
    groundColor: '#6ab04c',
    platforms: [
      { x: 0, y: 800, w: 2600, h: 200 },       // Boden (normal dick, aber nach unten verschoben)
      { x: 200, y: 650, w: 220, h: 20 },       // schwebende Plattform
      { x: 460, y: 580, w: 200, h: 20 },
      { x: 720, y: 650, w: 220, h: 20 },
      { x: 980, y: 560, w: 200, h: 20 },
      { x: 1240, y: 700, w: 200, h: 20 },
      { x: 1500, y: 610, w: 200, h: 20 },
      { x: 1760, y: 680, w: 220, h: 20 },
      { x: 2020, y: 570, w: 200, h: 20 },
      { x: 2280, y: 650, w: 180, h: 20 }
    ],
    spawnPoints: {
      default: { x: 100, y: 800 },
      fromKerning: { x: 2500, y: 800 }
    },
    portals: [
      { x: 2550, y: 700, w: 40, h: 100, targetMap: 'kerning', targetSpawn: 'default' }
    ],
    mobSpawns: [
      // Boden
      { type: 'slime', x: 400, y: 800, count: 8 },
      { type: 'slime', x: 1300, y: 800, count: 8 },
      { type: 'slime', x: 2200, y: 800, count: 8 },
      // Auf den schwebenden Plattformen
      { type: 'slime', x: 310, y: 650, count: 2 },
      { type: 'slime', x: 560, y: 580, count: 1 },
      { type: 'slime', x: 830, y: 650, count: 2 },
      { type: 'slime', x: 1080, y: 560, count: 2 },
      { type: 'slime', x: 1340, y: 700, count: 1 },
      { type: 'slime', x: 1600, y: 610, count: 2 },
      { type: 'slime', x: 1870, y: 680, count: 2 },
      { type: 'slime', x: 2120, y: 570, count: 2 },
      { type: 'slime', x: 2370, y: 650, count: 1 }
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
