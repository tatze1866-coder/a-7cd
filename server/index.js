const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MAPS = require('./maps/maps');
const JOBS = require('./game/Job');
const MOB_TYPES = require('./game/MobTypes');
const { ITEMS, LOOT_TABLE, SHOP_ITEMS } = require('./game/Items');
const { Player } = require('./game/Player');
const Mob = require('./game/Mob');
const { applyPhysics } = require('./game/Physics');

const PORT = process.env.PORT || 3000;
const TICK_MS = 50;
const MOVE_SPEED = 3.2;
const BASE_ATTACK_COOLDOWN = 550;
const ATTACK_ANIM_MS = 450; // Dauer der Angriffs-Sprite-Animation im Client

// --- Statischer Fileserver für den Client ---
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.mp3': 'audio/mpeg' };

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(PUBLIC_DIR, filePath);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

// --- Spielzustand ---
const players = new Map(); // id -> Player
const mobs = []; // alle Mobs aller Maps

function spawnMobsForMap(mapDef) {
  for (const spawn of mapDef.mobSpawns) {
    for (let i = 0; i < spawn.count; i++) {
      const offset = i * 60 - (spawn.count * 30);
      mobs.push(new Mob(spawn.type, spawn.x + offset, spawn.y, mapDef.id));
    }
  }
}
Object.values(MAPS).forEach(spawnMobsForMap);

function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function broadcastToMap(mapId, obj) {
  const msg = JSON.stringify(obj);
  for (const p of players.values()) {
    if (p.mapId === mapId && p.ws.readyState === WebSocket.OPEN) p.ws.send(msg);
  }
}

function mobsInMap(mapId) {
  return mobs.filter(m => m.mapId === mapId);
}

function playersInMap(mapId) {
  return [...players.values()].filter(p => p.mapId === mapId);
}

// --- Verbindung ---
wss.on('connection', (ws) => {
  let player = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'join') {
      player = new Player(ws, (msg.name || '').slice(0, 16) || undefined);
      players.set(player.id, player);
      const mapDef = MAPS[player.mapId];
      send(ws, {
        type: 'init',
        playerId: player.id,
        maps: Object.fromEntries(Object.entries(MAPS).map(([k, v]) => [k, stripMap(v)])),
        jobs: JOBS,
        items: ITEMS,
        shop: SHOP_ITEMS,
        mapId: player.mapId
      });
      broadcastToMap(player.mapId, { type: 'chat', name: 'System', text: `${player.name} ist beigetreten.` });
      return;
    }

    if (!player) return;

    switch (msg.type) {
      case 'input':
        player.input.left = !!msg.left;
        player.input.right = !!msg.right;
        player.input.up = !!msg.up;
        break;

      case 'attack':
        handleAttack(player);
        break;

      case 'skill':
        handleSkill(player, msg.key);
        break;

      case 'useItem':
        handleUseItem(player, msg.item);
        break;

      case 'equip':
        handleEquip(player, msg.item);
        break;

      case 'unequip':
        handleUnequip(player, msg.slot);
        break;

      case 'buy':
        handleBuy(player, msg.item);
        break;

      case 'sell':
        handleSell(player, msg.item, msg.qty || 1);
        break;

      case 'chooseJob':
        handleChooseJob(player, msg.job);
        break;

      case 'chat':
        if (typeof msg.text === 'string' && msg.text.trim()) {
          broadcastToMap(player.mapId, { type: 'chat', name: player.name, text: msg.text.slice(0, 200) });
        }
        break;
    }
  });

  ws.on('close', () => {
    if (player) {
      broadcastToMap(player.mapId, { type: 'chat', name: 'System', text: `${player.name} hat das Spiel verlassen.` });
      players.delete(player.id);
    }
  });
});

function stripMap(m) {
  // Client braucht keine mobSpawns-Definition, nur Layout + Portale
  return {
    id: m.id, name: m.name, worldWidth: m.worldWidth, worldHeight: m.worldHeight,
    bgColor: m.bgColor, groundColor: m.groundColor, platforms: m.platforms, portals: m.portals
  };
}

// --- Aktions-Handler ---

