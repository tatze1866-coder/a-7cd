// ====== Sound-Engine (Cute & Cozy UI Audio) ======
// Alle SFX vorab laden + über eine kleine Pool-Funktion abspielen, damit
// schnell hintereinander ausgelöste Sounds sich nicht gegenseitig abwürgen.
const SFX_FILES = {
  buttonPressed: 'Button_Pressed', cancel: 'Cancel',
  clickedIn: 'Clicked_In', clickedOut: 'Clicked_Out',
  confirm: 'Confirm', currency: 'Currency',
  dialogueBlip: 'Dialogue_Blip', dialogueExpression: 'Dialogue_Expression',
  failure: 'Failure', highlight: 'Highlight', lock: 'Lock',
  menuClose: 'Menu_Close', menuOpen: 'Menu_Open',
  purchase: 'Purchase', sell: 'Sell', success: 'Success',
  unlock: 'Unlock', warning: 'Warning'
};
const sfxBuffers = {};
for (const key of Object.keys(SFX_FILES)) {
  const audio = new Audio(`assets/sfx/${SFX_FILES[key]}.mp3`);
  audio.preload = 'auto';
  audio.volume = 0.55;
  sfxBuffers[key] = audio;
}
let sfxMuted = false;
const lastPlayedAt = {};
function playSfx(key, { minGapMs = 60, volume } = {}) {
  if (sfxMuted) return;
  const base = sfxBuffers[key];
  if (!base) return;
  const now = performance.now();
  if (lastPlayedAt[key] && now - lastPlayedAt[key] < minGapMs) return; // Anti-Spam
  lastPlayedAt[key] = now;
  const node = base.cloneNode(); // eigene Instanz, damit überlappende Plays möglich sind
  node.volume = volume ?? base.volume;
  node.play().catch(() => {}); // Browser blockt Audio ggf. bis zur ersten Nutzerinteraktion
}

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
const ZOOM = 1.4; // Reinzoomen, damit die (jetzt kleinere) Map den Bildschirm füllt
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

// Spieler-Spritesheet (Satyr): 32px Frames, Reihe 0 = Idle (6 Frames), Reihe 1 = Walk (8 Frames), nur R-Facing (L wird gespiegelt)
const PLAYER_FRAME = 32;
const PLAYER_IDLE_ROW = 0;
const PLAYER_IDLE_FRAMES = 6;
const PLAYER_WALK_ROW = 1;
const PLAYER_WALK_FRAMES = 8;
// Angriffs-Animation: Reihe 9 = Aufladen/Zauber wirken (10 Frames), Reihe 10 = Entladen/Ausklingen (10 Frames)
const PLAYER_ATTACK_ROW_A = 9;
const PLAYER_ATTACK_ROW_B = 10;
const PLAYER_ATTACK_FRAMES = 10;
const ATTACK_ANIM_MS = 450; // muss zur Server-Konstante ATTACK_ANIM_MS passen
const attackAnims = {}; // playerId -> { start, wasAttacking }
const playerImg = new Image();
let playerImgLoaded = false;
playerImg.onload = () => { playerImgLoaded = true; };
playerImg.src = 'assets/player-sheet.png';

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
  playSfx('confirm', { minGapMs: 0 });
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
      playSfx('dialogueExpression', { minGapMs: 0 });
      break;
    case 'chat':
      addChatLine(msg.name, msg.text);
      if (msg.name === 'System' && /ist jetzt Level/.test(msg.text)) {
        playSfx('success', { minGapMs: 0 }); // Levelup-Broadcast im Chat
      } else if (msg.name !== 'System') {
        playSfx('dialogueBlip');
      }
      break;
    case 'notice':
      showPopup(msg.text);
      playSfx(noticeSfxFor(msg.text), { minGapMs: 0 });
      break;
    case 'kill':
      let txt = `+${msg.exp} EXP  +${msg.gold}💰`;
      if (msg.drops.length) txt += `  [${msg.drops.map(d => items[d]?.name || d).join(', ')}]`;
      showPopup(txt);
      playSfx('currency');
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
  const k = e.key.toLowerCase();
  if (k === 'q') sendAction({ type: 'attack' });
  if (k === 'w') sendAction({ type: 'skill', key: firstSkillKey(0) });
  if (k === 'e') sendAction({ type: 'skill', key: firstSkillKey(1) });
  if (k === 'r') sendAction({ type: 'skill', key: firstSkillKey(2) });
  if (k === 'i') togglePanel('inventoryPanel');
  if (k === 'j') togglePanel('jobPanel');
  if (k === 'k') togglePanel('shopPanel');
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
    up: !!keys['arrowup'] || !!keys[' ']
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
let wasAlive = true;
function updateHud() {
  const me = players.find(p => p.id === myId);
  if (!me) return;
  if (wasAlive && !me.alive) playSfx('warning', { minGapMs: 0 }); // gerade gestorben
  wasAlive = me.alive;
  document.getElementById('hudName').textContent = `${me.name}  Lv.${me.level}  ${jobs[me.job]?.name || ''}`;
  document.getElementById('hpBar').style.width = `${(me.hp / me.maxHp) * 100}%`;
  document.getElementById('hpText').textContent = `${me.hp}/${me.maxHp}`;
  document.getElementById('mpBar').style.width = `${(me.mp / me.maxMp) * 100}%`;
  document.getElementById('mpText').textContent = `${me.mp}/${me.maxMp}`;
  document.getElementById('expBar').style.width = `${(me.exp / me.expNeeded) * 100}%`;
  document.getElementById('expText').textContent = `${me.exp}/${me.expNeeded}`;
  document.getElementById('hudGold').lastChild.textContent = me.gold;
}

