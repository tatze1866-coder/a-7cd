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

// ====== Hintergrundmusik pro Map (Loop) ======
const MUSIC_TRACKS = {
  henesys: 'assets/music/henesys_ambient.mp3'
  // weitere Maps: kerning/sleepywood etc. hier ergänzen, sobald Tracks da sind
};
const MUSIC_VOLUME = 0.35;
const MUSIC_FADE_MS = 800;
let currentMusic = null;   // { audio, mapId }
let musicFadeTimer = null;

function updateMusicForMap(mapId) {
  const track = MUSIC_TRACKS[mapId];
  if (currentMusic && currentMusic.mapId === mapId) return; // schon richtig
  stopMusic();
  if (!track) return;
  const audio = new Audio(track);
  audio.loop = true;
  audio.volume = 0;
  audio.play().catch(() => {}); // ggf. blockiert bis zur ersten Nutzerinteraktion
  currentMusic = { audio, mapId };
  fadeMusic(audio, 0, MUSIC_VOLUME);
}

function stopMusic() {
  if (!currentMusic) return;
  const { audio } = currentMusic;
  currentMusic = null;
  fadeMusic(audio, audio.volume, 0, () => { audio.pause(); });
}

function fadeMusic(audio, from, to, onDone) {
  clearInterval(musicFadeTimer);
  const steps = 16;
  let i = 0;
  audio.volume = from;
  musicFadeTimer = setInterval(() => {
    i++;
    audio.volume = from + (to - from) * (i / steps);
    if (i >= steps) {
      clearInterval(musicFadeTimer);
      audio.volume = to;
      if (onDone) onDone();
    }
  }, MUSIC_FADE_MS / steps);
}

// ====== Skill-Effekte (Pixel-FX-Sheets, 192x64 = 6 Spalten x 2 Reihen à 32px) ======
const FX_KEYS = [
  'fx_warrior_slash', 'fx_warrior_rage', 'fx_warrior_cleave', 'fx_warrior_charge', 'fx_warrior_meteor',
  'fx_bow_doubleshot', 'fx_bow_focus', 'fx_bow_snipe', 'fx_bow_rain', 'fx_bow_grasp',
  'fx_thief_lucky7', 'fx_thief_haste', 'fx_thief_backstab', 'fx_thief_shadowveil', 'fx_thief_assassinate',
  'fx_priest_bolt', 'fx_priest_heal', 'fx_priest_bless', 'fx_priest_comet', 'fx_priest_sanctuary'
];
const FX_COLS = 6, FX_ROWS = 2, FX_FRAME_SRC = 32, FX_FRAME_MS = 45, FX_RENDER_SIZE = 64;
const fxImages = {};
for (const key of FX_KEYS) {
  const img = new Image();
  img.src = `assets/fx/${key}.png`;
  fxImages[key] = img;
}
let activeEffects = []; // { fx, x, y, born }

function spawnSkillFx(fx, x, y) {
  if (!fxImages[fx]) return;
  activeEffects.push({ fx, x, y, born: performance.now() });
}

