import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import type { EntityContext } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import { clampToCorridorX, RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import { RunSession } from '../systems/RunSession.ts';
import { feverTimeSystem } from '../systems/FeverTimeSystem.ts';
import { playPlayerDamageFlash } from '../ui/PlayerDamageFlashDom.ts';

export default class RunnerPlayerEntity extends TPFEntity {
  /** 북쪽(-Y) 질주 방향 */
  readonly fixedAngle = 0;

  isDead = false;

  get aimAngle(): number {
    return Math.atan2(-Math.cos(this.fixedAngle), -Math.sin(this.fixedAngle));
  }

  private readonly session: RunSession;
  private strafeLeft = false;
  private strafeRight = false;
  private contactIFrameMs = 0;
  private shakeRemainingMs = 0;
  private controlLockMs = 0;
  private frozenMs = 0;

  get isControlLocked(): boolean {
    return this.controlLockMs > 0;
  }

  get isFrozen(): boolean {
    return this.frozenMs > 0;
  }

  applyControlLock(ms: number): void {
    this.controlLockMs = Math.max(this.controlLockMs, ms);
  }

  applyFreeze(ms: number): void {
    this.frozenMs = Math.max(this.frozenMs, ms);
  }

  constructor(
    x: number,
    y: number,
    settings: Record<string, unknown> | null,
    context: Partial<EntityContext> | null,
  ) {
    super(x, y, settings, context);
    this.type = TPFEntity.TYPE.A;
    this.collides = TPFEntity.COLLIDES.PASSIVE;
    this.size = { x: 28, y: 28 };
    this.health = RUN_GAME_CONFIG.playerMaxHealth;
    this.session = (settings?.session as RunSession) ?? new RunSession();
  }

  setStrafe(left: boolean, right: boolean): void {
    this.strafeLeft = left;
    this.strafeRight = right;
  }

  tryHeal(amount: number): boolean {
    if (this.isDead) return false;
    const max = RUN_GAME_CONFIG.playerMaxHealth;
    if (this.health >= max) return false;

    this.health = Math.min(max, this.health + amount);
    return true;
  }

  receiveDamage(amount: number, _from: TPFEntity): void {
    if (this.isDead || this.session.isGameplayFrozen) return;
    if (feverTimeSystem.isActive) return;
    if (this.contactIFrameMs > 0) return;

    this.health -= amount;
    this.contactIFrameMs = RUN_GAME_CONFIG.playerContactIFrameMs;
    this.shakeRemainingMs = RUN_GAME_CONFIG.playerHitShakeDurationMs;
    playPlayerDamageFlash();

    if (this.health <= 0) {
      this.health = 0;
      this.handleDeath();
    }
  }

  /** 월드에서 제거하지 않고 제자리에 남김 */
  kill(): void {
    this.handleDeath();
  }

  private handleDeath(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.health = 0;
    this.shakeRemainingMs = 0;
    this.vel.x = 0;
    this.vel.y = 0;
    this.session.markPlayerDead();
    this.session.onPlayerDeath?.();
  }

  ready(): void {
    this.pos.x = clampToCorridorX(this.pos.x, this.size.x);
    this.syncCamera();
  }

  private sampleShakeOffset(): { x: number; y: number } {
    if (this.shakeRemainingMs <= 0) return { x: 0, y: 0 };

    const duration = RUN_GAME_CONFIG.playerHitShakeDurationMs;
    const amp = RUN_GAME_CONFIG.playerHitShakeAmplitudePx;
    const t = this.shakeRemainingMs / duration;
    const falloff = t * t;

    return {
      x: (Math.random() * 2 - 1) * amp * falloff,
      y: (Math.random() * 2 - 1) * amp * falloff,
    };
  }

  private syncCamera(): void {
    const ctx = this.context;
    if (!ctx?.camera) return;

    const cx = this.pos.x + this.size.x / 2;
    const cy = this.pos.y + this.size.y / 2;
    const shake = this.sampleShakeOffset();
    ctx.camera.setPosition(cx + shake.x, cy + shake.y, 0);
    ctx.camera.setRotation(0, 0, this.fixedAngle);
  }

  update(): void {
    const ctx = this.context;
    if (!ctx?.camera) return;

    if (this.isDead) {
      this.vel.x = 0;
      this.vel.y = 0;
      this.syncCamera();
      return;
    }

    const tick = ctx.tick ?? 1 / 60;
    const deltaMs = tick * 1000;
    if (this.contactIFrameMs > 0) {
      this.contactIFrameMs = Math.max(0, this.contactIFrameMs - deltaMs);
    }
    if (this.shakeRemainingMs > 0) {
      this.shakeRemainingMs = Math.max(0, this.shakeRemainingMs - deltaMs);
    }
    if (this.controlLockMs > 0) {
      this.controlLockMs = Math.max(0, this.controlLockMs - deltaMs);
    }
    if (this.frozenMs > 0) {
      this.frozenMs = Math.max(0, this.frozenMs - deltaMs);
    }

    if (this.session.isGameplayFrozen || this.controlLockMs > 0) {
      this.vel.x = 0;
      this.vel.y = 0;
    } else {
      const speed = RUN_GAME_CONFIG.forwardSpeed;
      const strafe = RUN_GAME_CONFIG.strafeSpeed;
      let dx = 0;
      if (!this.isFrozen) {
        if (this.strafeLeft) dx += 1;
        if (this.strafeRight) dx -= 1;
      }
      const angle = this.fixedAngle;
      const dy = 1;
      this.vel.x =
        -Math.sin(angle) * dy * speed - Math.sin(angle + Math.PI / 2) * dx * strafe;
      this.vel.y =
        -Math.cos(angle) * dy * speed - Math.cos(angle + Math.PI / 2) * dx * strafe;
    }

    super.update();

    this.pos.x = clampToCorridorX(this.pos.x, this.size.x);
    this.syncCamera();
  }
}
