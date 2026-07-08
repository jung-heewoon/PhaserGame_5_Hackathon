import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import { Tile } from 'twopointfive-phaser-3/src/twopointfive/world/tile.ts';
import type Renderer from 'twopointfive-phaser-3/src/twopointfive/renderer/renderer.ts';
import type { EntityContext, ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import type { ProjectileCatalog } from '../assets/ProjectileAssets.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import type EnemyEntity from './EnemyEntity.ts';
import type { InstantWeaponHandler } from '../systems/InstantWeaponHandler.ts';
import type { HomingMissilePool } from '../systems/HomingMissilePool.ts';
import type { RunSession } from '../systems/RunSession.ts';
import {
  enemyCenter,
  findHomingTarget,
  isOutOfRange,
  projectileHitsEnemy,
} from '../systems/CombatHitUtils.ts';

const STASH_X = -9999;
const STASH_Y = -9999;
const TEX_W = 12;
const TEX_H = 12;
const DISPLAY_SCALE = 1.35;
/** proc-missile-trail 캔버스 원본 크기 — Tile UV는 이 값과 일치해야 함 */
const MISSILE_TRAIL_TEX = 8;

export interface HomingMissileActivateParams {
  originX: number;
  originY: number;
  spawnZ: number;
  aimAngle: number;
  damage: number;
  aoeRadius: number;
  owner: TPFEntity;
  ownerVelX: number;
  ownerVelY: number;
  getEnemies: () => EnemyEntity[];
}

interface TrailSegment {
  tile: Tile;
  x: number;
  y: number;
  z: number;
  ageMs: number;
  baseSize: number;
}

function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function turnToward(current: number, target: number, maxDelta: number): number {
  const delta = normalizeAngle(target - current);
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}

export default class HomingMissileEntity extends TPFEntity {
  zIndex = 2;

  private readonly pool: HomingMissilePool | null;
  private readonly catalog: ProjectileCatalog | null;
  private readonly session: RunSession | null;
  private readonly instantHandler: InstantWeaponHandler | null;
  private active = false;
  private ageMs = 0;
  private originX = 0;
  private originY = 0;
  private damage = 0;
  private aoeRadius = 0;
  private owner: TPFEntity | null = null;
  private getEnemies: (() => EnemyEntity[]) | null = null;
  private heading = 0;
  private speed = 0;
  private ownerSpeed = 0;
  private target: EnemyEntity | null = null;
  private initialTargetDist = 1;
  private baseZ = 4;
  private trailImage: ImageInfo | null = null;
  private trailSegments: TrailSegment[] = [];
  private lastTrailSpawnX = 0;
  private lastTrailSpawnY = 0;

  constructor(
    x: number,
    y: number,
    settings: Record<string, unknown> | null,
    context: Partial<EntityContext> | null,
  ) {
    super(x, y, settings, context);
    this.type = TPFEntity.TYPE.NONE;
    this.checkAgainst = TPFEntity.TYPE.NONE;
    this.collides = TPFEntity.COLLIDES.NEVER;
    this.dynamicLight = false;
    this.rotateToView = true;
    this.gravityFactor = 0;
    this.pool = (settings?.homingMissilePool as HomingMissilePool) ?? null;
    this.catalog = (settings?.projectileCatalog as ProjectileCatalog) ?? null;
    this.session = (settings?.session as RunSession) ?? null;
    this.instantHandler = (settings?.instantHandler as InstantWeaponHandler) ?? null;
  }

  isActive(): boolean {
    return this.active && !this._killed;
  }

  /** WorldScroller Y-band shift — pos는 shiftEntityY, origin·트레일은 여기서 동기화 */
  shiftWorldY(deltaY: number): void {
    this.originY += deltaY;
    this.lastTrailSpawnY += deltaY;
    for (const seg of this.trailSegments) {
      seg.y += deltaY;
      this.syncTrailQuad(seg);
    }
  }

  activate(params: HomingMissileActivateParams): void {
    const image = this.catalog?.get('missile');
    this.trailImage = this.catalog?.getMissileTrail() ?? null;
    if (!image || !this.context.renderer) return;

    const enemies = params.getEnemies();
    this.target = findHomingTarget(params.originX, params.originY, params.aimAngle, enemies);
    if (this.target) {
      const { x, y } = enemyCenter(this.target);
      this.initialTargetDist = Math.max(1, Math.hypot(x - params.originX, y - params.originY));
    } else {
      this.initialTargetDist = RUN_GAME_CONFIG.projectileMaxRange * 0.5;
    }

    this.clearTrail();

    this._killed = false;
    this.active = true;
    this.ageMs = 0;
    this.originX = params.originX;
    this.originY = params.originY;
    this.damage = params.damage;
    this.aoeRadius = params.aoeRadius;
    this.owner = params.owner;
    this.getEnemies = params.getEnemies;
    this.heading = params.aimAngle;
    this.baseZ = params.spawnZ;
    this.lastTrailSpawnX = params.originX;
    this.lastTrailSpawnY = params.originY;

    // 코스트 속도 = owner 속도 + 느린 드리프트 (플레이어를 앞질러 천천히 부양)
    this.ownerSpeed = Math.hypot(params.ownerVelX, params.ownerVelY);
    this.speed = this.ownerSpeed + RUN_GAME_CONFIG.missileCoastDriftSpeed;
    this.vel.x = Math.cos(this.heading) * this.speed;
    this.vel.y = Math.sin(this.heading) * this.speed;
    this.vel.z = 0;

    const scale = DISPLAY_SCALE;
    const halfW = (TEX_W * scale) / 2;
    const halfH = (TEX_H * scale) / 2;
    this.pos.x = params.originX - halfW;
    this.pos.y = params.originY - halfH;
    this.pos.z = this.baseZ;
    this.last.x = this.pos.x;
    this.last.y = this.pos.y;
    this.size = { x: TEX_W * scale, y: TEX_H * scale };

    this.animSheet = { image, width: TEX_W, height: TEX_H };
    this.tile = new Tile(image, 0, TEX_W, TEX_H, scale);
    this.tile.quad.setColor({ r: 1.18, g: 0.92, b: 0.82 });
    this.tile.quad.setAlpha(1);

    if (this.context.culledSectors) {
      this.context.culledSectors.moveEntity(this);
    }
    this.ensureInGameState();
    this.syncVisuals();
    this.spawnTrailSegment(params.originX, params.originY, this.baseZ);
  }

  /** 코스트 동안 살짝 떠올랐다가, 부스트 시작 후 목표 높이로 내려오는 로브 */
  private computeArcZ(): number {
    const coastMs = RUN_GAME_CONFIG.missileCoastMs;
    const pop = RUN_GAME_CONFIG.missileArcPopHeight;
    const descendMs = Math.max(1, RUN_GAME_CONFIG.missileArcDescendMs);

    if (this.ageMs <= coastMs) {
      const t = coastMs > 0 ? this.ageMs / coastMs : 1;
      const rise = Math.sin((t * Math.PI) / 2);
      return this.baseZ + rise * pop;
    }

    const dt = Math.min(1, (this.ageMs - coastMs) / descendMs);
    const fall = 1 - dt * dt;
    return this.baseZ + fall * pop;
  }

  private ensureInGameState(): void {
    const gs = this.context.game;
    if (gs && !gs.entities.includes(this)) {
      gs.entities.push(this);
    }
  }

  private refreshTarget(): void {
    const enemies = this.getEnemies?.() ?? [];
    if (this.target && !this.target._killed) return;
    const cx = this.pos.x + this.size.x / 2;
    const cy = this.pos.y + this.size.y / 2;
    this.target = findHomingTarget(cx, cy, this.heading, enemies);
    if (this.target) {
      const { x, y } = enemyCenter(this.target);
      this.initialTargetDist = Math.max(1, Math.hypot(x - cx, y - cy));
    }
  }

  private detonate(cx: number, cy: number): void {
    const enemies = this.getEnemies?.() ?? [];
    if (this.instantHandler && this.owner) {
      this.instantHandler.applyAoe(cx, cy, this.aoeRadius, this.damage, this.owner, enemies);
    }
    this.pool?.release(this);
  }

  private tryDetonateOnContact(cx: number, cy: number): boolean {
    const enemies = this.getEnemies?.() ?? [];
    const hitRadius = RUN_GAME_CONFIG.missileHomingHitRadius;

    for (const enemy of enemies) {
      if (enemy._killed) continue;
      if (!projectileHitsEnemy(cx, cy, hitRadius, enemy)) continue;
      const { x, y } = enemyCenter(enemy);
      this.detonate(x, y);
      return true;
    }
    return false;
  }

  private spawnTrailSegment(cx: number, cy: number, z: number): void {
    if (!this.trailImage || !this.context.renderer) return;

    const displaySize = RUN_GAME_CONFIG.missileTrailSize;
    const backOffset = 10;
    const x = cx - Math.cos(this.heading) * backOffset;
    const y = cy - Math.sin(this.heading) * backOffset;
    const tile = new Tile(this.trailImage, 0, MISSILE_TRAIL_TEX, MISSILE_TRAIL_TEX, 1);
    tile.quad.setColor({ r: 1.2, g: 0.9, b: 0.68 });
    tile.quad.setAlpha(1);
    tile.quad.setSize(displaySize, displaySize);

    const seg: TrailSegment = { tile, x, y, z: z - 2, ageMs: 0, baseSize: displaySize };
    this.trailSegments.push(seg);
    this.syncTrailQuad(seg);

    while (this.trailSegments.length > RUN_GAME_CONFIG.missileTrailMaxSegments) {
      const old = this.trailSegments.shift();
      if (old) old.tile.quad.setAlpha(0);
    }

    this.lastTrailSpawnX = cx;
    this.lastTrailSpawnY = cy;
  }

  private updateTrail(cx: number, cy: number, z: number, tick: number): void {
    const step = RUN_GAME_CONFIG.missileTrailSpawnStepPx;
    if (Math.hypot(cx - this.lastTrailSpawnX, cy - this.lastTrailSpawnY) >= step) {
      this.spawnTrailSegment(cx, cy, z);
    }

    const maxAge = RUN_GAME_CONFIG.missileTrailDurationMs;
    this.trailSegments = this.trailSegments.filter((seg) => {
      seg.ageMs += tick * 1000;
      const life = maxAge > 0 ? Math.min(1, seg.ageMs / maxAge) : 1;
      const alpha = Math.max(0, 1 - life ** 2.8);
      const scale = 0.55 + (1 - life) * 0.55;
      seg.tile.quad.setAlpha(alpha);
      seg.tile.scale = scale;
      seg.tile.quad.setSize(seg.baseSize * scale, seg.baseSize * scale);
      this.syncTrailQuad(seg);
      if (life >= 1) {
        seg.tile.quad.setAlpha(0);
        return false;
      }
      return true;
    });
  }

  private syncTrailQuad(seg: TrailSegment): void {
    const ctx = this.context;
    const camera = ctx.camera;
    const collisionMap = ctx.collisionMap;
    const size = seg.baseSize * seg.tile.scale;
    const tpos = seg.tile.quad.position;
    tpos[0] = seg.x;
    tpos[2] = seg.y;
    const ts = collisionMap && 'tilesize' in collisionMap ? collisionMap.tilesize : 64;
    tpos[1] = seg.z - ts / 2 + size / 2;

    if (this.rotateToView && camera) {
      seg.tile.quad.rotation[1] = camera.rotation[1];
      seg.tile.quad.rotation[2] = 0;
    }
    seg.tile.quad._dirty = true;
  }

  private clearTrail(): void {
    for (const seg of this.trailSegments) {
      seg.tile.quad.setAlpha(0);
    }
    this.trailSegments = [];
  }

  update(): void {
    if (this._killed || !this.active) return;

    const rawTick = this.context.tick ?? 1 / 60;
    const tick = this.session ? this.session.simTickSec(rawTick) : rawTick;
    if (tick <= 0) return;

    this.ageMs += tick * 1000;

    const boosting = this.ageMs >= RUN_GAME_CONFIG.missileCoastMs;

    if (boosting) {
      // 급추진 — 최고 속도까지 빠르게 가속
      this.speed = Math.min(
        RUN_GAME_CONFIG.missileHomingMaxSpeed,
        this.speed + RUN_GAME_CONFIG.missileBoostAccel * tick,
      );
    } else {
      // 코스트 — owner 속도 + 드리프트로 천천히 부양
      const coastSpeed = this.ownerSpeed + RUN_GAME_CONFIG.missileCoastDriftSpeed;
      this.speed += (coastSpeed - this.speed) * Math.min(1, tick * 8);
    }

    this.refreshTarget();

    const cxBefore = this.pos.x + this.size.x / 2;
    const cyBefore = this.pos.y + this.size.y / 2;

    if (this.target && !this.target._killed) {
      const { x: tx, y: ty } = enemyCenter(this.target);
      const desired = Math.atan2(ty - cyBefore, tx - cxBefore);
      const turnRate = boosting
        ? RUN_GAME_CONFIG.missileBoostTurnRateRad
        : RUN_GAME_CONFIG.missileCoastTurnRateRad;
      this.heading = turnToward(this.heading, desired, turnRate * tick);

      const distToTarget = Math.hypot(tx - cxBefore, ty - cyBefore);
      this.initialTargetDist = Math.max(this.initialTargetDist, distToTarget);
    }

    this.vel.x = Math.cos(this.heading) * this.speed;
    this.vel.y = Math.sin(this.heading) * this.speed;
    this.pos.x += this.vel.x * tick;
    this.pos.y += this.vel.y * tick;

    const cx = this.pos.x + this.size.x / 2;
    const cy = this.pos.y + this.size.y / 2;
    this.pos.z = this.computeArcZ();
    this.syncVisuals();
    this.updateTrail(cx, cy, this.pos.z, tick);

    if (this.tryDetonateOnContact(cx, cy)) return;

    if (
      isOutOfRange(this.originX, this.originY, cx, cy) ||
      this.ageMs >= RUN_GAME_CONFIG.missileHomingMaxLifetimeMs
    ) {
      this.detonate(cx, cy);
    }
  }

  draw(renderer?: Renderer): void {
    if (!this.isActive()) return;
    const r = renderer || this.context.renderer;
    if (!r) return;

    for (const seg of this.trailSegments) {
      seg.tile.draw(r);
    }
    if (this.tile) {
      this.tile.draw(r);
    }
  }

  finish(): void {
    this.active = false;
    this._killed = true;
    this.ageMs = 0;
    this.speed = 0;
    this.ownerSpeed = 0;
    this.heading = 0;
    this.target = null;
    this.baseZ = 4;
    this.vel.x = 0;
    this.vel.y = 0;
    this.vel.z = 0;
    this.getEnemies = null;
    this.owner = null;
    this.clearTrail();
    this.pos.x = STASH_X;
    this.pos.y = STASH_Y;
    this.pos.z = 0;
    this.last.x = STASH_X;
    this.last.y = STASH_Y;
    if (this.tile) {
      this.tile.quad.setAlpha(0);
    }
    this.tile = null;
  }

  private syncVisuals(): void {
    if (!this.tile || !this.animSheet) return;

    const scale = DISPLAY_SCALE;
    const w = this.animSheet.width * scale;
    const h = this.animSheet.height * scale;
    this.tile.scale = scale;
    this.tile.quad.setSize(w, h);

    if (this.rotateToView && this.context.camera) {
      this.tile.quad.rotation[1] = this.context.camera.rotation[1];
      this.tile.quad.rotation[2] = 0;
    }

    this.updateQuad();
  }

  updateQuad(): void {
    if (!this.tile || !this.animSheet) return;

    const ctx = this.context;
    const camera = ctx.camera;
    const collisionMap = ctx.collisionMap;
    const culledSectors = ctx.culledSectors;

    const tpos = this.tile.quad.position;
    const scale = DISPLAY_SCALE;
    const halfW = (this.animSheet.width * scale) / 2;
    const halfH = (this.animSheet.height * scale) / 2;
    tpos[0] = this.pos.x + halfW;
    tpos[2] = this.pos.y + halfH;
    const ts = collisionMap && 'tilesize' in collisionMap ? collisionMap.tilesize : 64;
    tpos[1] = this.pos.z - ts / 2 + (this.animSheet.height * scale) / 2;

    if (this.rotateToView && camera) {
      this.tile.quad.rotation[1] = camera.rotation[1];
      this.tile.quad.rotation[2] = 0;
    }
    this.tile.quad._dirty = true;

    if (
      !this._killed &&
      culledSectors &&
      (this.pos.x !== this.last.x || this.pos.y !== this.last.y)
    ) {
      culledSectors.moveEntity(this);
    }
  }
}
