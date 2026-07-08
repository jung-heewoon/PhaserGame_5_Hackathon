import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import { Tile } from 'twopointfive-phaser-3/src/twopointfive/world/tile.ts';
import type { EntityContext } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import type { BossCatalog } from '../assets/BossAssets.ts';
import {
  BOSS_CONFIG,
  BOSS_SPRITE_META,
  bossHitboxHeight,
  bossHitboxWidth,
  randomStopGoDuration,
  type BossType,
} from '../config/BossConfig.ts';
import { DAMAGE_NUMBER_CONFIG } from '../config/DamageNumberConfig.ts';
import {
  clampPosXToCorridorVisual,
  corridorInnerMaxX,
  corridorInnerMinX,
  posXFromVisualLeft,
  RUN_GAME_CONFIG,
} from '../config/RunGameConfig.ts';
import EnemyEntity from './EnemyEntity.ts';
import type RunnerPlayerEntity from './RunnerPlayerEntity.ts';
import type { HitEffectVfx } from '../systems/HitEffectVfx.ts';
import { spawnBossDamageHudToast } from '../ui/BossDamageHudToast.ts';

export interface BossSpawnParams {
  bossType: BossType;
  health: number;
}

type BossMovePhase = 'pause' | 'move';
type BossLocomotionSheet = 'idle' | 'walk';

export default class BossEntity extends EnemyEntity {
  private bossType: BossType = 'bringer';
  private bossCatalog: BossCatalog | null = null;
  private isDying = false;
  private deathAnimDone = false;
  private strafeDir = 1;
  private isAnchored = false;
  private onDefeated: (() => void) | null = null;
  private onDeathStart: (() => void) | null = null;
  private movePhase: BossMovePhase = 'pause';
  private phaseRemainingMs = 0;
  private isCasting = false;
  private castCompleteCb: (() => void) | null = null;
  /** bossType+sheet 조합 — 풀 재활성화 시 타입이 바뀌어도 스프라이트를 다시 바인딩 */
  private appliedLocomotionKey: string | null = null;
  private castLockX = 0;
  private castElapsedMs = 0;
  private patternHold = false;
  private patternHoldX = 0;

  constructor(
    x: number,
    y: number,
    settings: Record<string, unknown> | null,
    context: Partial<EntityContext> | null,
  ) {
    super(x, y, settings, context);
    this.bossCatalog = (settings?.bossCatalog as BossCatalog) ?? null;
    this.onDefeated = (settings?.onBossDefeated as (() => void) | null) ?? null;
    this.onDeathStart = (settings?.onBossDeathStart as (() => void) | null) ?? null;
  }

  configureBossSpawn(params: BossSpawnParams): void {
    this.bossType = params.bossType;
    this.health = params.health;
    this.isDying = false;
    this.deathAnimDone = false;
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.isAnchored = false;
    this.isCasting = false;
    this.castCompleteCb = null;
    this.patternHold = false;
    this.movePhase = 'pause';
    this.phaseRemainingMs = randomStopGoDuration(false);
    this.punchScale = 1;
    this.squashScale = 1;
    this.hitFlashMs = 0;
    this.hitPulseMs = 0;
    this.appliedLocomotionKey = null;
    this.applyLocomotionSheet('idle');
  }

  init(x: number, y: number, settings: Record<string, unknown> | null): void {
    if (settings?.onBossDefeated) {
      this.onDefeated = settings.onBossDefeated as () => void;
    }
    if (settings?.onBossDeathStart) {
      this.onDeathStart = settings.onBossDeathStart as () => void;
    }
    if (settings?.hitEffectVfx !== undefined) {
      this.hitEffectVfx = settings.hitEffectVfx as HitEffectVfx | null;
    }
    if (settings?.bossType != null) {
      this.configureBossSpawn({
        bossType: settings.bossType as BossType,
        health: (settings.health as number) ?? this.health,
      });
    }
    TPFEntity.prototype.init.call(this, x, y, settings);
    this.pos.x = this.clampPosToCorridorVisual(this.pos.x);
    this.syncTileVisuals();
  }

