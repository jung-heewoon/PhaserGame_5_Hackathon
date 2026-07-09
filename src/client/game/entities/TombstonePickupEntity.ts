import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import type { EntityContext, ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import type { TombstoneRecord } from '../../../../shared/tombstone.ts';
import {
  TOMBSTONE_CONFIG,
  tombstonePickupOverlapsPlayer,
} from '../config/TombstoneConfig.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import type RunnerPlayerEntity from './RunnerPlayerEntity.ts';
import type { EntityPool } from '../systems/EntityPool.ts';
import type { RunSession } from '../systems/RunSession.ts';

export default class TombstonePickupEntity extends TPFEntity {
  private readonly pickupImage: ImageInfo | null;
  private readonly session: RunSession | null;
  private readonly entityPool: EntityPool | null;
  record: TombstoneRecord | null = null;
  isOwn = false;
  collecting = false;

  constructor(
    x: number,
    y: number,
    settings: Record<string, unknown> | null,
    context: Partial<EntityContext> | null,
  ) {
    super(x, y, settings, context);
    this.checkAgainst = TPFEntity.TYPE.A;
    this.size = {
      x: TOMBSTONE_CONFIG.frameWidthPx,
      y: TOMBSTONE_CONFIG.frameHeightPx,
    };
    this.scale = TOMBSTONE_CONFIG.displayScale;
    this.gravityFactor = 0;
    this.dynamicLight = false;
    this.zIndex = 2;
    this.pickupImage = (settings?.pickupImage as ImageInfo) ?? null;
    this.session = (settings?.session as RunSession) ?? null;
    this.entityPool = (settings?.entityPool as EntityPool) ?? null;
  }

  init(x: number, y: number, settings: Record<string, unknown> | null): void {
    if (this.pickupImage) {
      this.animSheet = {
        image: this.pickupImage,
        width: TOMBSTONE_CONFIG.frameWidthPx,
        height: TOMBSTONE_CONFIG.frameHeightPx,
      };
      this.addAnim('idle', 10, [0]);
    }
    if (settings) {
      this.record = (settings.record as TombstoneRecord) ?? null;
      this.isOwn = Boolean(settings.isOwn);
    }
    this.collecting = false;
    this.pos.z = 0;
    super.init(x, y, settings);
  }

  update(): void {
    if (this._killed) return;
    if (this.session?.isGameplayFrozen && this.session.freezeReason !== 'tombstone') return;
    this.pos.z = 0;
    super.update();
    this.tryLanePickup();
  }

  check(other: TPFEntity): void {
    if (other.type !== TPFEntity.TYPE.A) return;
    this.tryCollect(other as RunnerPlayerEntity);
  }

  tryPickupFromPlayer(player: RunnerPlayerEntity): void {
    this.tryCollect(player);
  }

  private tryLanePickup(): void {
    const player = this.findPlayer();
    if (!player) return;
    this.tryCollect(player);
  }

  private tryCollect(player: RunnerPlayerEntity): void {
    if (player.isDead || !this.record) return;
    if (this.isOwn) return;
    if (this.collecting) return;
    if (this.session?.isGameplayFrozen) {
      if (this.session.freezeReason === 'yatzy' || this.session.freezeReason === 'bossReward') {
        this.session.pendingTombstonePickup = true;
      }
      return;
    }
    if (!tombstonePickupOverlapsPlayer(this.pos.y, player.pos.y, player.size.y)) return;

    this.collecting = true;
    this.entityPool?.notifyTombstonePickup(this);
  }

  private findPlayer(): RunnerPlayerEntity | null {
    const game = this.context.game;
    if (!game) return null;
    for (const ent of game.entities) {
      if (ent.type === TPFEntity.TYPE.A && !ent._killed) {
        return ent as RunnerPlayerEntity;
      }
    }
    return null;
  }

  getSpriteDisplayHeight(): number {
    return TOMBSTONE_CONFIG.frameHeightPx * this.scale;
  }

  getWorldCenterX(): number {
    return this.pos.x + this.size.x / 2;
  }

  getWorldCenterY(): number {
    return this.pos.y + this.size.y / 2;
  }

  /** TPF updateQuad와 동일한 렌더 Z (visualSinkZ 반영) */
  getRenderPosZ(): number {
    return this.pos.z - TOMBSTONE_CONFIG.visualSinkZ;
  }

  getTileSize(): number {
    const map = this.context.collisionMap;
    if (map && 'tilesize' in map) return map.tilesize as number;
    return RUN_GAME_CONFIG.tileSize;
  }

  override updateQuad(): void {
    if (!this.tile || !this.animSheet) {
      super.updateQuad();
      return;
    }

    const ctx = this.context;
    const camera = ctx.camera;
    const culledSectors = ctx.culledSectors;
    const ts = this.getTileSize();
    const halfH = this.getSpriteDisplayHeight() / 2;

    const tpos = this.tile.quad.position;
    tpos[0] = this.getWorldCenterX();
    tpos[2] = this.getWorldCenterY();
    tpos[1] = this.getRenderPosZ() - ts / 2 + halfH;

    if (this.rotateToView && camera) {
      this.tile.quad.rotation[1] = camera.rotation[1];
    }
    this.tile.quad._dirty = true;

    if (!this._killed && culledSectors) {
      culledSectors.moveEntity(this);
    }
  }
}