function drawEffects() {
  const now = performance.now();
  const totalFrames = FX_COLS * FX_ROWS;
  activeEffects = activeEffects.filter(e => now - e.born < totalFrames * FX_FRAME_MS);
  for (const e of activeEffects) {
    const img = fxImages[e.fx];
    if (!img || !img.complete) continue;
    const elapsed = now - e.born;
    const frame = Math.min(totalFrames - 1, Math.floor(elapsed / FX_FRAME_MS));
    const col = frame % FX_COLS;
    const row = Math.floor(frame / FX_COLS);
    ctx.drawImage(
      img,
      col * FX_FRAME_SRC, row * FX_FRAME_SRC, FX_FRAME_SRC, FX_FRAME_SRC,
      e.x - FX_RENDER_SIZE / 2, e.y - FX_RENDER_SIZE / 2, FX_RENDER_SIZE, FX_RENDER_SIZE
    );
  }
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
let prevPlayers = [];  // vorheriger State-Snapshot (für Interpolation zwischen Server-Ticks)
let prevMobs = [];
let lastStateAt = 0;
let stateIntervalMs = 50;
let suppressInterp = true;
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

// Mossy-Sprites für Maps mit useMossyTiles (Level 2: hollow-knight-artiger Moos-Schacht)
const MOSSY_KEYS = [
  'platform_bar_a', 'platform_bar_b', 'platform_bar_c', 'platform_bar_wide', 'platform_round',
  'hanging_vine_a', 'hanging_vine_b', 'hanging_moss_a',
  'boulder_a', 'boulder_b', 'boulder_c', 'spikevine_a', 'spikevine_b',
  'hill_bg_a', 'hill_bg_b', 'hill_wall_a', 'hill_wall_b'
];
const mossyImages = {};
for (const key of MOSSY_KEYS) {
  const img = new Image();
  img.src = `assets/mossy/${key}.png`;
  mossyImages[key] = img;
}
const MOSSY_PLATFORM_SPRITES = ['platform_bar_a', 'platform_bar_b', 'platform_bar_c'];

// Hintergrundbilder pro Map (Panorama, per bgImage-Feld in maps.js referenziert)
const bgImages = {};
function getBgImage(path) {
  if (!path) return null;
  if (!bgImages[path]) {
    const img = new Image();
    img.src = path;
    bgImages[path] = img;
  }
  return bgImages[path];
}

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
      updateMusicForMap(currentMapId);
      break;
    case 'state': {
      const now = performance.now();
      if (suppressInterp) {
        // Frisch verbunden oder gerade Map gewechselt: nicht vom alten/leeren State aus interpolieren
        prevPlayers = msg.players;
        prevMobs = msg.mobs;
        lastStateAt = now;
        suppressInterp = false;
      } else {
        prevPlayers = players;
        prevMobs = mobs;
        stateIntervalMs = Math.max(16, Math.min(200, now - lastStateAt));
        lastStateAt = now;
      }
      players = msg.players;
      mobs = msg.mobs;
      updateHud();
      break;
    }
    case 'private':
      myInventory = msg.data.inventory;
      myBuffs = msg.data.buffs;
      renderInventoryPanel();
      break;
    case 'mapChange':
      currentMapId = msg.mapId;
      suppressInterp = true; // neue Map hat andere Koordinaten -> nicht vom alten State aus interpolieren
      showPopup(`→ ${maps[currentMapId].name}`);
      playSfx('dialogueExpression', { minGapMs: 0 });
      updateMusicForMap(currentMapId);
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
      spawnDamageNumber(msg.x, msg.y, msg.dmg, msg.crit);
      break;
    case 'skillFx':
      spawnSkillFx(msg.fx, msg.x, msg.y);
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
  if (k === 't') sendAction({ type: 'skill', key: firstSkillKey(3) });
  if (k === 'y') sendAction({ type: 'skill', key: firstSkillKey(4) });
  if (k === 'i') togglePanel('inventoryPanel');
  if (k === 'j') togglePanel('questPanel');
  if (k === 'k') togglePanel('skilltreePanel');
  if (k === 'c') togglePanel('characterPanel');
  if (k === 'l') togglePanel('jobPanel');
  if (k === 'h') togglePanel('shopPanel');
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
function spawnDamageNumber(x, y, dmg, crit) {
  dmgNumbers.push({ x, y, dmg, crit: !!crit, born: performance.now() });
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
document.getElementById('slotQuest').addEventListener('click', () => togglePanel('questPanel'));
document.getElementById('slotSkilltree').addEventListener('click', () => togglePanel('skilltreePanel'));
document.getElementById('slotChar').addEventListener('click', () => togglePanel('characterPanel'));
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
  if (willOpen && id === 'skilltreePanel') renderSkilltreePanel();
  if (willOpen && id === 'characterPanel') renderCharacterPanel();
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
  const slot4 = document.getElementById('slot4');
  const slot5 = document.getElementById('slot5');
  const slots = [slot1, slot2, slot3, slot4, slot5];
  slots.forEach((slotEl, i) => {
    const skillDef = jobKeys[i] ? job.skills[jobKeys[i]] : null;
    slotEl.lastChild.textContent = skillDef ? skillDef.name : '—';
    setSlotIcon(slotEl, skillDef && skillDef.icon);
  });
}

function setSlotIcon(slotEl, iconKey) {
  const iconDiv = slotEl.querySelector('.slotIcon');
  if (!iconDiv) return;
  if (iconKey) {
    iconDiv.style.backgroundImage = `url(assets/skillicons/${iconKey}.png)`;
    iconDiv.classList.add('hasIcon');
  } else {
    iconDiv.style.backgroundImage = '';
    iconDiv.classList.remove('hasIcon');
  }
}

function renderInventoryPanel() {
  const me = players.find(p => p.id === myId);
  document.getElementById('equipWeapon').innerHTML =
    `Waffe<br>${equipLabel('weapon')}${me && me.equipment.weapon ? '<div class="itemActions"><button data-unequip="weapon">Ausziehen</button></div>' : ''}`;
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
    card.innerHTML = `<div class="itemSwatch"${def.icon ? '' : ` style="background:${def.color || '#888'}"`}>${def.icon ? `<img src="assets/skillicons/${def.icon}.png" alt="">` : ''}</div>${def.name} x${entry.qty}<div class="itemActions">${actions}</div>`;
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
    card.innerHTML = `<div class="itemSwatch"${def.icon ? '' : ` style="background:${def.color || '#888'}"`}>${def.icon ? `<img src="assets/skillicons/${def.icon}.png" alt="">` : ''}</div>${def.name}<br><small>${def.price}💰${owned ? ` · nur ${jobs[def.jobReq]?.name || def.jobReq}` : ''}</small><div class="itemActions"><button data-buy="${itemId}">Kaufen</button></div>`;
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

// ====== Skillbaum ======
function renderSkilltreePanel() {
  const me = players.find(p => p.id === myId);
  const info = document.getElementById('skillPointsInfo');
  const grid = document.getElementById('skillTreeGrid');
  grid.innerHTML = '';
  if (!me || !me.job || me.job === 'beginner') {
    info.textContent = 'Wähle zuerst einen Job (ab Level 3), um Skills zu erlernen.';
    return;
  }
  const job = jobs[me.job];
  info.textContent = `Skillpunkte: ${me.skillPoints || 0}`;
  const skillLevels = me.skillLevels || {};
  for (const key of Object.keys(job.skills || {})) {
    const skill = job.skills[key];
    const lvl = skillLevels[key] || 0;
    const card = document.createElement('div');
    card.className = 'skillNode';
    const iconHtml = skill.icon ? `<img class="skillNodeIcon" src="assets/skillicons/${skill.icon}.png" alt="">` : '';
    card.innerHTML = `<div class="skillNodeHead">${iconHtml}<b>${skill.name}</b></div><small>Stufe ${lvl}/5 · +${lvl * 10}% Effekt</small>
      <div class="itemActions"><button data-skillup="${key}" ${(me.skillPoints || 0) > 0 && lvl < 5 ? '' : 'disabled'}>Punkt investieren</button></div>`;
    card.addEventListener('mouseenter', () => playSfx('highlight', { minGapMs: 150, volume: 0.3 }));
    grid.appendChild(card);
  }
  grid.querySelectorAll('[data-skillup]').forEach(b => b.onclick = () => {
    sendAction({ type: 'allocateSkill', key: b.dataset.skillup });
    playSfx('confirm', { minGapMs: 0 });
    setTimeout(renderSkilltreePanel, 80); // kurz warten bis der Server-State zurückkommt
  });
}

// ====== Charakter-Panel (Ausrüstung + Stats) ======
const EQUIP_SLOT_LABELS = {
  helmet: 'Hut', chest: 'Brustpanzer', gloves: 'Handschuhe', cape: 'Umhang',
  pants: 'Hose', shoes: 'Schuhe', ring1: 'Ring', ring2: 'Ring'
};
const STAT_LABELS = { str: 'STR', dex: 'DEX', int: 'INT', luk: 'LUK' };

function renderCharacterPanel() {
  const me = players.find(p => p.id === myId);
  if (!me) return;

  document.querySelectorAll('#characterPanel .equipSlot').forEach(el => {
    const slot = el.dataset.slot;
    const label = EQUIP_SLOT_LABELS[slot];
    const itemId = me.equipment[slot];
    const itemName = itemId && items[itemId] ? items[itemId].name : '—';
    el.innerHTML = `${label}<br>${itemName}${itemId ? '<div class="itemActions"><button data-unequipslot="' + slot + '">Ausziehen</button></div>' : ''}`;
  });
  document.querySelectorAll('#characterPanel [data-unequipslot]').forEach(b => b.onclick = (ev) => {
    ev.stopPropagation();
    sendAction({ type: 'unequip', slot: b.dataset.unequipslot });
    playSfx('clickedOut', { minGapMs: 0 });
  });

  const statsInfo = document.getElementById('statPointsInfo');
  statsInfo.textContent = `Freie Statpunkte: ${me.statPoints || 0}`;

  const stats = me.stats || { str: 0, dex: 0, int: 0, luk: 0 };
  for (const stat of Object.keys(STAT_LABELS)) {
    const row = document.querySelector(`#charStats .statRow[data-stat="${stat}"]`);
    if (!row) continue;
    row.querySelector('.statVal').textContent = stats[stat] ?? 0;
  }
  const hpRow = document.querySelector('#charStats .statRow[data-stat="hp"]');
  if (hpRow) hpRow.querySelector('.statVal').textContent = `${me.maxHp}`;

  document.querySelectorAll('#charStats .statPlus').forEach(b => {
    b.disabled = !(me.statPoints > 0);
    b.onclick = () => {
      sendAction({ type: 'allocateStat', stat: b.dataset.stat });
      playSfx('confirm', { minGapMs: 0 });
      setTimeout(renderCharacterPanel, 80);
    };
  });
}

// ====== Rendering ======
// Glättet die Positionen zwischen zwei Server-Ticks (Server läuft nur mit 20Hz,
// der Client rendert aber mit bis zu 60fps) -> ohne das wirkt jede Bewegung ruckelig/steif.
function interpolateEntities(current, prev) {
  if (!prev || !prev.length) return current;
  const prevById = new Map();
  for (const e of prev) prevById.set(e.id, e);
  const alpha = Math.max(0, Math.min(1.25, (performance.now() - lastStateAt) / stateIntervalMs));
  return current.map(e => {
    const pe = prevById.get(e.id);
    if (!pe) return e; // neu aufgetaucht (z.B. Mob gespawnt) -> sofort an Zielposition zeigen
    const dx = e.x - pe.x, dy = e.y - pe.y;
    // Große Sprünge (Respawn, Map-interner Teleport) nicht glätten, sondern hart setzen
    if (Math.abs(dx) > 200 || Math.abs(dy) > 200) return e;
    return { ...e, x: pe.x + dx * alpha, y: pe.y + dy * alpha };
  });
}

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
  const renderPlayers = interpolateEntities(players, prevPlayers);
  const renderMobs = interpolateEntities(mobs, prevMobs);
  const me = renderPlayers.find(p => p.id === myId);

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
  drawBackgroundImage(map);

  ctx.save();
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-camera.x, -camera.y);

  // Deko hinter den Plattformen (Schacht-Silhouette o.ä.)
  if (map.decorBack) for (const d of map.decorBack) drawDecor(d);

  // Plattformen
  for (const p of map.platforms) drawPlatform(p, map);

  // Deko vor den Plattformen (hängende Ranken, Findlinge, Dornranken)
  if (map.decorFront) for (const d of map.decorFront) drawDecor(d);

  // Portale
  ctx.fillStyle = 'rgba(120, 200, 255, 0.55)';
  for (const portal of map.portals) {
    ctx.fillRect(portal.x, portal.y - 60, portal.w, portal.h + 60);
  }

  // Mobs (nur der aktuellen Map, kommen bereits gefiltert vom Server)
  for (const m of renderMobs) drawMob(m);

  // Spieler (nur der aktuellen Map)
  for (const p of renderPlayers) drawPlayer(p, p.id === myId);

  // Skill-Effekte (über Mobs/Spielern)
  drawEffects();

  // Damage-Zahlen
  const now = performance.now();
  dmgNumbers = dmgNumbers.filter(d => now - d.born < 800);
  for (const d of dmgNumbers) {
    const t = (now - d.born) / 800;
    if (d.crit) {
      ctx.fillStyle = `rgba(255,210,60,${1 - t})`;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`-${d.dmg}!`, d.x, d.y - 55 - t * 34);
    } else {
      ctx.fillStyle = `rgba(255,80,80,${1 - t})`;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`-${d.dmg}`, d.x, d.y - 50 - t * 30);
    }
  }

  ctx.restore();

  // Buff-Anzeige oben rechts
  drawBuffs();
}

