import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import TPFTimer from 'twopointfive-phaser-3/src/twopointfive/timer.ts';
import type { EntityContext, ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import { DICE_SPRITE_CONFIG } from '../config/DiceSpriteConfig.ts';
import { clampToCorridorX } from '../config/RunGameConfig.ts';
import type { EntityPool } from '../systems/EntityPool.ts';
import type { GameRunState } from '../systems/GameRunState.ts';
import type { RunSession } from '../systems/RunSession.ts';

export default class DicePickupEntity extends TPFEntity {
  private readonly pickupImage: ImageInfo | null;
  private readonly gameState: GameRunState | null;
  private readonly session: RunSession | null;
  private readonly entityPool: EntityPool | null;
  private bounceTimer: TPFTimer | null = null;

  constructor(
    x: number,
    y: number,
    settings: Record<string, unknown> | null,
    context: Partial<EntityContext> | null,
  ) {
    super(x, y, settings, context);
    this.checkAgainst = TPFEntity.TYPE.A;
    this.size = { x: 20, y: 20 };
    this.scale = DICE_SPRITE_CONFIG.pickupScale;
    this.gravityFactor = 0;
    this.dynamicLight = false;
    this.pickupImage = (settings?.pickupImage as ImageInfo) ?? null;
    this.gameState = (settings?.gameRunState as GameRunState) ?? null;
    this.session = (settings?.session as RunSession) ?? null;
    this.entityPool = (settings?.entityPool as EntityPool) ?? null;
  }

  init(x: number, y: number, settings: Record<string, unknown> | null): void {
    if (this.pickupImage) {
      this.animSheet = {
        image: this.pickupImage,
        width: DICE_SPRITE_CONFIG.faceDragging.frameW,
        height: DICE_SPRITE_CONFIG.faceDragging.frameH,
      };
      this.addAnim('idle', 10, [DICE_SPRITE_CONFIG.pickupFaceFrame]);
    }
    this.bounceTimer = new TPFTimer();
    super.init(x, y, settings);
    this.pos.x = clampToCorridorX(this.pos.x, this.size.x);
  }

  update(): void {
    if (this._killed) return;
    if (this.session?.isGameplayFrozen) return;
    if (this.bounceTimer) {
      this.pos.z = (Math.cos(this.bounceTimer.delta() * 3) + 1) * 4;
    }
    super.update();
    this.pos.x = clampToCorridorX(this.pos.x, this.size.x);
  }

  check(_other: TPFEntity): void {
    if (this.session?.isGameplayFrozen) return;
    const cx = this.pos.x + this.size.x / 2;
    const cy = this.pos.y + this.size.y / 2;
    const cz = this.pos.z;
    if (this.gameState) {
      this.gameState.addDice(1);
    }
    this.entityPool?.notifyPickup('dice', cx, cy, cz);
    if (this.entityPool) {
      this.entityPool.releaseDice(this);
    } else {
      this.kill();
    }
  }
}