function handleChooseJob(player, jobKey) {
  if (player.level < 3) {
    send(player.ws, { type: 'notice', text: 'Job-Wechsel erst ab Level 3 möglich.' });
    return;
  }
  if (!JOBS[jobKey] || jobKey === 'beginner') return;
  player.job = jobKey;
  send(player.ws, { type: 'notice', text: `Du bist jetzt ${JOBS[jobKey].name}!` });
}

function nearestMobInRange(player, range) {
  const candidates = mobsInMap(player.mapId).filter(m => m.alive);
  let best = null, bestDist = range;
  for (const m of candidates) {
    const dx = m.x - player.x;
    const dist = Math.abs(dx);
    const inFront = (player.facing === 1 && dx >= -10) || (player.facing === -1 && dx <= 10);
    if (dist < bestDist && inFront) { best = m; bestDist = dist; }
  }
  return best;
}

function dealDamageToMob(player, mob, dmg) {
  const died = mob.takeDamage(dmg);
  broadcastToMap(player.mapId, { type: 'combatFx', mobId: mob.id, dmg, x: mob.x, y: mob.y });
  if (died) {
    const def = mob.def;
    const events = player.gainExp(def.expReward);
    const [goldMin, goldMax] = def.goldReward;
    const gold = goldMin + Math.floor(Math.random() * (goldMax - goldMin + 1));
    player.gold += gold;

    const table = LOOT_TABLE[mob.type] || [];
    const drops = [];
    for (const entry of table) {
      if (Math.random() < entry.chance) { player.addItem(entry.item, 1); drops.push(entry.item); }
    }

    send(player.ws, { type: 'kill', mob: def.name, exp: def.expReward, gold, drops });
    if (events && events.length) {
      for (const ev of events) {
        broadcastToMap(player.mapId, { type: 'chat', name: 'System', text: `${player.name} ist jetzt Level ${ev.level}!` });
      }
    }
  }
}

function handleAttack(player) {
  if (!player.alive) return;
  const now = Date.now();
  if (now - player.lastAttackAt < BASE_ATTACK_COOLDOWN) return;
  player.lastAttackAt = now;
  player.attackFlashUntil = now + ATTACK_ANIM_MS;

  const range = player.jobData().attackRange;
  const mob = nearestMobInRange(player, range);
  if (mob) dealDamageToMob(player, mob, player.totalDamage());
}

function handleSkill(player, key) {
  if (!player.alive) return;
  const job = player.jobData();
  const skill = job.skills && job.skills[key];
  if (!skill) return;

  const now = Date.now();
  const readyAt = player.skillCooldowns[key] || 0;
  if (now < readyAt) return;
  if (player.mp < skill.mpCost) {
    send(player.ws, { type: 'notice', text: 'Nicht genug Mana.' });
    return;
  }

  player.mp -= skill.mpCost;
  player.skillCooldowns[key] = now + skill.cooldown;
  player.attackFlashUntil = now + ATTACK_ANIM_MS;

  if (skill.healAmount) {
    player.hp = Math.min(player.maxHp, player.hp + skill.healAmount);
    send(player.ws, { type: 'notice', text: `+${skill.healAmount} HP` });
  } else if (skill.buffDuration) {
    player.buffs[key] = { until: now + skill.buffDuration, damageMult: skill.damageMult, speedMult: skill.speedMult };
    send(player.ws, { type: 'notice', text: `${skill.name} aktiv!` });
  } else if (skill.damageMult) {
    const mob = nearestMobInRange(player, skill.range);
    if (mob) dealDamageToMob(player, mob, Math.floor(player.totalDamage() * skill.damageMult));
  }
}

function handleUseItem(player, itemId) {
  const item = ITEMS[itemId];
  if (!item || item.type !== 'consumable') return;
  if (!player.removeItem(itemId, 1)) return;
  if (item.effect === 'heal') player.hp = Math.min(player.maxHp, player.hp + item.amount);
  if (item.effect === 'mana') player.mp = Math.min(player.maxMp, player.mp + item.amount);
}

