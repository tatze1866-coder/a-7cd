// ====== Globaler Zustand ======
let ws = null;
let myId = null;
let maps = {};
let jobs = {};
let items = {};
let shopList = [];
let currentMapId = null;

let players = [];      // letzter State-Snapshot
let mobs = [];
let myInventory = [];
let myBuffs = [];

const camera = { x: 0, y: 0 };
const keys = {};
let chatOpen = false;

// ====== Tileset laden ======
// Sprite-Sheet: 3x3 Tiles à 16px. Reihen: 0=Gras-Oberkante, 1=Erde-Mitte, 2=Erde-Unterkante
// Spalten: 0=links (Rand), 1=Mitte (wiederholbar), 2=rechts (Rand)
const TILE_SRC = 16;
const PLATFORM_TILE = 20; // gerenderte Tile-Größe in Weltkoordinaten
const tilesetImg = new Image();
let tilesetLoaded = false;
tilesetImg.onload = () => { tilesetLoaded = true; };
tilesetImg.src = 'assets/platform-tiles.png';

// Slime-Spritesheet: 6 Farbreihen x 5 Frames (Stand, Walk1, Walk2, Attack, Dead), 32px, nur R-Facing (L wird gespiegelt)
const SLIME_FRAME = 32;
const SLIME_COLORS = 6;
const slimeImg = new Image();
let slimeLoaded = false;
slimeImg.onload = () => { slimeLoaded = true; };
slimeImg.src = 'assets/slime-sheet.png';

// ====== Canvas Setup ======
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
ctx.imageSmoothingEnabled = false;

// ====== Login ======
document.getElementById('joinBtn').addEventListener('click', joinGame);
document.getElementById('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') joinGame(); });

function joinGame() {
  const name = document.getElementById('nameInput').value.trim() || 'Held';
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('gameContainer').classList.remove('hidden');

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'join', name }));
  });
  ws.addEventListener('message', onMessage);
  requestAnimationFrame(gameLoop);
  setInterval(sendInput, 50);
}

// ====== Networking ======
function onMessage(evt) {
  const msg = JSON.parse(evt.data);
  switch (msg.type) {
    case 'init':
      myId = msg.playerId;
      maps = msg.maps;
      jobs = msg.jobs;
      items = msg.items;
      shopList = msg.shop;
      currentMapId = msg.mapId;
      buildSkillBar();
      break;
    case 'state':
      players = msg.players;
      mobs = msg.mobs;
      updateHud();
      break;
    case 'private':
      myInventory = msg.data.inventory;
      myBuffs = msg.data.buffs;
      renderInventoryPanel();
      break;
    case 'mapChange':
      currentMapId = msg.mapId;
      showPopup(`→ ${maps[currentMapId].name}`);
      break;
    case 'chat':
      addChatLine(msg.name, msg.text);
      break;
    case 'notice':
      showPopup(msg.text);
      break;
    case 'kill':
      let txt = `+${msg.exp} EXP  +${msg.gold}💰`;
      if (msg.drops.length) txt += `  [${msg.drops.map(d => items[d]?.name || d).join(', ')}]`;
      showPopup(txt);
      break;
    case 'combatFx':
      spawnDamageNumber(msg.x, msg.y, msg.dmg);
      break;
  }
}

// ====== Input ======
window.addEventListener('keydown', e => {
  if (chatOpen) return;
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'z' || e.key === 'Z') sendAction({ type: 'attack' });
  if (e.key === '1') sendAction({ type: 'skill', key: firstSkillKey(0) });
  if (e.key === '2') sendAction({ type: 'skill', key: firstSkillKey(1) });
  if (e.key.toLowerCase() === 'i') togglePanel('inventoryPanel');
  if (e.key.toLowerCase() === 'j') togglePanel('jobPanel');
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function firstSkillKey(index) {
  const me = players.find(p => p.id === myId);
  if (!me) return null;
  const job = jobs[me.job];
  if (!job || !job.skills) return null;
  const k = Object.keys(job.skills);
  return k[index] || null;
}

function sendInput() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'input',
    left: !!keys['arrowleft'] || !!keys['a'],
    right: !!keys['arrowright'] || !!keys['d'],
    up: !!keys['arrowup'] || !!keys['w'] || !!keys[' ']
  }));
}
function sendAction(obj) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); }

