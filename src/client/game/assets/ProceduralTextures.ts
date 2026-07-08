import Phaser from 'phaser';

export const PROCEDURAL_TEXTURE_KEYS = {
  dicePickup: 'proc-dice-pickup',
  bulletPistol: 'proc-bullet-pistol',
  bulletRevolver: 'proc-bullet-revolver',
  bulletShotgun: 'proc-bullet-shotgun',
  bulletMinigun: 'proc-bullet-minigun',
  bulletMissile: 'proc-bullet-missile',
  trailPistol: 'proc-trail-pistol',
  trailRevolver: 'proc-trail-revolver',
  trailMinigun: 'proc-trail-minigun',
  trailShotgun: 'proc-trail-shotgun',
  missileTrail: 'proc-missile-trail',
  beamFlash: 'proc-beam-flash',
  beamSegment: 'proc-beam-segment',
  beamCore: 'proc-beam-core',
  beamSpark: 'proc-beam-spark',
  railFlash: 'proc-rail-flash',
  railCore: 'proc-rail-core',
  explosion: 'proc-explosion',
} as const;

function drawDicePickup(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#f0f0f8';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  ctx.fillStyle = '#111';
  const dot = size * 0.12;
  const positions = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.5, 0.5],
    [0.25, 0.75],
    [0.75, 0.75],
  ];
  for (const [px, py] of positions) {
    ctx.beginPath();
    ctx.arc(px * size, py * size, dot, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPistolBullet(ctx: CanvasRenderingContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx - size * 0.08, cy - size * 0.08, 0, cx, cy, size * 0.46);
  grad.addColorStop(0, 'rgba(255,255,220,1)');
  grad.addColorStop(0.32, 'rgba(255,215,90,1)');
  grad.addColorStop(0.68, 'rgba(220,165,45,0.95)');
  grad.addColorStop(1, 'rgba(150,105,30,0.75)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(cx - size * 0.1, cy - size * 0.1, size * 0.11, 0, Math.PI * 2);
  ctx.fill();
}

function drawRevolverBullet(ctx: CanvasRenderingContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  ctx.fillStyle = 'rgba(55,35,18,0.95)';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createRadialGradient(cx - size * 0.1, cy - size * 0.1, 0, cx, cy, size * 0.42);
  grad.addColorStop(0, 'rgba(255,240,180,1)');
  grad.addColorStop(0.35, 'rgba(255,200,80,1)');
  grad.addColorStop(0.72, 'rgba(210,145,45,0.95)');
  grad.addColorStop(1, 'rgba(160,100,30,0.85)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.beginPath();
  ctx.arc(cx - size * 0.08, cy - size * 0.1, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawShotgunPellet(ctx: CanvasRenderingContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.48);
  grad.addColorStop(0, 'rgba(255,255,220,1)');
  grad.addColorStop(0.28, 'rgba(255,180,70,1)');
  grad.addColorStop(0.62, 'rgba(255,110,35,0.9)');
  grad.addColorStop(1, 'rgba(180,50,20,0.35)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
  ctx.fill();
}

function drawMinigunBullet(ctx: CanvasRenderingContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx - size * 0.08, cy - size * 0.08, 0, cx, cy, size * 0.48);
  grad.addColorStop(0, 'rgba(255,255,210,1)');
  grad.addColorStop(0.3, 'rgba(255,220,90,1)');
  grad.addColorStop(0.65, 'rgba(255,165,45,0.95)');
  grad.addColorStop(1, 'rgba(200,95,25,0.5)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.arc(cx - size * 0.1, cy - size * 0.1, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawMissile(ctx: CanvasRenderingContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  ctx.fillStyle = 'rgba(90,90,100,0.9)';
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.42, cy);
  ctx.lineTo(cx - size * 0.1, cy - size * 0.18);
  ctx.lineTo(cx - size * 0.38, cy);
  ctx.lineTo(cx - size * 0.1, cy + size * 0.18);
  ctx.closePath();
  ctx.fill();
  const grad = ctx.createRadialGradient(cx - size * 0.05, cy, 0, cx, cy, size * 0.42);
  grad.addColorStop(0, 'rgba(255,245,210,1)');
  grad.addColorStop(0.35, 'rgba(255,130,50,0.95)');
  grad.addColorStop(0.72, 'rgba(210,40,30,0.88)');
  grad.addColorStop(1, 'rgba(120,20,20,0.35)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx - size * 0.02, cy, size * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(cx - size * 0.1, cy - size * 0.08, size * 0.09, 0, Math.PI * 2);
  ctx.fill();
}

function drawSoftTrail(ctx: CanvasRenderingContext2D, size: number, inner: string, outer: string): void {
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.4, outer);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawMissileTrail(ctx: CanvasRenderingContext2D, size: number): void {
  drawSoftTrail(ctx, size, 'rgba(255,220,140,0.95)', 'rgba(255,130,50,0.75)');
}

function drawBeamFlash(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(200,255,255,1)');
  grad.addColorStop(0.25, 'rgba(120,220,255,0.95)');
  grad.addColorStop(0.75, 'rgba(120,220,255,0.35)');
  grad.addColorStop(1, 'rgba(120,220,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawBeamSegment(ctx: CanvasRenderingContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.22, 'rgba(210,255,255,1)');
  grad.addColorStop(0.5, 'rgba(100,220,255,0.92)');
  grad.addColorStop(0.78, 'rgba(40,160,255,0.65)');
  grad.addColorStop(1, 'rgba(20,120,255,0.15)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBeamCore(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(180,240,255,0.55)');
  grad.addColorStop(0.5, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(180,240,255,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(240,255,255,1)';
  ctx.fillRect(w * 0.22, h * 0.08, w * 0.56, h * 0.84);
}

function drawBeamSpark(ctx: CanvasRenderingContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(200,255,255,0.95)');
  grad.addColorStop(0.55, 'rgba(80,200,255,0.7)');
  grad.addColorStop(1, 'rgba(40,140,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(220,255,255,0.95)';
  ctx.lineWidth = 1.2;
  const arm = size * 0.38;
  ctx.beginPath();
  ctx.moveTo(cx - arm, cy);
  ctx.lineTo(cx + arm, cy);
  ctx.moveTo(cx, cy - arm);
  ctx.lineTo(cx, cy + arm);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(140,220,255,0.75)';
  ctx.lineWidth = 0.9;
  const diag = size * 0.28;
  ctx.beginPath();
  ctx.moveTo(cx - diag, cy - diag);
  ctx.lineTo(cx + diag, cy + diag);
  ctx.moveTo(cx + diag, cy - diag);
  ctx.lineTo(cx - diag, cy + diag);
  ctx.stroke();
}

function drawRailFlash(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(120,50,220,0.25)');
  grad.addColorStop(0.12, 'rgba(180,90,255,0.9)');
  grad.addColorStop(0.5, 'rgba(255,240,255,1)');
  grad.addColorStop(0.88, 'rgba(180,90,255,0.9)');
  grad.addColorStop(1, 'rgba(120,50,220,0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(w * 0.3, 0, w * 0.4, h);
}

function drawRailCore(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.5, 'rgba(255,255,255,1)');
  grad.addColorStop(0.8, 'rgba(255,255,255,0.95)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawExplosion(ctx: CanvasRenderingContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 0.48);
  grad.addColorStop(0, 'rgba(255,240,180,1)');
  grad.addColorStop(0.35, 'rgba(255,120,40,0.85)');
  grad.addColorStop(0.7, 'rgba(255,60,20,0.4)');
  grad.addColorStop(1, 'rgba(255,60,20,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
  ctx.fill();
}

function addCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  scene.textures.addCanvas(key, canvas);
}

export function registerProceduralTextures(scene: Phaser.Scene): void {
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.dicePickup, 32, 32, (ctx) =>
    drawDicePickup(ctx, 32),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.bulletPistol, 8, 8, (ctx) =>
    drawPistolBullet(ctx, 8),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.bulletRevolver, 10, 10, (ctx) =>
    drawRevolverBullet(ctx, 10),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.bulletShotgun, 7, 7, (ctx) =>
    drawShotgunPellet(ctx, 7),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.bulletMinigun, 7, 7, (ctx) =>
    drawMinigunBullet(ctx, 7),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.bulletMissile, 12, 12, (ctx) =>
    drawMissile(ctx, 12),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.trailPistol, 6, 6, (ctx) =>
    drawSoftTrail(ctx, 6, 'rgba(255,240,160,0.95)', 'rgba(255,190,70,0.55)'),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.trailRevolver, 8, 8, (ctx) =>
    drawSoftTrail(ctx, 8, 'rgba(255,210,120,0.95)', 'rgba(255,140,50,0.6)'),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.trailMinigun, 5, 5, (ctx) =>
    drawSoftTrail(ctx, 5, 'rgba(255,230,130,0.95)', 'rgba(255,150,40,0.5)'),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.trailShotgun, 8, 8, (ctx) =>
    drawSoftTrail(ctx, 8, 'rgba(255,200,120,0.9)', 'rgba(200,90,40,0.45)'),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.missileTrail, 8, 8, (ctx) =>
    drawMissileTrail(ctx, 8),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.beamFlash, 4, 64, (ctx) =>
    drawBeamFlash(ctx, 4, 64),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.beamSegment, 16, 16, (ctx) =>
    drawBeamSegment(ctx, 16),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.beamCore, 32, 6, (ctx) =>
    drawBeamCore(ctx, 32, 6),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.beamSpark, 8, 8, (ctx) =>
    drawBeamSpark(ctx, 8),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.railFlash, 200, 8, (ctx) =>
    drawRailFlash(ctx, 200, 8),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.railCore, 200, 4, (ctx) =>
    drawRailCore(ctx, 200, 4),
  );
  addCanvasTexture(scene, PROCEDURAL_TEXTURE_KEYS.explosion, 64, 64, (ctx) =>
    drawExplosion(ctx, 64),
  );
}
