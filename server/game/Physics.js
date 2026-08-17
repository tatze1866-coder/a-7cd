const GRAVITY = 0.9;
const MAX_FALL_SPEED = 22;
const ENTITY_HALF_WIDTH = 16;
const ENTITY_HEIGHT = 44;

// Wendet Gravity + Plattform-Kollision auf ein Entity mit x,y,vx,vy an.
// Plattformen sind "one-way": Kollision nur wenn man von oben kommt (fallend).
function applyPhysics(entity, platforms, worldWidth, worldHeight) {
  entity.vy = Math.min(entity.vy + GRAVITY, MAX_FALL_SPEED);

  entity.x += entity.vx;
  entity.y += entity.vy;

  // Weltgrenzen
  if (entity.x < ENTITY_HALF_WIDTH) entity.x = ENTITY_HALF_WIDTH;
  if (entity.x > worldWidth - ENTITY_HALF_WIDTH) entity.x = worldWidth - ENTITY_HALF_WIDTH;

  entity.onGround = false;

  const feetY = entity.y;
  const prevFeetY = feetY - entity.vy;

  for (const p of platforms) {
    const withinX = entity.x + ENTITY_HALF_WIDTH * 0.6 > p.x && entity.x - ENTITY_HALF_WIDTH * 0.6 < p.x + p.w;
    if (!withinX) continue;

    // Fällt von oben durch die Plattformoberkante
    if (entity.vy >= 0 && prevFeetY <= p.y + 2 && feetY >= p.y) {
      entity.y = p.y;
      entity.vy = 0;
      entity.onGround = true;
    }
  }

  // Bodenlose Tiefe -> zurück zum Spawn (Fallschutz)
  if (entity.y > worldHeight + 100) {
    entity.y = 300;
    entity.x = 100;
    entity.vy = 0;
  }
}

module.exports = { applyPhysics, GRAVITY, ENTITY_HALF_WIDTH, ENTITY_HEIGHT };
