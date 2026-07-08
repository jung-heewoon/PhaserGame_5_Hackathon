import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import { Tile } from 'twopointfive-phaser-3/src/twopointfive/world/tile.ts';
import type Renderer from 'twopointfive-phaser-3/src/twopointfive/renderer/renderer.ts';
import type { EntityContext, ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import type { BeamFlashCatalog, BeamFlashVariant } from '../assets/ProjectileAssets.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import type { BeamFlashPool } from '../systems/BeamFlashPool.ts';

const STASH_X = -9999;
const STASH_Y = -9999;

const BEAM_SEGMENT_TEX = 16;

const VARIANT_META: Record<
  BeamFlashVariant,
  { w: number; h: number; scale: number; durationMs: number }
> = {
  beam: { w: BEAM_SEGMENT_TEX, h: BEAM_SEGMENT_TEX, scale: 1, durationMs: RUN_GAME_CONFIG.beamFlashDurationMs },
  rail: { w: 200, h: 8, scale: 1, durationMs: RUN_GAME_CONFIG.railFlashDurationMs },
  explosion: { w: 64, h: 64, scale: 1.8, durationMs: RUN_GAME_CONFIG.explosionFlashDurationMs },
};

interface PathSegment {
  tile: Tile;
  centerX: number;
  centerY: number;
  visualW: number;
  visualH: number;
  baseAlpha: number;
}

interface SparkSegment {
  tile: Tile;
  centerX: number;
  centerY: number;
  visualSize: number;
  baseAlpha: number;
  flickerPhase: number;
  flickerSpeed: number;
}

type PathVariant = 'beam' | 'rail';

function computePathLifeEffect(pathVariant: PathVariant, ageMs: number, maxAgeMs: number): {
  alphaMul: number;
  scaleMul: number;
} {
  const t = maxAgeMs > 0 ? Math.min(1, ageMs / maxAgeMs) : 1;

  if (pathVariant === 'rail') {
    const appearEnd = 0.1;
    const holdEnd = 0.32;

    if (t < appearEnd) {
      const u = t / appearEnd;
      const eased = 1 - (1 - u) ** 2;
      return { alphaMul: eased, scaleMul: 0.35 + eased * 0.65 };
    }
    if (t < holdEnd) {
      return { alphaMul: 1, scaleMul: 1 };
    }

    const u = (t - holdEnd) / (1 - holdEnd);
    const shrink = Math.max(0, 1 - u ** 1.6);
    return { alphaMul: shrink, scaleMul: shrink };
  }

  const holdEnd = 0.55;
  if (t < holdEnd) {
    return { alphaMul: 1, scaleMul: 1 };
  }
  const u = (t - holdEnd) / (1 - holdEnd);
  return { alphaMul: Math.max(0.92, 1 - u ** 1.8), scaleMul: 1 };
}

export interface BeamFlashBeamParams {
  originX: number;
  originY: number;
  z: number;
  angle: number;
  length: number;
  width: number;
}

export interface BeamFlashRailParams {
  originX: number;
  originY: number;
  z: number;
  angle: number;
  length: number;
  bandWidth: number;
}

export default class BeamFlashEntity extends TPFEntity {
  zIndex = 3;

  private readonly pool: BeamFlashPool | null;
  private readonly catalog: BeamFlashCatalog | null;
  private active = false;
  private ageMs = 0;
  private maxAgeMs = 120;
  private texW = BEAM_SEGMENT_TEX;
  private texH = BEAM_SEGMENT_TEX;
  private displayScale = 1;
  private displayW = BEAM_SEGMENT_TEX;
  private displayH = BEAM_SEGMENT_TEX;
  private worldZ = 4;
  private segments: PathSegment[] = [];
  private sparks: SparkSegment[] = [];
  private pathMode = false;
  private pathVariant: PathVariant = 'beam';

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
    this.dynamicLight = true;
    this.rotateToView = true;
    this.gravityFactor = 0;
    this.pool = (settings?.beamFlashPool as BeamFlashPool) ?? null;
    this.catalog = (settings?.beamFlashCatalog as BeamFlashCatalog) ?? null;
  }

  isPlaying(): boolean {
    return this.active && !this._killed;
  }

  activate(worldX: number, worldY: number, z: number, variant: BeamFlashVariant): void {
    const image = this.catalog?.get(variant);
    if (!image || !this.context.renderer) return;

    this.pathMode = false;
    this.clearSegments();
    const meta = VARIANT_META[variant];
    this.texW = meta.w;
    this.texH = meta.h;
    this.displayScale = meta.scale;
    this.displayW = this.texW * this.displayScale;
    this.displayH = this.texH * this.displayScale;
    this.maxAgeMs = meta.durationMs;
    this.worldZ = z;

    this.setupSingleTile(image, worldX, worldY, this.displayW, this.displayH);
  }

  activateBeam(params: BeamFlashBeamParams): void {
    const image = this.catalog?.getBeamSegment();
    const coreImage = this.catalog?.getBeamCore();
    const sparkImage = this.catalog?.getBeamSpark();
    if (!image || !this.context.renderer) return;

    this.beginPathEffect(image, params.originX, params.originY, VARIANT_META.beam.durationMs, 'beam');
    this.texW = BEAM_SEGMENT_TEX;
    this.texH = BEAM_SEGMENT_TEX;

    const step = RUN_GAME_CONFIG.beamSegmentStepPx;
    const size = RUN_GAME_CONFIG.beamSegmentVisualSize;
    const glowScale = RUN_GAME_CONFIG.beamGlowScale;
    const coreH = RUN_GAME_CONFIG.beamCoreVisualH;
    const count = Math.max(1, Math.ceil(params.length / step));
    const dirX = Math.cos(params.angle);
    const dirY = Math.sin(params.angle);
    const perpX = -dirY;
    const perpY = dirX;

    for (let i = 0; i < count; i++) {
      const dist = (i + 0.5) * (params.length / count);
      const fade = 1 - (dist / params.length) * 0.08;
      const pulse = 0.9 + 0.1 * Math.sin(i * 0.9);
      const cx = params.originX + dirX * dist;
      const cy = params.originY + dirY * dist;
      const glowSize = size * glowScale * pulse;

      this.addSegment(image, BEAM_SEGMENT_TEX, BEAM_SEGMENT_TEX, cx, cy, glowSize, glowSize, fade * 0.92, {
        r: 1.05,
        g: 1.14,
        b: 1.32,
      });
      if (coreImage) {
        this.addSegment(
          coreImage,
          32,
          6,
          cx,
          cy,
          size * 0.5 * pulse,
          coreH,
          1,
          { r: 1.28, g: 1.32, b: 1.42 },
        );
      }
    }

    if (sparkImage) {
      this.spawnBeamSparks(
        sparkImage,
        params.originX,
        params.originY,
        params.length,
        dirX,
        dirY,
        perpX,
        perpY,
      );
    }

    this.finalizePathEffect(params.length, size);
  }

  private spawnBeamSparks(
    sparkImage: ImageInfo,
    originX: number,
    originY: number,
    length: number,
    dirX: number,
    dirY: number,
    perpX: number,
    perpY: number,
  ): void {
    const tex = RUN_GAME_CONFIG.beamSparkTexPx;
    const sparkStep = RUN_GAME_CONFIG.beamSparkStepPx;
    const spread = RUN_GAME_CONFIG.beamSparkSpreadPx;
    const baseSize = RUN_GAME_CONFIG.beamSparkSize;
    const count = Math.max(3, Math.ceil(length / sparkStep));

    for (let i = 0; i < count; i++) {
      const dist = Math.random() * length;
      const lane = (Math.random() - 0.5) * spread;
      const cx = originX + dirX * dist + perpX * lane;
      const cy = originY + dirY * dist + perpY * lane;
      const size = baseSize * (0.75 + Math.random() * 0.55);
      const tile = new Tile(sparkImage, 0, tex, tex, 1);
      tile.quad.setColor({ r: 1.2, g: 1.28, b: 1.38 });
      tile.quad.setAlpha(1);
      tile.quad.setSize(size, size);

      this.sparks.push({
        tile,
        centerX: cx,
        centerY: cy,
        visualSize: size,
        baseAlpha: 0.94 + Math.random() * 0.06,
        flickerPhase: Math.random() * Math.PI * 2,
        flickerSpeed: 0.018 + Math.random() * 0.022,
      });
    }
  }

  activateRail(params: BeamFlashRailParams): void {
    const image = this.catalog?.get('rail');
    const coreImage = this.catalog?.getRailCore();
    if (!image || !this.context.renderer) return;

    this.beginPathEffect(image, params.originX, params.originY, VARIANT_META.rail.durationMs, 'rail');
    this.texW = VARIANT_META.rail.w;
    this.texH = VARIANT_META.rail.h;

    const step = RUN_GAME_CONFIG.railSegmentStepPx;
    const count = Math.max(1, Math.ceil(params.length / step));
    const dirX = Math.cos(params.angle);
    const dirY = Math.sin(params.angle);
    const bandH = RUN_GAME_CONFIG.railSegmentVisualH;
    const coreH = RUN_GAME_CONFIG.railCoreVisualH;

    for (let i = 0; i < count; i++) {
      const dist = (i + 0.5) * (params.length / count);
      const fade = 1 - (dist / params.length) * 0.38;
      const pulse = 0.88 + 0.12 * Math.sin(i * 0.55);
      const cx = params.originX + dirX * dist;
      const cy = params.originY + dirY * dist;

      this.addSegment(image, VARIANT_META.rail.w, VARIANT_META.rail.h, cx, cy, params.bandWidth * pulse, bandH, fade * 0.95, {
        r: 1.18,
        g: 1.02,
        b: 1.32,
      });
      if (coreImage) {
        this.addSegment(coreImage, 200, 4, cx, cy, params.bandWidth * 0.42 * pulse, coreH, 1, {
          r: 1.35,
          g: 1.28,
          b: 1.45,
        });
      }
    }

    this.finalizePathEffect(params.length, params.bandWidth);
  }

  private beginPathEffect(
    image: ImageInfo,
    originX: number,
    originY: number,
    durationMs: number,
    pathVariant: PathVariant,
  ): void {
    this.clearSegments();
    this.pathMode = true;
    this.pathVariant = pathVariant;
    this.maxAgeMs = durationMs;
    this.worldZ = 4;

    this._killed = false;
    this.active = true;
    this.ageMs = 0;
    this.pos.x = originX;
    this.pos.y = originY;
    this.pos.z = this.worldZ;
    this.last.x = this.pos.x;
    this.last.y = this.pos.y;

    this.animSheet = { image, width: this.texW, height: this.texH };
  }

  private addSegment(
    image: ImageInfo,
    texW: number,
    texH: number,
    centerX: number,
    centerY: number,
    visualW: number,
    visualH: number,
    baseAlpha: number,
    color?: { r: number; g: number; b: number },
  ): void {
    const tile = new Tile(image, 0, texW, texH, 1);
    if (color) {
      tile.quad.setColor(color);
    } else if (this.pathVariant === 'beam') {
      tile.quad.setColor({ r: 1.15, g: 1.22, b: 1.35 });
    } else {
      tile.quad.setColor({ r: 1.2, g: 1.05, b: 1.35 });
    }
    tile.quad.setAlpha(baseAlpha);
    this.segments.push({ tile, centerX, centerY, visualW, visualH, baseAlpha });
  }

  private finalizePathEffect(length: number, span: number): void {
    if (this.segments.length === 0) return;

    this.size = { x: span, y: length };
    this.tile = this.segments[0]!.tile;

    if (this.context.culledSectors) {
      this.context.culledSectors.moveEntity(this);
    }
    this.ensureInGameState();
    this.syncSegmentQuads();
  }

  private setupSingleTile(
    image: ImageInfo,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
  ): void {
    this._killed = false;
    this.active = true;
    this.ageMs = 0;

    this.pos.x = centerX - width / 2;
    this.pos.y = centerY - height / 2;
    this.pos.z = this.worldZ;
    this.last.x = this.pos.x;
    this.last.y = this.pos.y;
    this.size = { x: width, y: height };

    this.animSheet = { image, width: this.texW, height: this.texH };
    this.tile = new Tile(image, 0, this.texW, this.texH, this.displayScale);
    this.tile.quad.setColor({ r: 1, g: 1, b: 1 });
    this.tile.quad.setAlpha(1);

    if (this.context.culledSectors) {
      this.context.culledSectors.moveEntity(this);
    }
    this.ensureInGameState();
    this.syncSingleQuad(1);
  }

  private ensureInGameState(): void {
    const gs = this.context.game;
    if (gs && !gs.entities.includes(this)) {
      gs.entities.push(this);
    }
  }

  update(): void {
    if (this._killed || !this.active) return;

    const tick = this.context.tick ?? 1 / 60;
    this.ageMs += tick * 1000;
    const life = computePathLifeEffect(this.pathVariant, this.ageMs, this.maxAgeMs);

    if (this.pathMode && this.segments.length > 0) {
      this.syncSegmentQuads();
    } else if (this.tile) {
      this.tile.quad.setAlpha(life.alphaMul);
      this.syncSingleQuad(life.alphaMul);
    }

    if (this.ageMs >= this.maxAgeMs) {
      this.pool?.release(this);
    }
  }

  draw(renderer?: Renderer): void {
    if (!this.isPlaying()) return;
    const r = renderer || this.context.renderer;
    if (!r) return;

    if (this.pathMode && this.segments.length > 0) {
      for (const seg of this.segments) {
        seg.tile.draw(r);
      }
      for (const spark of this.sparks) {
        spark.tile.draw(r);
      }
      return;
    }

    if (this.tile) {
      this.tile.draw(r);
    }
  }

  finish(): void {
    this.active = false;
    this._killed = true;
    this.ageMs = 0;
    this.pathMode = false;
    this.clearSegments();
    this.tile = null;
    this.animSheet = null;
    this.pos.x = STASH_X;
    this.pos.y = STASH_Y;
    this.pos.z = 0;
    this.last.x = STASH_X;
    this.last.y = STASH_Y;
  }

  private clearSegments(): void {
    for (const seg of this.segments) {
      seg.tile.quad.setAlpha(0);
    }
    this.segments = [];
    for (const spark of this.sparks) {
      spark.tile.quad.setAlpha(0);
    }
    this.sparks = [];
  }

  /** 투사체와 동일: 월드 XY 경로 + 낮은 z — TPF는 this.tile 필수 */
  private syncSegmentQuads(): void {
    const camera = this.context.camera;
    const collisionMap = this.context.collisionMap;
    const culledSectors = this.context.culledSectors;
    const ts = collisionMap && 'tilesize' in collisionMap ? collisionMap.tilesize : 64;
    const life = computePathLifeEffect(this.pathVariant, this.ageMs, this.maxAgeMs);

    for (const seg of this.segments) {
      const w = seg.visualW * life.scaleMul;
      const h = seg.visualH * life.scaleMul;
      const halfH = h / 2;

      seg.tile.scale = 1;
      seg.tile.quad.setSize(w, h);
      seg.tile.quad.setAlpha(seg.baseAlpha * life.alphaMul);

      const tpos = seg.tile.quad.position;
      tpos[0] = seg.centerX;
      tpos[2] = seg.centerY;
      tpos[1] = this.worldZ - ts / 2 + halfH;

      if (this.rotateToView && camera) {
        seg.tile.quad.rotation[1] = camera.rotation[1];
        seg.tile.quad.rotation[2] = 0;
      }
      seg.tile.quad._dirty = true;
    }

    for (const spark of this.sparks) {
      const flicker =
        0.88 +
        0.12 *
          Math.abs(
            Math.sin(this.ageMs * spark.flickerSpeed + spark.flickerPhase) *
              Math.cos(this.ageMs * spark.flickerSpeed * 1.7 + spark.flickerPhase * 0.6),
          );
      const size = spark.visualSize * life.scaleMul;
      const half = size / 2;

      spark.tile.quad.setSize(size, size);
      spark.tile.quad.setAlpha(spark.baseAlpha * life.alphaMul * flicker);

      const tpos = spark.tile.quad.position;
      tpos[0] = spark.centerX;
      tpos[2] = spark.centerY;
      tpos[1] = this.worldZ + 1 - ts / 2 + half;

      if (this.rotateToView && camera) {
        spark.tile.quad.rotation[1] = camera.rotation[1];
        spark.tile.quad.rotation[2] = 0;
      }
      spark.tile.quad._dirty = true;
    }

    if (this.segments.length > 0) {
      const first = this.segments[0]!;
      const last = this.segments[this.segments.length - 1]!;
      this.pos.x = Math.min(first.centerX, last.centerX) - this.size.x / 2;
      this.pos.y = Math.min(first.centerY, last.centerY);
      if (
        !this._killed &&
        culledSectors &&
        (this.pos.x !== this.last.x || this.pos.y !== this.last.y)
      ) {
        culledSectors.moveEntity(this);
        this.last.x = this.pos.x;
        this.last.y = this.pos.y;
      }
    }
  }

  private syncSingleQuad(lifeAlpha: number): void {
    if (!this.tile || !this.animSheet) return;

    this.tile.scale = this.displayScale;
    this.tile.quad.setSize(this.displayW, this.displayH);
    this.tile.quad.setAlpha(lifeAlpha);

    const camera = this.context.camera;
    const collisionMap = this.context.collisionMap;
    const ts = collisionMap && 'tilesize' in collisionMap ? collisionMap.tilesize : 64;

    const tpos = this.tile.quad.position;
    const halfW = this.displayW / 2;
    const halfH = this.displayH / 2;
    tpos[0] = this.pos.x + halfW;
    tpos[2] = this.pos.y + halfH;
    tpos[1] = this.worldZ - ts / 2 + halfH;

    if (this.rotateToView && camera) {
      this.tile.quad.rotation[1] = camera.rotation[1];
      this.tile.quad.rotation[2] = 0;
    }
    this.tile.quad._dirty = true;
  }

  updateQuad(): void {
    if (this.pathMode && this.segments.length > 0) {
      this.syncSegmentQuads();
      return;
    }
    if (this.tile) {
      const life = computePathLifeEffect(this.pathVariant, this.ageMs, this.maxAgeMs);
      this.syncSingleQuad(life.alphaMul);
    }
  }
}