// ====== Chat ======
const chatInput = document.getElementById('chatInput');
chatInput.addEventListener('focus', () => chatOpen = true);
chatInput.addEventListener('blur', () => chatOpen = false);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (chatInput.value.trim()) sendAction({ type: 'chat', text: chatInput.value.trim() });
    chatInput.value = '';
    chatInput.blur();
  }
  if (e.key === 'Escape') chatInput.blur();
});
window.addEventListener('keydown', e => {
  if (!chatOpen && e.key === 'Enter') chatInput.focus();
});

function addChatLine(name, text) {
  const log = document.getElementById('chatLog');
  const line = document.createElement('div');
  line.textContent = `${name}: ${text}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
  while (log.children.length > 50) log.removeChild(log.firstChild);
}

// ====== Popups ======
function showPopup(text) {
  const layer = document.getElementById('popupLayer');
  const el = document.createElement('div');
  el.className = 'popupMsg';
  el.textContent = text;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

let dmgNumbers = [];
function spawnDamageNumber(x, y, dmg) {
  dmgNumbers.push({ x, y, dmg, born: performance.now() });
}

// ====== HUD ======
function updateHud() {
  const me = players.find(p => p.id === myId);
  if (!me) return;
  document.getElementById('hudName').textContent = `${me.name}  Lv.${me.level}  ${jobs[me.job]?.name || ''}`;
  document.getElementById('hpBar').style.width = `${(me.hp / me.maxHp) * 100}%`;
  document.getElementById('hpText').textContent = `${me.hp}/${me.maxHp}`;
  document.getElementById('mpBar').style.width = `${(me.mp / me.maxMp) * 100}%`;
  document.getElementById('mpText').textContent = `${me.mp}/${me.maxMp}`;
  document.getElementById('expBar').style.width = `${(me.exp / me.expNeeded) * 100}%`;
  document.getElementById('expText').textContent = `${me.exp}/${me.expNeeded}`;
  document.getElementById('hudGold').lastChild.textContent = me.gold;
}

// ====== Panels ======
document.querySelectorAll('.closeBtn').forEach(btn => {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.add('hidden'));
});
document.getElementById('slotInv').addEventListener('click', () => togglePanel('inventoryPanel'));
document.getElementById('slotJob').addEventListener('click', () => togglePanel('jobPanel'));

function togglePanel(id) {
  const el = document.getElementById(id);
  el.classList.toggle('hidden');
  if (id === 'inventoryPanel' && !el.classList.contains('hidden')) renderInventoryPanel();
  if (id === 'jobPanel' && !el.classList.contains('hidden')) renderJobPanel();
}

function buildSkillBar() {
  // Skillnamen werden dynamisch aktualisiert sobald der Job feststeht (siehe updateHud/render loop)
}

function refreshSkillLabels() {
  const me = players.find(p => p.id === myId);
  if (!me) return;
  const job = jobs[me.job];
  const keys = job && job.skills ? Object.keys(job.skills) : [];
  const slot1 = document.getElementById('slot1');
  const slot2 = document.getElementById('slot2');
  slot1.lastChild.textContent = keys[0] ? job.skills[keys[0]].name : '—';
  slot2.lastChild.textContent = keys[1] ? job.skills[keys[1]].name : '—';
}

function renderInventoryPanel() {
  document.getElementById('equipWeapon').innerHTML = `Waffe<br>${equipLabel('weapon')}`;
  document.getElementById('equipArmor').innerHTML = `Rüstung<br>${equipLabel('armor')}`;
  const grid = document.getElementById('invGrid');
  grid.innerHTML = '';
  for (const entry of myInventory) {
    const def = items[entry.item];
    if (!def) continue;
    const card = document.createElement('div');
    card.className = 'invItem';
    let actions = '';
    if (def.type === 'consumable') actions = `<button data-use="${entry.item}">Nutzen</button>`;
    if (def.type === 'weapon' || def.type === 'armor') actions = `<button data-equip="${entry.item}">Ausrüsten</button><button data-sell="${entry.item}">Verkaufen</button>`;
    if (def.type === 'material') actions = `<button data-sell="${entry.item}">Verkaufen</button>`;
    card.innerHTML = `<div class="itemSwatch" style="background:${def.color || '#888'}"></div>${def.name} x${entry.qty}<div class="itemActions">${actions}</div>`;
    grid.appendChild(card);
  }
  grid.querySelectorAll('[data-use]').forEach(b => b.onclick = () => sendAction({ type: 'useItem', item: b.dataset.use }));
  grid.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => sendAction({ type: 'equip', item: b.dataset.equip }));
  grid.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => sendAction({ type: 'sell', item: b.dataset.sell, qty: 1 }));
}

function equipLabel(slot) {
  const me = players.find(p => p.id === myId);
  if (!me || !me.equipment[slot]) return '—';
  return items[me.equipment[slot]]?.name || '—';
}

function renderJobPanel() {
  const grid = document.getElementById('jobGrid');
  grid.innerHTML = '';
  for (const key of Object.keys(jobs)) {
    if (key === 'beginner') continue;
    const job = jobs[key];
    const card = document.createElement('div');
    card.className = 'jobCard';
    const skillNames = Object.values(job.skills || {}).map(s => s.name).join(', ');
    card.innerHTML = `<b style="color:${job.color}">${job.name}</b><br><small>${skillNames}</small>`;
    card.onclick = () => sendAction({ type: 'chooseJob', job: key });
    grid.appendChild(card);
  }
}

// ====== Rendering ======
function gameLoop() {
  render();
  requestAnimationFrame(gameLoop);
}

function render() {
  if (!currentMapId || !maps[currentMapId]) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const map = maps[currentMapId];
  const me = players.find(p => p.id === myId);

  refreshSkillLabels();

  // Kamera folgt dem eigenen Spieler
  if (me) {
    camera.x = clamp(me.x - canvas.width / 2, 0, Math.max(0, map.worldWidth - canvas.width));
    camera.y = clamp(me.y - canvas.height / 2, 0, Math.max(0, map.worldHeight - canvas.height));
  }

  ctx.fillStyle = map.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // Plattformen
  for (const p of map.platforms) drawPlatform(p);

  // Portale
  ctx.fillStyle = 'rgba(120, 200, 255, 0.55)';
  for (const portal of map.portals) {
    ctx.fillRect(portal.x, portal.y - 60, portal.w, portal.h + 60);
  }

  // Mobs (nur der aktuellen Map, kommen bereits gefiltert vom Server)
  for (const m of mobs) drawMob(m);

  // Spieler (nur der aktuellen Map)
  for (const p of players) drawPlayer(p, p.id === myId);

  // Damage-Zahlen
  const now = performance.now();
  dmgNumbers = dmgNumbers.filter(d => now - d.born < 800);
  for (const d of dmgNumbers) {
    const t = (now - d.born) / 800;
    ctx.fillStyle = `rgba(255,80,80,${1 - t})`;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`-${d.dmg}`, d.x, d.y - 50 - t * 30);
  }

  ctx.restore();

  // Buff-Anzeige oben rechts
  drawBuffs();
}

function drawPlatform(p) {
  if (!tilesetLoaded) {
    // Fallback bevor das Bild geladen ist
    ctx.fillStyle = '#6ab04c';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    return;
  }

  const cols = Math.ceil(p.w / PLATFORM_TILE);
  const rows = Math.ceil(p.h / PLATFORM_TILE);

  for (let r = 0; r < rows; r++) {
    const srcRow = r === 0 ? 0 : 1; // Reihe 0 = Gras oben, ab Reihe 1 = Erde
    const destY = p.y + r * PLATFORM_TILE;
    const destH = Math.min(PLATFORM_TILE, p.y + p.h - destY);
    const srcH = (destH / PLATFORM_TILE) * TILE_SRC;

    for (let c = 0; c < cols; c++) {
      const srcCol = cols === 1 ? 1 : (c === 0 ? 0 : (c === cols - 1 ? 2 : 1));
      const destX = p.x + c * PLATFORM_TILE;
      const destW = Math.min(PLATFORM_TILE, p.x + p.w - destX);
      const srcW = (destW / PLATFORM_TILE) * TILE_SRC;

      ctx.drawImage(
        tilesetImg,
        srcCol * TILE_SRC, srcRow * TILE_SRC, srcW, srcH,
        destX, destY, destW, destH
      );
    }
  }
}

function drawMob(m) {
  if (!m.alive) return;
  if (m.type === 'slime' && slimeLoaded) { drawSlimeSprite(m); return; }

  const def = MOB_COLORS[m.type] || { w: 32, h: 32 };
  const w = def.w, h = def.h;
  ctx.save();
  ctx.fillStyle = m.hitFlash ? '#ffffff' : def.color;
  const x = m.x - w / 2, y = m.y - h;
  ctx.fillRect(x, y, w, h);
  // Augen
  ctx.fillStyle = '#000';
  ctx.fillRect(x + w * 0.6, y + h * 0.25, 4, 4);
  ctx.fillRect(x + w * 0.25, y + h * 0.25, 4, 4);
  // HP-Balken
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y - 10, w, 5);
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(x, y - 10, w * (m.hp / m.maxHp), 5);
  // Name
  ctx.fillStyle = '#fff';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(def.name, m.x, y - 14);
  ctx.restore();
}

function drawSlimeSprite(m) {
  const renderSize = 40; // hochskaliert von 32px Quellgröße
  const colorRow = m.id % SLIME_COLORS;
  let frameCol = 0; // 0 = Stand
  if (Math.abs(m.vx) > 0.05) {
    frameCol = Math.floor(performance.now() / 220) % 2 === 0 ? 1 : 2; // Walk1/Walk2
  }

  const x = m.x - renderSize / 2;
  const y = m.y - renderSize;

  ctx.save();
  if (m.hitFlash) ctx.filter = 'brightness(2.1) saturate(0.4)';
  if (m.direction === -1) {
    // Sprite ist nur als "R"-Blickrichtung vorhanden -> für Links spiegeln
    ctx.translate(m.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-m.x, 0);
  }
  ctx.drawImage(
    slimeImg,
    frameCol * SLIME_FRAME, colorRow * SLIME_FRAME, SLIME_FRAME, SLIME_FRAME,
    x, y, renderSize, renderSize
  );
  ctx.restore();

  // HP-Balken
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y - 10, renderSize, 5);
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(x, y - 10, renderSize * (m.hp / m.maxHp), 5);

  // Name
  ctx.fillStyle = '#fff';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Slime', m.x, y - 14);
}

const MOB_COLORS = {
  snail: { color: '#8b5a2b', w: 30, h: 24, name: 'Snail' },
  slime: { color: '#3498db', w: 28, h: 22, name: 'Blue Slime' },
  wolf: { color: '#7f8c8d', w: 40, h: 28, name: 'Wild Wolf' },
  stump: { color: '#654321', w: 36, h: 40, name: 'Stirge Stump' },
  zombie: { color: '#556b2f', w: 38, h: 36, name: 'Zombie Mushmom' },
  ghost: { color: '#e6e6fa', w: 32, h: 32, name: 'Restless Ghost' }
};

function drawPlayer(p, isMe) {
  const job = jobs[p.job] || { color: '#ccc' };
  const w = 26, h = 44;
  const x = p.x - w / 2, y = p.y - h;

  ctx.save();
  if (!p.alive) ctx.globalAlpha = 0.3;

  // Körper
  ctx.fillStyle = p.attackFlash ? '#ffffff' : job.color;
  ctx.fillRect(x, y, w, h);

  // Blickrichtung (kleines Dreieck)
  ctx.fillStyle = '#222';
  if (p.facing === 1) ctx.fillRect(x + w - 4, y + 10, 4, 6);
  else ctx.fillRect(x, y + 10, 4, 6);

  // Waffenanzeige
  if (p.equipment && p.equipment.weapon && items[p.equipment.weapon]) {
    ctx.fillStyle = items[p.equipment.weapon].color;
    const wx = p.facing === 1 ? x + w : x - 14;
    ctx.fillRect(wx, y + 12, 14, 5);
  }

  // Name + Level
  ctx.fillStyle = isMe ? '#f1c40f' : '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${p.name} Lv.${p.level}`, p.x, y - 8);

  // HP-Balken über anderen Spielern
  if (!isMe) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y - 6, w, 4);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x, y - 6, w * (p.hp / p.maxHp), 4);
  }

  ctx.restore();
}

function drawBuffs() {
  if (!myBuffs || myBuffs.length === 0) return;
  ctx.save();
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  myBuffs.forEach((b, i) => {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(canvas.width - 110, 12 + i * 22, 98, 18);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(b, canvas.width - 16, 12 + i * 22 + 13);
  });
  ctx.restore();
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
