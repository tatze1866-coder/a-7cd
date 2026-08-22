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

  // --- Rüstung (universal) ---
  leather_armor: { name: 'Leather Armor', type: 'armor', slot: 'armor', defBonus: 4, price: 60, color: '#8b5e3c' },
  chain_mail: { name: 'Chain Mail', type: 'armor', slot: 'armor', defBonus: 10, price: 220, color: '#b0b0b0' },
  cloth_robe: { name: 'Cloth Robe', type: 'armor', slot: 'armor', defBonus: 3, hpBonus: 20, price: 65, color: '#dda0dd' },

  // --- Consumables ---
  red_potion: { name: 'Red Potion', type: 'consumable', effect: 'heal', amount: 50, price: 15, color: '#e74c3c' },
  blue_potion: { name: 'Blue Potion', type: 'consumable', effect: 'mana', amount: 40, price: 15, color: '#3498db' },

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
  'leather_armor', 'chain_mail', 'cloth_robe'
];

module.exports = { ITEMS, LOOT_TABLE, SHOP_ITEMS };
