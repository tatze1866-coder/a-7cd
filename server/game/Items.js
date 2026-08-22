// Item-Datenbank: Equipment & Consumables

const ITEMS = {
  // --- Waffen (job-spezifisch über 'jobReq') ---
  wooden_sword: { name: 'Wooden Sword', type: 'weapon', slot: 'weapon', jobReq: 'warrior', damageBonus: 5, price: 40, color: '#a0522d' },
  steel_sword: { name: 'Steel Sword', type: 'weapon', slot: 'weapon', jobReq: 'warrior', damageBonus: 14, price: 180, color: '#c0c0c0' },
  short_bow: { name: 'Short Bow', type: 'weapon', slot: 'weapon', jobReq: 'bowmaster', damageBonus: 6, price: 45, color: '#8b4513' },
  hunters_bow: { name: "Hunter's Bow", type: 'weapon', slot: 'weapon', jobReq: 'bowmaster', damageBonus: 15, price: 190, color: '#daa520' },
  rusty_dagger: { name: 'Rusty Dagger', type: 'weapon', slot: 'weapon', jobReq: 'thief', damageBonus: 5, price: 40, color: '#708090' },
  twin_blade: { name: 'Twin Blade', type: 'weapon', slot: 'weapon', jobReq: 'thief', damageBonus: 15, price: 185, color: '#4b0082' },
  wand: { name: 'Wooden Wand', type: 'weapon', slot: 'weapon', jobReq: 'priest', damageBonus: 6, price: 45, color: '#deb887' },
  holy_staff: { name: 'Holy Staff', type: 'weapon', slot: 'weapon', jobReq: 'priest', damageBonus: 16, price: 195, color: '#ffd700' },

  // --- Rüstung: Brustpanzer (chest) ---
  leather_armor: { name: 'Leather Armor', type: 'armor', slot: 'chest', defBonus: 4, price: 60, color: '#8b5e3c' },
  chain_mail: { name: 'Chain Mail', type: 'armor', slot: 'chest', defBonus: 10, price: 220, color: '#b0b0b0' },
  cloth_robe: { name: 'Cloth Robe', type: 'armor', slot: 'chest', defBonus: 3, hpBonus: 20, price: 65, color: '#dda0dd' },

  // --- Rüstung: Hut (helmet) ---
  leather_cap: { name: 'Leather Cap', type: 'armor', slot: 'helmet', defBonus: 2, price: 35, color: '#8b5e3c' },
  iron_helmet: { name: 'Iron Helmet', type: 'armor', slot: 'helmet', defBonus: 6, price: 150, color: '#b0b0b0' },

  // --- Rüstung: Handschuhe (gloves) ---
  cloth_gloves: { name: 'Cloth Gloves', type: 'armor', slot: 'gloves', defBonus: 1, price: 25, color: '#dda0dd' },
  leather_gloves: { name: 'Leather Gloves', type: 'armor', slot: 'gloves', defBonus: 3, price: 110, color: '#8b5e3c' },

  // --- Rüstung: Umhang (cape) ---
  torn_cape: { name: 'Torn Cape', type: 'armor', slot: 'cape', defBonus: 1, price: 30, color: '#556b2f' },
  wind_cape: { name: 'Wind Cape', type: 'armor', slot: 'cape', defBonus: 3, price: 130, color: '#2f80b0' },

  // --- Rüstung: Hose (pants) ---
  cloth_pants: { name: 'Cloth Pants', type: 'armor', slot: 'pants', defBonus: 2, price: 40, color: '#5b4636' },
  leather_pants: { name: 'Leather Pants', type: 'armor', slot: 'pants', defBonus: 4, price: 160, color: '#3b2f2f' },

  // --- Rüstung: Schuhe (shoes) ---
  worn_boots: { name: 'Worn Boots', type: 'armor', slot: 'shoes', defBonus: 2, price: 35, color: '#4a3222' },
  swift_boots: { name: 'Swift Boots', type: 'armor', slot: 'shoes', defBonus: 4, price: 150, color: '#2b2b2b' },

  // --- Rüstung: Ringe (ring, 2 Ringplätze) ---
  copper_ring: { name: 'Copper Ring', type: 'armor', slot: 'ring', defBonus: 1, price: 50, color: '#b87333' },
  lucky_ring: { name: 'Lucky Ring', type: 'armor', slot: 'ring', defBonus: 1, statBonus: { luk: 2 }, price: 170, color: '#f1c40f' },

  // --- Consumables ---
  red_potion: { name: 'Red Potion', type: 'consumable', effect: 'heal', amount: 50, price: 15, color: '#e74c3c', icon: 'regeneration' },
  blue_potion: { name: 'Blue Potion', type: 'consumable', effect: 'mana', amount: 40, price: 15, color: '#3498db', icon: 'mana_replenish' },

  // --- Drop-only Materialien (Verkaufswert) ---
  snail_shell: { name: 'Snail Shell', type: 'material', price: 3, color: '#a0522d' },
  slime_gel: { name: 'Slime Gel', type: 'material', price: 3, color: '#3498db' },
  wolf_fang: { name: 'Wolf Fang', type: 'material', price: 6, color: '#ecf0f1' }
};

// Drop-Tabelle pro Mob-Typ: [{itemId, chance(0-1)}]
const LOOT_TABLE = {
  snail: [{ item: 'snail_shell', chance: 0.5 }, { item: 'red_potion', chance: 0.1 }],
  slime: [{ item: 'slime_gel', chance: 0.5 }, { item: 'blue_potion', chance: 0.1 }],
  wolf: [{ item: 'wolf_fang', chance: 0.4 }, { item: 'red_potion', chance: 0.15 }],
  stump: [{ item: 'red_potion', chance: 0.2 }, { item: 'leather_armor', chance: 0.03 }],
  zombie: [{ item: 'blue_potion', chance: 0.2 }, { item: 'chain_mail', chance: 0.02 }],
  ghost: [{ item: 'red_potion', chance: 0.25 }, { item: 'cloth_robe', chance: 0.03 }]
};

// Shop-Sortiment pro Job (NPC-Händler im Startgebiet)
const SHOP_ITEMS = [
  'red_potion', 'blue_potion',
  'wooden_sword', 'steel_sword',
  'short_bow', 'hunters_bow',
  'rusty_dagger', 'twin_blade',
  'wand', 'holy_staff',
  'leather_armor', 'chain_mail', 'cloth_robe',
  'leather_cap', 'iron_helmet',
  'cloth_gloves', 'leather_gloves',
  'torn_cape', 'wind_cape',
  'cloth_pants', 'leather_pants',
  'worn_boots', 'swift_boots',
  'copper_ring', 'lucky_ring'
];

module.exports = { ITEMS, LOOT_TABLE, SHOP_ITEMS };