  /** 보스는 덩치가 크므로 좌우 접촉 판정에 자체 히트박스 반폭을 그대로 사용 */
  protected override contactHalfWidthX(): number {
    return this.size.x / 2;
  }

  /** 보스는 앞뒤(Y) 접촉 판정도 자체 히트박스 반폭을 그대로 사용 */
  protected override contactHalfHeightY(): number {
    return this.size.y / 2;
  }

  /** 보스 접촉 시 플레이어 앞뒤(Y) — 본체만 기존 판정 유지 */
  protected override contactPlayerHalfHeight(_player: RunnerPlayerEntity): number {
    return RUN_GAME_CONFIG.playerBossContactHalfHeight;
  }

  getBossType(): BossType {
    return this.bossType;
  }

  isAliveAndActive(): boolean {
    return !this._killed && !this.isDying;
  }

  getIsAnchored(): boolean {
    return this.isAnchored;
  }

  isCastingNow(): boolean {
    return this.isCasting;
  }

  isPatternHold(): boolean {
    return this.patternHold;
  }

  beginPatternHold(): void {
    if (this.isCasting || this.isDying || this._killed) return;
    this.patternHold = true;
    this.patternHoldX = this.pos.x;
    this.vel.x = 0;
    this.vel.y = 0;
    this.setLocomotionForMovement(false);
  }

  endPatternHold(): void {
    this.patternHold = false;
  }

  isMoving(): boolean {
    if (this.isCasting || this.patternHold || !this.isAnchored) return false;
    return this.movePhase === 'move';
  }

  beginCast(onComplete: () => void): void {
    if (this.isCasting || this.isDying || this._killed) return;
    this.isCasting = true;
    this.castElapsedMs = 0;
    this.castCompleteCb = onComplete;
    this.castLockX = this.pos.x;
    this.vel.x = 0;
    this.vel.y = 0;
    this.applyCastSheet();
  }

  getSpriteDisplayHeight(): number {
    const meta = BOSS_SPRITE_META[this.bossType];
    return meta.idleFrameHeight * this.getEffectiveScale();
  }

  getDamageNumberScale(): number {
    return DAMAGE_NUMBER_CONFIG.bossDisplayScale;
  }

  /** 큰 스프라이트 앞·상체 쪽 — 히트박스 중심만 쓰면 보스 메시에 가려짐 */
  getDamageNumberAnchor(): { x: number; y: number; z: number } {
    const spriteH = this.getSpriteDisplayHeight();
    const cx = this.pos.x + this.size.x / 2;
    const cy = this.pos.y + this.size.y / 2;
    const zLift = Math.max(DAMAGE_NUMBER_CONFIG.bossZOffset, spriteH * 0.52);
    return {
      x: cx,
      y: cy - spriteH * 0.3,
      z: this.pos.z + zLift,
    };
  }

