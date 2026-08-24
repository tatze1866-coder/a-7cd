// Alle Maps: Plattformen (begehbare Flächen), Portale (Map-Wechsel), Mob-Spawns
// Koordinatensystem: x=0..worldWidth, y=0 oben .. worldHeight unten (Gravity zieht nach unten)
//
// henesys:   Level 1 - kurzes Einsteiger-Feld, jetzt mit Wald-Panorama als Hintergrund (bgImage)
// kerning:   Level 2 - Hollow-Knight-artiger, vertikaler Moos-Schacht (useMossyTiles + decor)
// sleepywood: Level 3 - Dungeon (unverändert)

const MAPS = {
  henesys: {
    id: 'henesys',
    name: 'Henesys Field',
    worldWidth: 2000,
    worldHeight: 1000,
    bgColor: '#8fd0ff',
    groundColor: '#6ab04c',
    bgImage: 'assets/backgrounds/forest_level1.jpg', // Panorama-Hintergrund (leicht parallax)
    platforms: [
      { x: 0, y: 800, w: 2000, h: 200 },       // Boden
      { x: 160, y: 660, w: 200, h: 20 },       // schwebende Plattform
      { x: 420, y: 590, w: 180, h: 20 },
      { x: 660, y: 660, w: 200, h: 20 },
      { x: 920, y: 570, w: 180, h: 20 },
      { x: 1160, y: 690, w: 200, h: 20 },
      { x: 1420, y: 600, w: 180, h: 20 },
      { x: 1660, y: 670, w: 200, h: 20 },
      { x: 1840, y: 580, w: 150, h: 20 }
    ],
    spawnPoints: {
      default: { x: 100, y: 800 },
      fromKerning: { x: 1920, y: 800 }
    },
    portals: [
      { x: 1960, y: 700, w: 40, h: 100, targetMap: 'kerning', targetSpawn: 'default' }
    ],
    mobSpawns: [
      // Boden
      { type: 'slime', x: 300, y: 800, count: 6 },
      { type: 'slime', x: 1000, y: 800, count: 6 },
      { type: 'slime', x: 1700, y: 800, count: 6 },
      // Auf den schwebenden Plattformen
      { type: 'slime', x: 260, y: 660, count: 2 },
      { type: 'slime', x: 510, y: 590, count: 1 },
      { type: 'slime', x: 760, y: 660, count: 2 },
      { type: 'slime', x: 1010, y: 570, count: 1 },
      { type: 'slime', x: 1260, y: 690, count: 2 },
      { type: 'slime', x: 1510, y: 600, count: 1 },
      { type: 'slime', x: 1760, y: 670, count: 2 },
      { type: 'slime', x: 1910, y: 580, count: 1 }
    ]
  },

  // ====== Level 2: Mossy Hollow - vertikaler Moos-Schacht (Hollow-Knight-artig) ======
  kerning: {
    id: 'kerning',
    name: 'Mossy Hollow',
    worldWidth: 1050,
    worldHeight: 2200,
    bgColor: '#0e1f16',
    groundColor: '#16301f',
    useMossyTiles: true, // Client rendert Plattformen mit den Mossy-Sprites statt dem Standard-Tileset
    platforms: [
      { x: 0,   y: 2100, w: 1050, h: 140 },  // Boden / Eingangshalle
      { x: 60,  y: 1980, w: 220, h: 20 },
      { x: 340, y: 1870, w: 200, h: 20 },
      { x: 120, y: 1750, w: 220, h: 20 },
      { x: 420, y: 1650, w: 200, h: 20 },
      { x: 700, y: 1740, w: 220, h: 20 },  // Seitenkammer
      { x: 200, y: 1550, w: 220, h: 20 },
      { x: 480, y: 1460, w: 200, h: 20 },
      { x: 780, y: 1560, w: 220, h: 20 },  // Seitenkammer
      { x: 560, y: 1350, w: 200, h: 20 },
      { x: 260, y: 1260, w: 220, h: 20 },
      { x: 80,  y: 1140, w: 200, h: 20 },
      { x: 380, y: 1050, w: 220, h: 20 },
      { x: 700, y: 1130, w: 200, h: 20 },  // Seitenkammer
      { x: 850, y: 1000, w: 180, h: 20 },  // Seitenkammer
      { x: 540, y: 900,  w: 220, h: 20 },
      { x: 220, y: 800,  w: 200, h: 20 },
      { x: 420, y: 680,  w: 220, h: 20 },
      { x: 720, y: 600,  w: 220, h: 20 },  // Seitenkammer
      { x: 460, y: 470,  w: 220, h: 20 },
      { x: 200, y: 380,  w: 220, h: 20 },
      { x: 440, y: 260,  w: 260, h: 20 }   // Top-Landung mit Portal nach Sleepywood
    ],
    spawnPoints: {
      default: { x: 100, y: 2000 },
      fromHenesys: { x: 100, y: 2000 },
      fromSleepywood: { x: 560, y: 200 }
    },
    portals: [
      { x: 20, y: 2000, w: 40, h: 100, targetMap: 'henesys', targetSpawn: 'fromKerning' },
      { x: 540, y: 200, w: 40, h: 100, targetMap: 'sleepywood', targetSpawn: 'default' }
    ],
    mobSpawns: [
      { type: 'wolf', x: 150, y: 2100, count: 3 },
      { type: 'stump', x: 400, y: 1870, count: 1 },
      { type: 'wolf', x: 500, y: 1650, count: 2 },
      { type: 'stump', x: 800, y: 1740, count: 1 },
      { type: 'wolf', x: 550, y: 1460, count: 2 },
      { type: 'stump', x: 870, y: 1560, count: 1 },
      { type: 'wolf', x: 150, y: 1140, count: 2 },
      { type: 'stump', x: 930, y: 1000, count: 1 },
      { type: 'wolf', x: 300, y: 800, count: 2 },
      { type: 'wolf', x: 800, y: 600, count: 2 },
      { type: 'wolf', x: 540, y: 470, count: 2 },
      { type: 'stump', x: 280, y: 380, count: 1 }
    ],
    // Rein visuelle Deko (kein Kollisionseinfluss). layer 'back' = hinter den Plattformen
    // (Schacht-Silhouette), 'front' = davor (hängende Ranken, Findlinge, Dornranken).
    decorBack: [
      { sprite: 'hill_wall_a', x: -60, y: 1500, w: 260, h: 2100 },
      { sprite: 'hill_wall_b', x: 900, y: 1400, w: 260, h: 2000 },
      { sprite: 'hill_bg_a', x: 300, y: 1900, w: 500, h: 420 },
      { sprite: 'hill_bg_b', x: 550, y: 1300, w: 520, h: 460 },
      { sprite: 'hill_bg_a', x: 100, y: 950, w: 480, h: 400 },
      { sprite: 'hill_bg_b', x: 600, y: 650, w: 500, h: 440 },
      { sprite: 'hill_bg_a', x: 250, y: 300, w: 460, h: 380 }
    ],
    decorFront: [
      { sprite: 'hanging_vine_a', x: 260, y: 1870, w: 90, h: 260 },
      { sprite: 'hanging_moss_a', x: 620, y: 1650, w: 140, h: 200 },
      { sprite: 'boulder_a', x: 90, y: 1955, w: 140, h: 90 },
      { sprite: 'hanging_vine_b', x: 470, y: 1350, w: 90, h: 240 },
      { sprite: 'spikevine_a', x: 130, y: 1235, w: 150, h: 60 },
      { sprite: 'boulder_b', x: 720, y: 1105, w: 130, h: 80 },
      { sprite: 'hanging_vine_a', x: 260, y: 780, w: 90, h: 260 },
      { sprite: 'spikevine_b', x: 480, y: 655, w: 160, h: 60 },
      { sprite: 'boulder_c', x: 220, y: 355, w: 150, h: 100 },
      { sprite: 'hanging_moss_a', x: 780, y: 575, w: 140, h: 200 }
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