// Ordnet Server-Textmeldungen (type: 'notice') dem passenden SFX zu, da der
// Server aktuell keinen eigenen Grund-Typ mitschickt, nur den Anzeigetext.
function noticeSfxFor(text) {
  if (/erst ab Level/.test(text)) return 'lock';
  if (/^Du bist jetzt/.test(text)) return 'unlock';
  if (/Nicht genug Mana|Zu wenig Gold/.test(text)) return 'failure';
  return 'confirm'; // Heilung, Buff aktiviert, etc.
}

// ====== Panels ======
document.querySelectorAll('.closeBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById(btn.dataset.close).classList.add('hidden');
    playSfx('menuClose', { minGapMs: 0 });
  });
});
document.getElementById('slotInv').addEventListener('click', () => togglePanel('inventoryPanel'));
document.getElementById('slotJob').addEventListener('click', () => togglePanel('jobPanel'));
document.getElementById('slotShop').addEventListener('click', () => togglePanel('shopPanel'));
document.querySelectorAll('.skillSlot').forEach(el => {
  el.addEventListener('mouseenter', () => playSfx('highlight', { minGapMs: 150, volume: 0.3 }));
});

function togglePanel(id) {
  const el = document.getElementById(id);
  const willOpen = el.classList.contains('hidden');
  el.classList.toggle('hidden');
  playSfx(willOpen ? 'menuOpen' : 'menuClose', { minGapMs: 0 });
  if (willOpen && id === 'inventoryPanel') renderInventoryPanel();
  if (willOpen && id === 'jobPanel') renderJobPanel();
  if (willOpen && id === 'shopPanel') renderShopPanel();
}

function buildSkillBar() {
  // Skillnamen werden dynamisch aktualisiert sobald der Job feststeht (siehe updateHud/render loop)
}

function refreshSkillLabels() {
  const me = players.find(p => p.id === myId);
  if (!me) return;
  const job = jobs[me.job];
  const jobKeys = job && job.skills ? Object.keys(job.skills) : [];
  const slot1 = document.getElementById('slot1');
  const slot2 = document.getElementById('slot2');
  const slot3 = document.getElementById('slot3');
  slot1.lastChild.textContent = jobKeys[0] ? job.skills[jobKeys[0]].name : '—';
  slot2.lastChild.textContent = jobKeys[1] ? job.skills[jobKeys[1]].name : '—';
  slot3.lastChild.textContent = jobKeys[2] ? job.skills[jobKeys[2]].name : '—';
}

function renderInventoryPanel() {
  const me = players.find(p => p.id === myId);
  document.getElementById('equipWeapon').innerHTML =
    `Waffe<br>${equipLabel('weapon')}${me && me.equipment.weapon ? '<div class="itemActions"><button data-unequip="weapon">Ausziehen</button></div>' : ''}`;
  document.getElementById('equipArmor').innerHTML =
    `Rüstung<br>${equipLabel('armor')}${me && me.equipment.armor ? '<div class="itemActions"><button data-unequip="armor">Ausziehen</button></div>' : ''}`;
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
    card.addEventListener('mouseenter', () => playSfx('highlight', { minGapMs: 150, volume: 0.3 }));
    grid.appendChild(card);
  }
  grid.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { sendAction({ type: 'useItem', item: b.dataset.use }); playSfx('confirm', { minGapMs: 0 }); });
  grid.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => { sendAction({ type: 'equip', item: b.dataset.equip }); playSfx('clickedIn', { minGapMs: 0 }); });
  grid.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { sendAction({ type: 'sell', item: b.dataset.sell, qty: 1 }); playSfx('sell', { minGapMs: 0 }); });
  document.querySelectorAll('[data-unequip]').forEach(b => b.onclick = () => { sendAction({ type: 'unequip', slot: b.dataset.unequip }); playSfx('clickedOut', { minGapMs: 0 }); renderInventoryPanel(); });
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
    card.addEventListener('mouseenter', () => playSfx('highlight', { minGapMs: 150, volume: 0.3 }));
    card.onclick = () => sendAction({ type: 'chooseJob', job: key }); // Sound kommt über die 'notice'-Antwort (unlock/lock)
    grid.appendChild(card);
  }
}

