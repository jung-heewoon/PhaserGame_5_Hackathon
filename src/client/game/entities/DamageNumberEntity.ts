import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import { Tile } from 'twopointfive-phaser-3/src/twopointfive/world/tile.ts';
import type Renderer from 'twopointfive-phaser-3/src/twopointfive/renderer/renderer.ts';
import type { EntityContext } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import type Phaser from 'phaser';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import {
  damageNumberTextureKey,
  loadDamageNumberImage,
  rasterizeDamageNumberTexture,
} from '../assets/DamageNumberAssets.ts';
import { DAMAGE_NUMBER_CONFIG } from '../config/DamageNumberConfig.ts';
import type { DamageNumberVfx } from '../systems/DamageNumberVfx.ts';
import type { RunSession } from '../systems/RunSession.ts';
import type EnemyEntity from './EnemyEntity.ts';

const STASH_X = -9999;
const STASH_Y = -9999;

export default class DamageNumberEntity extends TPFEntity {
  /** 몬스터·히트 VFX 앞 */
  zIndex = 4;

  private readonly vfx: DamageNumberVfx | null;
  private readonly session: RunSession | null;
  private readonly poolIndex: number;
  private readonly tpf: TwoPointFiveScenePlugin | null;
  private readonly phaserScene: Phaser.Scene | null;

