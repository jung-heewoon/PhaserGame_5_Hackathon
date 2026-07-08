import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import { Tile } from 'twopointfive-phaser-3/src/twopointfive/world/tile.ts';
import type { EntityContext, ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import { FIRE_OBSTACLE_CONFIG } from '../config/FireObstacleConfig.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import type { RunSession } from '../systems/RunSession.ts';
import type RunnerPlayerEntity from './RunnerPlayerEntity.ts';

export default class FireObstacleEntity extends TPFEntity {
  zIndex = 2;

  private readonly fireImage: ImageInfo | null;
  private readonly session: RunSession | null;
  private telegraphOnly = false;

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
      x: FIRE_OBSTACLE_CONFIG.hitboxWidthPx,
      y: FIRE_OBSTACLE_CONFIG.hitboxHeightPx,
    };
    this.scale = FIRE_OBSTACLE_CONFIG.displayScale;
    this.gravityFactor = 0;
    // 불꽃은 자체 발광 → 조명(라이트맵) 틴트 영향 안 받도록 풀브라이트
    this.dynamicLight = false;
    this.rotateToView = true;
    this.fireImage = (settings?.fireImage as ImageInfo) ?? null;
    this.session = (settings?.session as RunSession) ?? null;
  }

  init(x: number, y: number, settings: Record<string, unknown> | null): void {
    this.telegraphOnly = settings?.telegraphOnly === true;
    if (this.telegraphOnly) {
      this.type = TPFEntity.TYPE.NONE;
      this.checkAgainst = TPFEntity.TYPE.NONE;
      this.collides = TPFEntity.COLLIDES.NEVER;
    } else {
      this.type = TPFEntity.TYPE.B;
      this.checkAgainst = TPFEntity.TYPE.A;
      this.collides = TPFEntity.COLLIDES.LITE;
    }
    if (this.fireImage) {
      this.anims = {};
      this.animSheet = {
        image: this.fireImage,
        width: FIRE_OBSTACLE_CONFIG.frameWidthPx,
        height: FIRE_OBSTACLE_CONFIG.frameHeightPx,
      };
      const frames = Array.from({ length: FIRE_OBSTACLE_CONFIG.frameCount }, (_, i) => i);
      const frameTimeSec = 1 / FIRE_OBSTACLE_CONFIG.animFps;
      const anim = this.addAnim('burn', frameTimeSec, frames);
      anim.rewind();
      this.currentAnim = anim ?? this.anims.burn ?? null;

      if (this.context.renderer) {
        this.tile = new Tile(
          this.fireImage,
          0,
          FIRE_OBSTACLE_CONFIG.frameWidthPx,
          FIRE_OBSTACLE_CONFIG.frameHeightPx,
          this.scale,
        );
      }
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
    if (this.telegraphOnly) return;
    if (other.type !== TPFEntity.TYPE.A) return;
    const player = other as RunnerPlayerEntity;
    if (player.isDead || this.session?.isGameplayFrozen) return;
    if (!this.overlapsPlayerContact(player)) return;
    player.receiveDamage(FIRE_OBSTACLE_CONFIG.contactDamage, this);
  }

  private syncTileVisuals(): void {
    if (!this.tile || !this.animSheet) return;

    if (this.currentAnim) {
      this.tile.setTile(this.currentAnim.tile);
    }

    const alpha = this.telegraphOnly ? 0.55 : 1;
    this.tile.quad.setAlpha(alpha);

    const w = this.animSheet.width * this.scale;
    const h = this.animSheet.height * this.scale;
    this.tile.scale = this.scale;
    this.tile.quad.setSize(w, h);

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
    const fireHalfW = this.size.x / 2;
    const fireHalfH = this.size.y / 2;
    return dx <= playerHalfW + fireHalfW && dy <= playerHalfH + fireHalfH;
  }
}