  update(): void {
    if (this._killed) return;

    const tick = this.context.tick ?? 1 / 60;
    const deltaMs = tick * 1000;

    if (this.isDying) {
      this.vel.x = 0;
      this.vel.y = 0;
      this.currentAnim?.update();
      const anim = this.currentAnim;
      const animDone = anim?.stop && (anim.loopCount ?? 0) > 0;
      if (animDone || this.deathAnimDone) {
        this.finishDeath();
      }
      this.syncTileVisuals();
      return;
    }

    if (this.session?.isGameplayFrozen) {
      this.vel.x = 0;
      this.vel.y = 0;
      this.updateHitFx(deltaMs);
      this.currentAnim?.update();
      this.syncTileVisuals();
      return;
    }

    if (this.isCasting) {
      this.vel.x = 0;
      this.vel.y = 0;
      const player = this.findPlayer();
      if (player && !player._killed && this.isAnchored) {
        this.syncAnchoredHold(player);
        this.pos.x = this.castLockX;
        this.last.x = this.pos.x;
      }
      this.currentAnim?.update();
      this.castElapsedMs += deltaMs;
      const castMeta = BOSS_SPRITE_META[this.bossType];
      const castDurationMs =
        (castMeta.castFrameCount / castMeta.castAnimFps) * 1000;
      if (this.castElapsedMs >= castDurationMs) {
        this.finishCast();
      }
      this.updateHitFx(deltaMs);
      TPFEntity.prototype.update.call(this);
      this.syncTileVisuals();
      return;
    }

    if (this.patternHold) {
      this.vel.x = 0;
      this.vel.y = 0;
      const holdPlayer = this.findPlayer();
      if (holdPlayer && !holdPlayer._killed && this.isAnchored) {
        this.syncAnchoredHold(holdPlayer);
        this.pos.x = this.patternHoldX;
        this.last.x = this.pos.x;
      }
      this.updateHitFx(deltaMs);
      this.currentAnim?.update();
      TPFEntity.prototype.update.call(this);
      this.syncTileVisuals();
      return;
    }

    const player = this.findPlayer();
    if (player && !player._killed) {
      const px = player.pos.x + player.size.x / 2;
      const py = player.pos.y + player.size.y / 2;
      const ex = this.pos.x + this.size.x / 2;
      const ey = this.pos.y + this.size.y / 2;
      const dy = py - ey;
      const distY = Math.abs(dy);

      if (!this.isAnchored && distY > BOSS_CONFIG.minStopDistanceAheadPx) {
        const approachDir = dy > 0 ? 1 : -1;
        this.vel.x = 0;
        this.vel.y = approachDir * BOSS_CONFIG.approachSpeed;
        this.facingLeft = px < ex;
        this.setLocomotionForMovement(true);
      } else {
        if (!this.isAnchored) {
          this.isAnchored = true;
          this.movePhase = 'pause';
          this.phaseRemainingMs = randomStopGoDuration(false);
          this.setLocomotionForMovement(false);
        }
        this.vel.y = 0;
        this.syncAnchoredHold(player);
        this.tickStopGo(deltaMs);
      }
    }

    this.updateHitFx(deltaMs);
    this.currentAnim?.update();
    TPFEntity.prototype.update.call(this);

    if (this.isAnchored && player && !player._killed) {
      this.syncAnchoredHold(player);

      const minPos = this.corridorMinPosX();
      const maxPos = this.corridorMaxPosX();

      if (this.movePhase === 'move') {
        this.vel.x = this.strafeDir * BOSS_CONFIG.strafeSpeed;
        this.facingLeft = this.strafeDir > 0;

        if (this.pos.x <= minPos) {
          this.pos.x = minPos;
          this.strafeDir = 1;
        } else if (this.pos.x >= maxPos) {
          this.pos.x = maxPos;
          this.strafeDir = -1;
        }
      } else {
        this.vel.x = 0;
      }
    } else {
      this.pos.x = this.clampPosToCorridorVisual(this.pos.x);
    }
    this.syncTileVisuals();
  }

