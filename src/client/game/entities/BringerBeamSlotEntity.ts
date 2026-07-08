import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import { Tile } from 'twopointfive-phaser-3/src/twopointfive/world/tile.ts';
import type { EntityContext, ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import { BRINGER_PATTERN_CONFIG } from '../config/BossPatternConfig.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import type { RunSession } from '../systems/RunSession.ts';
import type RunnerPlayerEntity from './RunnerPlayerEntity.ts';

export type BringerBeamMode = 'safe' | 'danger';

export default class BringerBeamSlotEntity extends TPFEntity {
  zIndex = 2;

  private readonly beamImage: ImageInfo | null;
  private readonly session: RunSession | null;
  private mode: BringerBeamMode = 'safe';
  /** sliding_wave 프리뷰 전용 — null=기본 불투명, true=안전 구간 강조, false=비강조(흐림) */
  private previewHighlight: boolean | null = null;

  constructor(
    x: number,
    y: number,
    settings: Record<string, unknown> | null,
    context: Partial<EntityContext> | null,
  ) {
    super(x, y, settings, context);
    this.type = TPFEntity.TYPE.B;
    this.checkAgainst = TPFEntity.TYPE.A;
    this.collides = TPFEntity.COLLIDES.LITE;
    this.size = {
      x: BRINGER_PATTERN_CONFIG.hitboxWidthPx,
      y: BRINGER_PATTERN_CONFIG.hitboxHeightPx,
    };
    this.scale = BRINGER_PATTERN_CONFIG.displayScale;
    this.gravityFactor = 0;
    this.dynamicLight = false;
    this.rotateToView = true;
    this.beamImage = (settings?.beamImage as ImageInfo) ?? null;
    this.session = (settings?.session as RunSession) ?? null;
  }

  configureSpawn(mode: BringerBeamMode): void {
    this.mode = mode;
    this.previewHighlight = null;
    this.vel.x = 0;
    this.vel.y = 0;
    this.applyModeAnim();
  }

  setMode(mode: BringerBeamMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.applyModeAnim();
  }

  /** sliding_wave 프리뷰 — 안전 구간 강조 (alpha) */
  setPreviewHighlight(on: boolean): void {
    if (this.previewHighlight === on) return;
    this.previewHighlight = on;
    this.syncTileAlpha();
  }

  /** danger 전환·풀 반환 시 프리뷰 alpha 초기화 */
  clearPreviewHighlight(): void {
    if (this.previewHighlight === null) return;
    this.previewHighlight = null;
    this.syncTileAlpha();
  }

  private syncTileAlpha(): void {
    if (!this.tile) return;
    const alpha =
      this.previewHighlight === null ? 1 : this.previewHighlight ? 1 : 0.45;
    this.tile.quad.setAlpha(alpha);
  }

  /** gap_slide 프리뷰·sliding_wave 최종 hold — 행 Y 고정 */
  setAnchoredRowY(y: number): void {
    if (this.pos.y === y && this.last.y === y) return;
    this.pos.y = y;
    this.last.y = y;
    this.vel.y = 0;
    this.updateQuad();
    if (this.context.culledSectors) {
      this.context.culledSectors.moveEntity(this);
    }
  }

  init(x: number, y: number, settings: Record<string, unknown> | null): void {
    if (settings?.mode != null) {
      this.configureSpawn(settings.mode as BringerBeamMode);
    }
    super.init(x, y, settings);
    this.syncTileVisuals();
  }

  update(): void {
    if (this._killed) return;

    const rawTick = this.context.tick ?? 1 / 60;
    const tick = this.session ? this.session.simTickSec(rawTick) : rawTick;
    if (tick <= 0) return;

    this.currentAnim?.update();
    super.update();
    this.syncTileVisuals();
  }

  check(other: TPFEntity): void {
    if (this.mode !== 'danger') return;
    if (other.type !== TPFEntity.TYPE.A) return;
    const player = other as RunnerPlayerEntity;
    if (player.isDead || this.session?.isGameplayFrozen) return;
    if (!this.overlapsPlayerContact(player)) return;

    player.receiveDamage(BRINGER_PATTERN_CONFIG.contactDamage, this);
  }

  private applyModeAnim(): void {
    if (!this.beamImage) return;
    const cfg = BRINGER_PATTERN_CONFIG;
    this.anims = {};
    this.animSheet = {
      image: this.beamImage,
      width: cfg.frameWidthPx,
      height: cfg.frameHeightPx,
    };

    const isSafe = this.mode === 'safe';
    const start = isSafe ? cfg.safeFrameStart : cfg.dangerFrameStart;
    const end = isSafe ? cfg.safeFrameEnd : cfg.dangerFrameEnd;
    const frames = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const fps = isSafe ? cfg.safeAnimFps : cfg.dangerAnimFps;
    const anim = this.addAnim(this.mode, 1 / fps, frames);
    anim.rewind();
    this.currentAnim = anim ?? this.anims[this.mode] ?? null;

    if (this.context.renderer) {
      this.tile = new Tile(this.beamImage, 0, cfg.frameWidthPx, cfg.frameHeightPx, this.scale);
      this.tile.quad.setColor({ r: 1, g: 1, b: 1 });
      this.tile.quad.setAlpha(1);
    }
    this.notifyTileSwapped();
  }

  private notifyTileSwapped(): void {
    if (this.context.culledSectors) {
      this.context.culledSectors.moveEntity(this);
    }
    this.updateQuad();
  }

  private syncTileVisuals(): void {
    if (!this.tile || !this.animSheet) return;
    if (this.currentAnim) {
      this.tile.setTile(this.currentAnim.tile);
    }
    const w = this.animSheet.width * this.scale;
    const h = this.animSheet.height * this.scale;
    this.tile.scale = this.scale;
    this.tile.quad.setSize(w, h);
    this.syncTileAlpha();
    if (this.rotateToView && this.context.camera) {
      this.tile.quad.rotation[1] = this.context.camera.rotation[1];
    }
    this.updateQuad();
  }

  private overlapsPlayerContact(player: RunnerPlayerEntity): boolean {
    const pcx = player.pos.x + player.size.x / 2;
    const pcy = player.pos.y + player.size.y / 2;
    const fcx = this.pos.x + this.size.x / 2;
    const fcy = this.pos.y + this.size.y / 2;
    const dx = Math.abs(pcx - fcx);
    const dy = Math.abs(pcy - fcy);
    const playerHalfW = RUN_GAME_CONFIG.playerContactHalfWidth;
    const playerHalfH = RUN_GAME_CONFIG.playerContactHalfHeight;
    return (
      dx <= playerHalfW + this.size.x / 2 &&
      dy <= playerHalfH + this.size.y / 2
    );
  }
}
