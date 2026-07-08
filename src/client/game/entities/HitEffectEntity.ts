import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import { Tile } from 'twopointfive-phaser-3/src/twopointfive/world/tile.ts';
import type Renderer from 'twopointfive-phaser-3/src/twopointfive/renderer/renderer.ts';
import type { EntityContext, ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import {
  HIT_EFFECT_FRAME_COUNT,
  HIT_EFFECT_FRAME_HEIGHT,
  HIT_EFFECT_FRAME_WIDTH,
  type HitEffectCatalog,
} from '../assets/HitEffectAssets.ts';
import { ENEMY_CONFIG } from '../config/EnemyConfig.ts';
import type { HitEffectVfx } from '../systems/HitEffectVfx.ts';

export type HitEffectVariant = 'attack1' | 'attack2';

const STASH_X = -9999;
const STASH_Y = -9999;

export default class HitEffectEntity extends TPFEntity {
  /** EnemyEntity(zIndex=2) 앞 */
  zIndex = 3;

  private readonly vfx: HitEffectVfx | null;
  private readonly catalog: HitEffectCatalog | null;
  private active = false;
  private ageMs = 0;
  private readonly maxAgeMs = HIT_EFFECT_FRAME_COUNT * ENEMY_CONFIG.hitEffectFrameMs;

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
    this.scale = ENEMY_CONFIG.hitEffectDisplayScale;
    this.size = { x: HIT_EFFECT_FRAME_WIDTH, y: HIT_EFFECT_FRAME_HEIGHT };
    this.vfx = (settings?.hitEffectVfx as HitEffectVfx) ?? null;
    this.catalog = (settings?.hitEffectCatalog as HitEffectCatalog) ?? null;
  }

  isPlaying(): boolean {
    return this.active && !this._killed;
  }

  activate(worldX: number, worldY: number, z: number, variant: HitEffectVariant): void {
    const image = this.pickImage(variant);
    if (!image || !this.context.renderer) return;

    const halfW = (HIT_EFFECT_FRAME_WIDTH * this.scale) / 2;
    const halfH = (HIT_EFFECT_FRAME_HEIGHT * this.scale) / 2;

    this._killed = false;
    this.active = true;
    this.ageMs = 0;
    this.pos.x = worldX - halfW;
    this.pos.y = worldY - halfH;
    this.pos.z = z;
    this.last.x = this.pos.x;
    this.last.y = this.pos.y;
    this.size = { x: HIT_EFFECT_FRAME_WIDTH * this.scale, y: HIT_EFFECT_FRAME_HEIGHT * this.scale };

    this.animSheet = { image, width: HIT_EFFECT_FRAME_WIDTH, height: HIT_EFFECT_FRAME_HEIGHT };
    this.anims = {};
    const frames = Array.from({ length: HIT_EFFECT_FRAME_COUNT }, (_, i) => i);
    const frameTimeSec = ENEMY_CONFIG.hitEffectFrameMs / 1000;
    const anim = this.addAnim('hit', frameTimeSec, frames, true);
    anim.rewind();
    this.currentAnim = anim;

    this.tile = new Tile(
      image,
      0,
      HIT_EFFECT_FRAME_WIDTH,
      HIT_EFFECT_FRAME_HEIGHT,
      this.scale,
    );
    this.tile.quad.setColor({ r: 1, g: 1, b: 1 });
    this.tile.quad.setAlpha(1);

    if (this.context.culledSectors) {
      this.context.culledSectors.moveEntity(this);
    }
    this.ensureInGameState();
    this.syncVisuals();
  }

  /** TPF update 루프는 gs.entities에 있는 엔티티만 갱신 — 풀 재사용 시 재등록 필수 */
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
    this.currentAnim?.update();
    this.syncVisuals();

    const anim = this.currentAnim;
    const animDone = anim?.stop && anim.loopCount > 0;
    if (animDone || this.ageMs >= this.maxAgeMs) {
      this.vfx?.release(this);
    }
  }

  draw(renderer?: Renderer): void {
    if (!this.isPlaying()) return;
    const r = renderer || this.context.renderer;
    if (this.tile && r) {
      this.tile.draw(r);
    }
  }

  /** 풀 반환 — 섹터·타일 즉시 제거 */
  finish(): void {
    this.active = false;
    this._killed = true;
    this.ageMs = 0;
    this.currentAnim = null;
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

  private pickImage(variant: HitEffectVariant): ImageInfo | null {
    if (!this.catalog) return null;
    return variant === 'attack2' ? this.catalog.attack2 : this.catalog.attack1;
  }

  private syncVisuals(): void {
    if (!this.tile || !this.animSheet || !this.currentAnim) return;

    const w = this.animSheet.width * this.scale;
    const h = this.animSheet.height * this.scale;
    this.tile.scale = this.scale;
    this.tile.quad.setSize(w, h);
    this.tile.setTile(this.currentAnim.tile);

    if (this.rotateToView && this.context.camera) {
      this.tile.quad.rotation[1] = this.context.camera.rotation[1];
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
    const halfW = (this.animSheet.width * this.scale) / 2;
    const halfH = (this.animSheet.height * this.scale) / 2;
    tpos[0] = this.pos.x + halfW;
    tpos[2] = this.pos.y + halfH;
    const ts = collisionMap && 'tilesize' in collisionMap ? collisionMap.tilesize : 64;
    tpos[1] = this.pos.z - ts / 2 + (this.animSheet.height * this.scale) / 2;

    if (this.rotateToView && camera) {
      this.tile.quad.rotation[1] = camera.rotation[1];
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