  receiveDamage(amount: number, _from: TPFEntity): void {
    if (this._killed || this.isDying) return;

    spawnBossDamageHudToast(this, amount);
    this.hitEffectVfx?.spawnAtEntity(this);

    this.hitFlashMs = BOSS_CONFIG.hitFlashMs;
    this.hitPulseMs = BOSS_CONFIG.hitPulseMs;
    this.punchScale = BOSS_CONFIG.hitPulseScale;

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.beginDeath();
    }
  }

  check(other: TPFEntity): void {
    if (this.isDying) return;
    super.check(other);
  }

  private syncAnchoredHold(player: RunnerPlayerEntity): void {
    const py = player.pos.y + player.size.y / 2;
    const holdCenterY = py - BOSS_CONFIG.minStopDistanceAheadPx;
    this.pos.y = holdCenterY - this.size.y / 2;
    this.last.y = this.pos.y;
  }

  private tickStopGo(deltaMs: number): void {
    this.phaseRemainingMs -= deltaMs;
    if (this.phaseRemainingMs > 0) return;

    if (this.movePhase === 'pause') {
      this.movePhase = 'move';
      this.phaseRemainingMs = randomStopGoDuration(true);
      this.setLocomotionForMovement(true);
    } else {
      this.movePhase = 'pause';
      this.phaseRemainingMs = randomStopGoDuration(false);
      this.setLocomotionForMovement(false);
    }
  }

  private setLocomotionForMovement(moving: boolean): void {
    this.applyLocomotionSheet(moving ? 'walk' : 'idle');
  }

  private finishCast(): void {
    if (!this.isCasting) return;
    this.isCasting = false;
    const cb = this.castCompleteCb;
    this.castCompleteCb = null;
    // cast sheet 교체 후 idle/walk 타일을 반드시 다시 바인딩
    this.appliedLocomotionKey = null;
    this.setLocomotionForMovement(this.movePhase === 'move');
    cb?.();
  }

  private beginDeath(): void {
    this.isCasting = false;
    this.castCompleteCb = null;
    this.patternHold = false;
    this.isDying = true;
    this.collides = TPFEntity.COLLIDES.NEVER;
    this.checkAgainst = TPFEntity.TYPE.NONE;
    this.vel.x = 0;
    this.vel.y = 0;
    this.applyBossDeathSheet();
    const deathStartCb = this.onDeathStart;
    this.onDeathStart = null;
    deathStartCb?.();
  }

  private finishDeath(): void {
    if (this._killed || this.deathAnimDone) return;
    this.deathAnimDone = true;
    const defeatedCb = this.onDefeated;
    this.onDefeated = null;
    defeatedCb?.();
    if (this.entityPool) {
      this.entityPool.releaseBoss(this);
    } else {
      this.kill();
    }
  }

  private applyLocomotionSheet(sheet: BossLocomotionSheet): void {
    const key = `${this.bossType}:${sheet}`;
    if (this.appliedLocomotionKey === key && !this.isCasting) return;
    this.appliedLocomotionKey = key;

    const meta = BOSS_SPRITE_META[this.bossType];
    const sprites = this.bossCatalog?.get(this.bossType);
    if (!sprites) return;

    this.size = {
      x: bossHitboxWidth(this.bossType),
      y: bossHitboxHeight(this.bossType),
    };
    this.baseDisplayScale = meta.displayScale;
    this.scale = meta.displayScale;

    const isWalk = sheet === 'walk';
    const frameW = isWalk ? meta.walkFrameWidth : meta.idleFrameWidth;
    const frameH = isWalk ? meta.walkFrameHeight : meta.idleFrameHeight;
    const frameCount = isWalk ? meta.walkFrameCount : meta.idleFrameCount;
    const fps = isWalk ? meta.walkAnimFps : meta.idleAnimFps;
    const image = isWalk ? sprites.walk : sprites.idle;

    this.anims = {};
    this.animSheet = { image, width: frameW, height: frameH };
    const frames = Array.from({ length: frameCount }, (_, i) => i);
    const anim = this.addAnim(sheet, 1 / fps, frames);
    anim.rewind();
    this.currentAnim = anim ?? this.anims[sheet] ?? null;

    if (this.context.renderer) {
      this.tile = new Tile(image, 0, frameW, frameH, this.getEffectiveScale());
    }
    this.notifyTileSwapped();
  }

  private applyCastSheet(): void {
    const meta = BOSS_SPRITE_META[this.bossType];
    const sprites = this.bossCatalog?.get(this.bossType);
    if (!sprites) {
      this.finishCast();
      return;
    }

    this.anims = {};
    this.animSheet = {
      image: sprites.cast,
      width: meta.castFrameWidth,
      height: meta.castFrameHeight,
    };
    const frames = Array.from({ length: meta.castFrameCount }, (_, i) => i);
    const anim = this.addAnim('cast', 1 / meta.castAnimFps, frames, false);
    anim.rewind();
    this.currentAnim = anim ?? this.anims.cast ?? null;

    if (this.context.renderer) {
      this.tile = new Tile(
        sprites.cast,
        0,
        meta.castFrameWidth,
        meta.castFrameHeight,
        this.getEffectiveScale(),
      );
      this.tile.quad.setColor({ r: 1, g: 1, b: 1 });
      this.tile.quad.setAlpha(1);
    }
    this.notifyTileSwapped();
  }

  private applyBossDeathSheet(): void {
    const meta = BOSS_SPRITE_META[this.bossType];
    const sprites = this.bossCatalog?.get(this.bossType);
    if (!sprites) {
      this.finishDeath();
      return;
    }

    this.anims = {};
    this.animSheet = {
      image: sprites.death,
      width: meta.deathFrameWidth,
      height: meta.deathFrameHeight,
    };
    const frames = Array.from({ length: meta.deathFrameCount }, (_, i) => i);
    const frameTimeSec = 1 / meta.deathAnimFps;
    const anim = this.addAnim('death', frameTimeSec, frames, true);
    anim.rewind();
    this.currentAnim = anim ?? this.anims.death ?? null;

    if (this.context.renderer) {
      this.tile = new Tile(
        sprites.death,
        0,
        meta.deathFrameWidth,
        meta.deathFrameHeight,
        this.getEffectiveScale(),
      );
    }
    this.notifyTileSwapped();
  }

  /** cast/walk/idle 시트 교체 후 섹터·쿼드 재등록 — 미호출 시 2.5D 컬링에서 투명해짐 */
  private notifyTileSwapped(): void {
    if (this.context.culledSectors) {
      this.context.culledSectors.moveEntity(this);
    }
    this.updateQuad();
  }

  protected override updateHitFx(deltaMs: number): void {
    if (this.hitFlashMs > 0) {
      this.hitFlashMs = Math.max(0, this.hitFlashMs - deltaMs);
    }
    if (this.hitPulseMs > 0) {
      this.hitPulseMs = Math.max(0, this.hitPulseMs - deltaMs);
      const t = this.hitPulseMs / BOSS_CONFIG.hitPulseMs;
      this.punchScale = 1 + (BOSS_CONFIG.hitPulseScale - 1) * t;
    } else if (!this.isDying) {
      this.punchScale = 1;
    }
  }

  private getVisualWidth(): number {
    const scale = this.getEffectiveScale();
    return (this.animSheet?.width ?? this.size.x / scale) * scale;
  }

  private clampPosToCorridorVisual(posX: number): number {
    return clampPosXToCorridorVisual(posX, this.size.x, this.getVisualWidth());
  }

  private corridorMinPosX(): number {
    const visualW = this.getVisualWidth();
    return posXFromVisualLeft(corridorInnerMinX(), this.size.x, visualW);
  }

  private corridorMaxPosX(): number {
    const visualW = this.getVisualWidth();
    return posXFromVisualLeft(corridorInnerMaxX(visualW), this.size.x, visualW);
  }

  protected override syncTileVisuals(): void {
    if (!this.tile || !this.animSheet) return;

    if (this.currentAnim) {
      this.tile.setTile(this.currentAnim.tile);
    }

    const scale = this.getEffectiveScale();
    const w = this.animSheet.width * scale;
    const h = this.animSheet.height * scale;
    this.tile.scale = scale;
    this.tile.quad.setSize(this.facingLeft ? -w : w, h);

    if (this.rotateToView && this.context.camera) {
      this.tile.quad.rotation[1] = this.context.camera.rotation[1];
    }

    this.updateQuad();
  }

  override updateQuad(): void {
    const flashing = this.hitFlashMs > 0;
    const prevDynamicLight = this.dynamicLight;
    if (flashing) {
      this.dynamicLight = false;
    }

    TPFEntity.prototype.updateQuad.call(this);

    this.dynamicLight = prevDynamicLight;

    if (!this.tile) return;

    if (flashing) {
      const t = 1 - this.hitFlashMs / BOSS_CONFIG.hitFlashMs;
      const fade = 1 - t * t;
      const flicker = 0.88 + 0.12 * Math.abs(Math.sin(t * Math.PI * 4));
      const boost = 1 + BOSS_CONFIG.hitFlashBoost * fade * flicker;
      this.tile.quad.setColor({ r: boost, g: boost, b: boost });
      this.tile.quad.setAlpha(1);
    } else {
      this.tile.quad.setColor({ r: 1, g: 1, b: 1 });
      this.tile.quad.setAlpha(1);
    }
  }
}