function drawBackgroundImage(map) {
  if (!map.bgImage) return;
  const img = getBgImage(map.bgImage);
  if (!img || !img.complete || !img.naturalWidth) return;
  const parallax = 0.35; // Panorama scrollt langsamer als die Welt -> Tiefenwirkung
  const scale = canvas.height / img.naturalHeight;
  const drawW = img.naturalWidth * scale;
  const offsetX = -((camera.x * parallax) % drawW);
  for (let x = offsetX - drawW; x < canvas.width; x += drawW) {
    ctx.drawImage(img, x, 0, drawW, canvas.height);
  }
}

function drawDecor(d) {
  const img = mossyImages[d.sprite];
  if (!img || !img.complete || !img.naturalWidth) return;
  ctx.drawImage(img, d.x, d.y, d.w, d.h);
}

function drawPlatform(p, map) {
  if (map && map.useMossyTiles) {
    drawMossyPlatform(p);
    return;
  }
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

// Level 2 (Mossy Hollow): Plattformen als organische Moos-Inseln statt Kachel-Raster.
// Dünne Ledges bekommen einen einzelnen Moos-Sprite überhängend über die Kante,
// die dicke Bodenplattform wird aus mehreren breiten Sprites nebeneinander gekachelt.
function drawMossyPlatform(p) {
  // Dunkler Unterbau, damit auch dicke Bodenplattformen ohne Lücken wirken
  ctx.fillStyle = '#0b120d';
  ctx.fillRect(p.x, p.y, p.w, p.h);

  const isGround = p.h >= 60;
  if (isGround) {
    const img = mossyImages['platform_bar_wide'];
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 4.47;
    const tileW = 480;
    const tileH = tileW / aspect;
    for (let x = p.x; x < p.x + p.w; x += tileW * 0.94) {
      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, x, p.y - tileH * 0.42, tileW, tileH);
      }
    }
    return;
  }

  const spriteKey = MOSSY_PLATFORM_SPRITES[Math.abs(Math.floor(p.x / 37)) % MOSSY_PLATFORM_SPRITES.length];
  const img = mossyImages[spriteKey];
  if (!img || !img.complete || !img.naturalWidth) return;
  const aspect = img.naturalWidth / img.naturalHeight;
  const w = p.w * 1.12;
  const h = w / aspect;
  const x = p.x + p.w / 2 - w / 2;
  const y = p.y - h * 0.5;
  ctx.drawImage(img, x, y, w, h);
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
