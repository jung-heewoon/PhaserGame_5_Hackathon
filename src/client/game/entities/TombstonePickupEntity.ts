import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import TPFTimer from 'twopointfive-phaser-3/src/twopointfive/timer.ts';
import type { EntityContext, ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import type { TombstoneRecord } from '../../../../shared/tombstone.ts';
import {
  TOMBSTONE_CONFIG,
  tombstoneCorridorWidthPx,
  tombstoneSpawnX,
} from '../config/TombstoneConfig.ts';
import type RunnerPlayerEntity from './RunnerPlayerEntity.ts';
import type { EntityPool } from '../systems/EntityPool.ts';
import type { RunSession } from '../systems/RunSession.ts';

export default class TombstonePickupEntity extends TPFEntity {
  private readonly pickupImage: ImageInfo | null;
  private readonly session: RunSession | null;
  private readonly entityPool: EntityPool | null;
  private bounceTimer: TPFTimer | null = null;
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
      x: tombstoneCorridorWidthPx(),
      y: TOMBSTONE_CONFIG.hitboxHeightPx,
    };
    this.scale = 1;
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
        width: TOMBSTONE_CONFIG.visualHeightPx,
        height: TOMBSTONE_CONFIG.visualHeightPx,
      };
      this.addAnim('idle', 10, [0]);
    }
    this.bounceTimer = new TPFTimer();
    if (settings) {
      this.record = (settings.record as TombstoneRecord) ?? null;
      this.isOwn = Boolean(settings.isOwn);
    }
    this.collecting = false;
    super.init(x, y, settings);
    this.pos.x = tombstoneSpawnX();
  }

  update(): void {
    if (this._killed) return;
    if (this.session?.isGameplayFrozen && this.session.freezeReason !== 'tombstone') return;
    if (this.bounceTimer) {
      this.pos.z = (Math.cos(this.bounceTimer.delta() * 2.5) + 1) * 4;
    }
    super.update();
    this.pos.x = tombstoneSpawnX();
  }

  check(other: TPFEntity): void {
    if (other.type !== TPFEntity.TYPE.A) return;
    const player = other as RunnerPlayerEntity;
    if (player.isDead || !this.record) return;
    if (this.isOwn) return;
    if (this.collecting) return;
    if (this.session?.isGameplayFrozen) {
      if (this.session.freezeReason === 'yatzy' || this.session.freezeReason === 'bossReward') {
        this.session.pendingTombstonePickup = true;
        this.collecting = false;
      }
      return;
    }

    this.collecting = true;
    this.entityPool?.notifyTombstonePickup(this);
  }
}