function handleEquip(player, itemId) {
  const item = ITEMS[itemId];
  if (!item || (item.type !== 'weapon' && item.type !== 'armor')) return;
  if (item.jobReq && item.jobReq !== player.job) {
    send(player.ws, { type: 'notice', text: `Nur für ${JOBS[item.jobReq].name}.` });
    return;
  }
  if (!player.inventory.find(i => i.item === itemId)) return;
  player.equipment[item.slot] = itemId;
}

function handleUnequip(player, slot) {
  if (player.equipment[slot]) player.equipment[slot] = null;
}

function handleBuy(player, itemId) {
  const item = ITEMS[itemId];
  if (!item || !SHOP_ITEMS.includes(itemId)) return;
  if (player.gold < item.price) { send(player.ws, { type: 'notice', text: 'Zu wenig Gold.' }); return; }
  player.gold -= item.price;
  player.addItem(itemId, 1);
}

function handleSell(player, itemId, qty) {
  const item = ITEMS[itemId];
  if (!item) return;
  if (!player.removeItem(itemId, qty)) return;
  const sellPrice = Math.max(1, Math.floor((item.price || 2) / 2));
  player.gold += sellPrice * qty;
}

// --- Game Loop ---
function tick() {
  const now = Date.now();
  const allPlayers = [...players.values()];

  // Respawn tote Mobs
  for (const m of mobs) m.tryRespawn();

  // Pro Map: Physik + KI
  for (const mapId of Object.keys(MAPS)) {
    const mapDef = MAPS[mapId];
    const mapPlayers = allPlayers.filter(p => p.mapId === mapId);
    const mapMobs = mobsInMap(mapId);

    for (const p of mapPlayers) {
      if (!p.alive) {
        if (now >= p.respawnAt) p.respawn(mapDef.spawnPoints.default);
        continue;
      }
      const speed = MOVE_SPEED * p.moveSpeedMult();
      p.vx = 0;
      if (p.input.left) { p.vx = -speed; p.facing = -1; }
      if (p.input.right) { p.vx = speed; p.facing = 1; }
      if (p.input.up && p.onGround) { p.vy = -15.5; }

      applyPhysics(p, mapDef.platforms, mapDef.worldWidth, mapDef.worldHeight);

      // Mana-Regeneration
      if (p.mp < p.maxMp) p.mp = Math.min(p.maxMp, p.mp + 0.05);

      // Portale prüfen
      for (const portal of mapDef.portals) {
        if (p.x > portal.x && p.x < portal.x + portal.w && p.y > portal.y - 60 && p.y < portal.y + portal.h) {
          const targetMap = MAPS[portal.targetMap];
          const sp = targetMap.spawnPoints[portal.targetSpawn] || targetMap.spawnPoints.default;
          p.mapId = portal.targetMap;
          p.x = sp.x; p.y = sp.y; p.vy = 0;
          send(p.ws, { type: 'mapChange', mapId: p.mapId });
          break;
        }
      }
    }

    for (const m of mapMobs) {
      if (!m.alive) continue;
      m.updateAI(mapPlayers, TICK_MS);
      applyPhysics(m, mapDef.platforms, mapDef.worldWidth, mapDef.worldHeight);
      // Kontaktschaden an Spielern
      for (const p of mapPlayers) {
        if (!p.alive) continue;
        const dx = Math.abs(p.x - m.x);
        const dy = Math.abs(p.y - m.y);
        if (dx < 26 && dy < 40 && now - (m.lastHitAt || 0) > 700) {
          m.lastHitAt = now;
          p.takeDamage(m.def.damage);
        }
      }
    }
  }

  // Broadcast State pro Map
  for (const mapId of Object.keys(MAPS)) {
    const mapPlayers = playersInMap(mapId);
    if (mapPlayers.length === 0) continue;
    const statePayload = {
      type: 'state',
      players: mapPlayers.map(p => p.publicState()),
      mobs: mobsInMap(mapId).map(m => m.publicState())
    };
    broadcastToMap(mapId, statePayload);
    for (const p of mapPlayers) send(p.ws, { type: 'private', data: p.privateState() });
  }
}

setInterval(tick, TICK_MS);

server.listen(PORT, () => {
  console.log(`Maple-Clone Server läuft auf http://localhost:${PORT}`);
});
