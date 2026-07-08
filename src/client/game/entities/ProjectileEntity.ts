import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import { Tile } from 'twopointfive-phaser-3/src/twopointfive/world/tile.ts';
import type Renderer from 'twopointfive-phaser-3/src/twopointfive/renderer/renderer.ts';
import type { EntityContext, ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import type { ProjectileCatalog } from '../assets/ProjectileAssets.ts';
import type { ProjectileVariant } from '../config/WeaponFireConfig.ts';
import {
  PROJECTILE_VARIANT_VISUAL,
  type ProjectileTrailProfile,
} from '../config/ProjectileVisualConfig.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import type EnemyEntity from './EnemyEntity.ts';
import type { InstantWeaponHandler } from '../systems/InstantWeaponHandler.ts';
import type { ProjectilePool } from '../systems/ProjectilePool.ts';
import type { RunSession } from '../systems/RunSession.ts';
import { isOutOfRange, bulletProjectileHitsEnemy } from '../systems/CombatHitUtils.ts';

const STASH_X = -9999;
const STASH_Y = -9999;

export interface ProjectileActivateParams {
  originX: number;
  originY: number;
  angle: number;
  speed: number;
  damage: number;
  variant: ProjectileVariant;
  owner: TPFEntity;
  aoeRadius?: number;
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

export default class ProjectileEntity extends TPFEntity {
  zIndex = 2;

  private readonly pool: ProjectilePool | null;
  private readonly catalog: ProjectileCatalog | null;
  private readonly session: RunSession | null;
  private readonly instantHandler: InstantWeaponHandler | null;
  private active = false;
  private ageMs = 0;
  private originX = 0;
  private originY = 0;
  private damage = 0;
  private owner: TPFEntity | null = null;
  private aoeRadius = 0;
  private getEnemies: (() => EnemyEntity[]) | null = null;
  private hitRadius = 4;
  private texW = 8;
  private texH = 8;
  private displayScale = 1;
  private flightAngle = 0;
  private trailProfile: ProjectileTrailProfile | null = null;
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
    this.pool = (settings?.projectilePool as ProjectilePool) ?? null;
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

  activate(params: ProjectileActivateParams): void {
    const image = this.catalog?.get(params.variant);
    if (!image || !this.context.renderer) return;

    const visual = PROJECTILE_VARIANT_VISUAL[params.variant];
    this.texW = visual.texW;
    this.texH = visual.texH;
    this.displayScale = visual.scale;
    this.flightAngle = params.angle;
    this.trailProfile = visual.trail.enabled ? visual.trail : null;
    this.trailImage = this.trailProfile
      ? (this.catalog?.getTrail(this.trailProfile.texture) ?? null)
      : null;

    this.clearTrail();
    this.lastTrailSpawnX = params.originX;
    this.lastTrailSpawnY = params.originY;

    this._killed = false;
    this.active = true;
    this.ageMs = 0;
    this.originX = params.originX;
    this.originY = params.originY;
    this.damage = params.damage;
    this.owner = params.owner;
    this.aoeRadius = params.aoeRadius ?? 0;
    this.getEnemies = params.getEnemies;
    this.hitRadius = visual.hitRadius;

    const halfW = (this.texW * this.displayScale) / 2;
    const halfH = (this.texH * this.displayScale) / 2;
    this.pos.x = params.originX - halfW;
    this.pos.y = params.originY - halfH;
    this.pos.z = 4;
    this.last.x = this.pos.x;
    this.last.y = this.pos.y;
    this.size = { x: this.texW * this.displayScale, y: this.texH * this.displayScale };

    this.vel.x = Math.cos(params.angle) * params.speed;
    this.vel.y = Math.sin(params.angle) * params.speed;
    this.vel.z = 0;

    this.animSheet = { image, width: this.texW, height: this.texH };
    this.tile = new Tile(image, 0, this.texW, this.texH, this.displayScale);
    this.tile.quad.setColor(visual.color);
    this.tile.quad.setAlpha(1);

    if (this.context.culledSectors) {
      this.context.culledSectors.moveEntity(this);
    }
    this.ensureInGameState();
    this.syncVisuals();

    if (this.trailProfile && this.trailImage) {
      this.spawnTrailSegment(params.originX, params.originY, this.pos.z);
    }
  }

  private ensureInGameState(): void {
    const gs = this.context.game;
    if (gs && !gs.entities.includes(this)) {
      gs.entities.push(this);
    }
  }

  private spawnTrailSegment(cx: number, cy: number, z: number): void {
    const profile = this.trailProfile;
    if (!profile || !this.trailImage || !this.context.renderer) return;

    const back = profile.backOffsetPx;
    const x = cx - Math.cos(this.flightAngle) * back;
    const y = cy - Math.sin(this.flightAngle) * back;
    const tile = new Tile(this.trailImage, 0, profile.size, profile.size, 1);
    tile.quad.setColor(profile.color);

    const seg: TrailSegment = { tile, x, y, z: z - 1, ageMs: 0, baseSize: profile.size };
    this.trailSegments.push(seg);
    this.syncTrailQuad(seg);

    while (this.trailSegments.length > profile.maxSegments) {
      const old = this.trailSegments.shift();
      if (old) old.tile.quad.setAlpha(0);
    }

    this.lastTrailSpawnX = cx;
    this.lastTrailSpawnY = cy;
  }

  private updateTrail(cx: number, cy: number, z: number, tick: number): void {
    const profile = this.trailProfile;
    if (!profile || !this.trailImage) return;

    if (Math.hypot(cx - this.lastTrailSpawnX, cy - this.lastTrailSpawnY) >= profile.spawnStepPx) {
      this.spawnTrailSegment(cx, cy, z);
    }

    const maxAge = profile.durationMs;
    this.trailSegments = this.trailSegments.filter((seg) => {
      seg.ageMs += tick * 1000;
      const life = maxAge > 0 ? Math.min(1, seg.ageMs / maxAge) : 1;
      const alpha = Math.max(0, 1 - life ** 2.8);
      const scale = 0.5 + (1 - life) * 0.55;
      const size = seg.baseSize * scale;
      seg.tile.quad.setAlpha(alpha);
      seg.tile.scale = scale;
      seg.tile.quad.setSize(size, size);
      this.syncTrailQuad(seg);
      if (life >= 1) {
        seg.tile.quad.setAlpha(0);
        return false;
      }
      return true;
    });
  }

  private syncTrailQuad(seg: TrailSegment): void {
    const camera = this.context.camera;
    const collisionMap = this.context.collisionMap;
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
    this.trailProfile = null;
    this.trailImage = null;
  }

  update(): void {
    if (this._killed || !this.active) return;

    const rawTick = this.context.tick ?? 1 / 60;
    const tick = this.session ? this.session.simTickSec(rawTick) : rawTick;
    if (tick <= 0) return;

    this.ageMs += tick * 1000;

    this.pos.x += this.vel.x * tick;
    this.pos.y += this.vel.y * tick;
    this.syncVisuals();

    const cx = this.pos.x + this.size.x / 2;
    const cy = this.pos.y + this.size.y / 2;
    this.updateTrail(cx, cy, this.pos.z, tick);

    if (
      isOutOfRange(this.originX, this.originY, cx, cy) ||
      this.ageMs >= RUN_GAME_CONFIG.projectileMaxLifetimeMs
    ) {
      this.pool?.release(this);
      return;
    }

    const enemies = this.getEnemies?.() ?? [];
    for (const enemy of enemies) {
      if (enemy._killed) continue;
      if (!bulletProjectileHitsEnemy(cx, cy, this.hitRadius, enemy)) continue;

      if (this.aoeRadius > 0 && this.instantHandler && this.owner) {
        this.instantHandler.applyAoe(cx, cy, this.aoeRadius, this.damage, this.owner, enemies);
      } else if (this.owner) {
        enemy.receiveDamage(this.damage, this.owner);
      }
      this.pool?.release(this);
      return;
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

    const w = this.animSheet.width * this.displayScale;
    const h = this.animSheet.height * this.displayScale;
    this.tile.scale = this.displayScale;
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
    const halfW = (this.animSheet.width * this.displayScale) / 2;
    const halfH = (this.animSheet.height * this.displayScale) / 2;
    tpos[0] = this.pos.x + halfW;
    tpos[2] = this.pos.y + halfH;
    const ts = collisionMap && 'tilesize' in collisionMap ? collisionMap.tilesize : 64;
    tpos[1] = this.pos.z - ts / 2 + (this.animSheet.height * this.displayScale) / 2;

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