function renderShopPanel() {
  const me = players.find(p => p.id === myId);
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  for (const itemId of shopList) {
    const def = items[itemId];
    if (!def) continue;
    const owned = me && me.job && def.jobReq && def.jobReq !== me.job;
    const card = document.createElement('div');
    card.className = 'shopItem';
    card.innerHTML = `<div class="itemSwatch" style="background:${def.color || '#888'}"></div>${def.name}<br><small>${def.price}💰${owned ? ` · nur ${jobs[def.jobReq]?.name || def.jobReq}` : ''}</small><div class="itemActions"><button data-buy="${itemId}">Kaufen</button></div>`;
    card.addEventListener('mouseenter', () => playSfx('highlight', { minGapMs: 150, volume: 0.3 }));
    grid.appendChild(card);
  }
  grid.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    const def = items[b.dataset.buy];
    const meNow = players.find(p => p.id === myId);
    if (def && meNow && meNow.gold < def.price) { playSfx('failure', { minGapMs: 0 }); return; }
    sendAction({ type: 'buy', item: b.dataset.buy });
    playSfx('purchase', { minGapMs: 0 });
  });
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

  // Sichtbarer Weltausschnitt unter Berücksichtigung des Zooms
  const viewW = canvas.width / ZOOM;
  const viewH = canvas.height / ZOOM;

  // Kamera folgt dem eigenen Spieler
  if (me) {
    camera.x = clamp(me.x - viewW / 2, 0, Math.max(0, map.worldWidth - viewW));
    camera.y = clamp(me.y - viewH / 2, 0, Math.max(0, map.worldHeight - viewH));
  }

  ctx.fillStyle = map.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(ZOOM, ZOOM);
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
  if (playerImgLoaded) { drawPlayerSprite(p, isMe); return; }

  // Fallback bevor das Sprite geladen ist
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

function drawPlayerSprite(p, isMe) {
  const renderSize = 48; // hochskaliert von 32px Quellgröße
  const now = performance.now();

  // Angriffs-Animation tracken (Übergang false->true = neuer Angriff gestartet)
  let anim = attackAnims[p.id];
  if (p.attackFlash) {
    if (!anim || !anim.active) {
      anim = attackAnims[p.id] = { start: now, active: true };
    }
  } else if (anim) {
    anim.active = false;
  }

  let row, frameCount, frameCol;
  const isWalking = Math.abs(p.vx || 0) > 0.05 && p.onGround;
  const attackElapsed = anim ? now - anim.start : Infinity;
  const isAttacking = attackElapsed < ATTACK_ANIM_MS;

  if (isAttacking) {
    const progress = attackElapsed / ATTACK_ANIM_MS; // 0..1 über beide Reihen (20 Frames)
    const globalFrame = Math.min(PLAYER_ATTACK_FRAMES * 2 - 1, Math.floor(progress * PLAYER_ATTACK_FRAMES * 2));
    row = globalFrame < PLAYER_ATTACK_FRAMES ? PLAYER_ATTACK_ROW_A : PLAYER_ATTACK_ROW_B;
    frameCol = globalFrame % PLAYER_ATTACK_FRAMES;
    frameCount = PLAYER_ATTACK_FRAMES;
  } else {
    row = isWalking ? PLAYER_WALK_ROW : PLAYER_IDLE_ROW;
    frameCount = isWalking ? PLAYER_WALK_FRAMES : PLAYER_IDLE_FRAMES;
    const speedMs = isWalking ? 100 : 220;
    frameCol = Math.floor(now / speedMs) % frameCount;
  }

  const x = p.x - renderSize / 2;
  const y = p.y - renderSize;

  ctx.save();
  if (!p.alive) ctx.globalAlpha = 0.3;

  if (p.facing === -1) {
    // Sprite ist nur als "R"-Blickrichtung vorhanden -> für Links spiegeln
    ctx.translate(p.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-p.x, 0);
  }
  ctx.drawImage(
    playerImg,
    frameCol * PLAYER_FRAME, row * PLAYER_FRAME, PLAYER_FRAME, PLAYER_FRAME,
    x, y, renderSize, renderSize
  );
  ctx.restore();

  // Waffenanzeige
  if (p.equipment && p.equipment.weapon && items[p.equipment.weapon]) {
    ctx.fillStyle = items[p.equipment.weapon].color;
    const wx = p.facing === 1 ? x + renderSize : x - 14;
    ctx.fillRect(wx, y + 20, 14, 5);
  }

  // Name + Level
  ctx.fillStyle = isMe ? '#f1c40f' : '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${p.name} Lv.${p.level}`, p.x, y - 8);

  // HP-Balken über anderen Spielern
  if (!isMe) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y - 6, renderSize, 4);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x, y - 6, renderSize * (p.hp / p.maxHp), 4);
  }
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