  private target: EnemyEntity | null = null;
  private followTarget = false;
  private anchorCenterX = 0;
  private anchorBaseY = 0;
  private anchorZ = 0;
  private floatOffsetY = 0;
  private active = false;
  private ageMs = 0;
  private frameW = 1;
  private frameH = 1;
  private baseScale: number = DAMAGE_NUMBER_CONFIG.displayScale;

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
    this.vfx = (settings?.damageNumberVfx as DamageNumberVfx) ?? null;
    this.session = (settings?.session as RunSession) ?? null;
    this.poolIndex = (settings?.poolIndex as number) ?? 0;
    this.tpf = (settings?.tpf as TwoPointFiveScenePlugin) ?? null;
    this.phaserScene = (settings?.phaserScene as Phaser.Scene) ?? null;
    this.size = { x: 1, y: 1 };
    this.scale = this.baseScale;
  }

  isPlaying(): boolean {
    return this.active && !this._killed;
  }

  activate(target: EnemyEntity, amount: number): void {
    const anchor = target.getDamageNumberAnchor();
    this.activateAt(anchor.x, anchor.y, anchor.z, amount, target);
  }

  activateAt(
    anchorX: number,
    anchorY: number,
    anchorZ: number,
    amount: number,
    followTarget: EnemyEntity | null,
  ): void {
    if (!this.tpf || !this.phaserScene || !this.context.renderer || amount <= 0) return;

    const textureKey = damageNumberTextureKey(this.poolIndex);
    const raster = rasterizeDamageNumberTexture(this.phaserScene, textureKey, amount);
    const image = loadDamageNumberImage(this.tpf, this.phaserScene, textureKey);
    if (!raster || !image) return;

    this.target = followTarget;
    this.followTarget = followTarget != null;
    this.floatOffsetY = 0;
    this.frameW = raster.width;
    this.frameH = raster.height;
    this.baseScale = followTarget?.getDamageNumberScale() ?? DAMAGE_NUMBER_CONFIG.displayScale;
    this.scale = this.baseScale * DAMAGE_NUMBER_CONFIG.popScale;

    this._killed = false;
    this.active = true;
    this.ageMs = 0;

    this.animSheet = { image, width: this.frameW, height: this.frameH };
    this.anims = {};
    this.addAnim('label', 1, [0]);
    this.currentAnim = this.anims.label ?? null;

    this.tile = new Tile(image, 0, this.frameW, this.frameH, this.scale);
    this.tile.quad.setColor({ r: 1, g: 1, b: 1 });
    this.tile.quad.setAlpha(1);

    this.anchorCenterX = anchorX;
    this.anchorBaseY = anchorY;
    this.anchorZ = anchorZ;

    this.ensureInGameState();
    this.syncVisuals();
    this.applyPositionFromAnchor();
    this.syncLastWorldPos();
    if (this.context.culledSectors) {
      this.context.culledSectors.moveEntity(this);
    }
    this.updateQuad();
  }

  update(): void {
    if (this._killed || !this.active) return;

    if (this.followTarget && this.target?._killed) {
      this.followTarget = false;
      this.target = null;
    }

    const tick = this.context.tick ?? 1 / 60;
    const deltaMs = tick * 1000;

    if (!this.session?.isGameplayFrozen) {
      this.ageMs += deltaMs;
      this.floatOffsetY -= DAMAGE_NUMBER_CONFIG.floatSpeedPxPerSec * tick;
    }

    if (this.followTarget && this.target) {
      this.refreshAnchorFromEnemy();
    }

    this.syncVisuals();
    this.applyPositionFromAnchor();
    this.syncLastWorldPos();

    if (this.ageMs >= DAMAGE_NUMBER_CONFIG.durationMs) {
      this.vfx?.release(this);
    }
  }

  draw(renderer?: Renderer): void {
    if (!this.isPlaying()) return;

    if (this.followTarget && this.target && !this.target._killed) {
      this.refreshAnchorFromEnemy();
      this.applyPositionFromAnchor();
    }

    const r = renderer || this.context.renderer;
    if (this.tile && r) {
      this.tile.draw(r);
    }
  }

  finish(): void {
    this.active = false;
    this._killed = true;
    this.target = null;
    this.followTarget = false;
    this.floatOffsetY = 0;
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

  private ensureInGameState(): void {
    const gs = this.context.game;
    if (gs && !gs.entities.includes(this)) {
      gs.entities.push(this);
    }
  }

  private refreshAnchorFromEnemy(): void {
    const enemy = this.target;
    if (!enemy || enemy._killed) return;

    const anchor = enemy.getDamageNumberAnchor();
    this.anchorCenterX = anchor.x;
    this.anchorBaseY = anchor.y;
    this.anchorZ = anchor.z;
  }

  private applyPositionFromAnchor(): void {
    const anchorY = this.anchorBaseY + this.floatOffsetY;
    const halfW = (this.frameW * this.scale) / 2;
    const halfH = (this.frameH * this.scale) / 2;
    this.pos.x = this.anchorCenterX - halfW;
    this.pos.y = anchorY - halfH;
    this.pos.z = this.anchorZ;
    this.size = { x: halfW * 2, y: halfH * 2 };
  }

  private syncLastWorldPos(): void {
    this.last.x = this.pos.x;
    this.last.y = this.pos.y;
  }

  private syncVisuals(): void {
    if (!this.tile || !this.animSheet) return;

    const popT = Math.min(1, this.ageMs / DAMAGE_NUMBER_CONFIG.popMs);
    const popEase = 1 - (1 - popT) ** 3;
    const popMul =
      DAMAGE_NUMBER_CONFIG.popScale +
      (1 - DAMAGE_NUMBER_CONFIG.popScale) * popEase;
    this.scale = this.baseScale * popMul;

    const lifeT = Math.min(1, this.ageMs / DAMAGE_NUMBER_CONFIG.durationMs);
    const alpha = lifeT < 0.55 ? 1 : 1 - (lifeT - 0.55) / 0.45;

    const w = this.frameW * this.scale;
    const h = this.frameH * this.scale;
    this.tile.scale = this.scale;
    this.tile.quad.setSize(w, h);
    if (this.currentAnim) {
      this.tile.setTile(this.currentAnim.tile);
    }
    this.tile.quad.setAlpha(alpha);

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
    const halfW = (this.frameW * this.scale) / 2;
    const halfH = (this.frameH * this.scale) / 2;
    tpos[0] = this.pos.x + halfW;
    tpos[2] = this.pos.y + halfH;
    const ts = collisionMap && 'tilesize' in collisionMap ? collisionMap.tilesize : 64;
    tpos[1] = this.pos.z - ts / 2 + halfH;

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
