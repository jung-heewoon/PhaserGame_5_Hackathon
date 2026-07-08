import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import { Tile } from 'twopointfive-phaser-3/src/twopointfive/world/tile.ts';
import type { EntityContext, ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import { ENEMY_FRAME_HEIGHT, ENEMY_FRAME_WIDTH } from '../assets/EnemyAssets.ts';
import type { EnemyCatalog } from '../assets/EnemyAssets.ts';
import { ENEMY_CONFIG } from '../config/EnemyConfig.ts';
import { DAMAGE_NUMBER_CONFIG } from '../config/DamageNumberConfig.ts';
import { clampToCorridorX, RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import {
  EnemyMovementBehavior,
  type EnemyMoveProfile,
} from '../systems/EnemyMovementBehavior.ts';
import type { DamageNumberVfx } from '../systems/DamageNumberVfx.ts';
import type { HitEffectVfx } from '../systems/HitEffectVfx.ts';
import type { EntityPool } from '../systems/EntityPool.ts';
import type { RunSession } from '../systems/RunSession.ts';
import type RunnerPlayerEntity from './RunnerPlayerEntity.ts';

export interface EnemySpawnParams {
  typeId: number;
  health: number;
  moveSpeed: number;
  moveProfile?: EnemyMoveProfile;
}

export default class EnemyEntity extends TPFEntity {
  /** HitEffect(zIndex=3)보다 아래 */
  zIndex = 2;

  private readonly catalog: EnemyCatalog | null;
  protected readonly session: RunSession | null;
  protected readonly entityPool: EntityPool | null;
  protected damageNumberVfx: DamageNumberVfx | null;
  protected hitEffectVfx: HitEffectVfx | null;

  private typeId = 1;
  private moveSpeed: number;
  protected baseDisplayScale: number = ENEMY_CONFIG.displayScale;
  protected punchScale = 1;
  protected squashScale = 1;
  protected hitFlashMs = 0;
  protected hitPulseMs = 0;
  protected facingLeft = false;
  private wobbleAngle = 0;
  private movement = new EnemyMovementBehavior();
  private baseColor = { r: 1, g: 1, b: 1 };

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
    this.size = { x: ENEMY_FRAME_WIDTH, y: ENEMY_FRAME_HEIGHT };
    this.scale = ENEMY_CONFIG.displayScale;
    this.baseDisplayScale = ENEMY_CONFIG.displayScale;
    this.gravityFactor = 0;
    this.dynamicLight = true;
    this.rotateToView = true;

    this.catalog = (settings?.enemyCatalog as EnemyCatalog) ?? null;
    this.session = (settings?.session as RunSession) ?? null;
    this.entityPool = (settings?.entityPool as EntityPool) ?? null;
    this.damageNumberVfx = (settings?.damageNumberVfx as DamageNumberVfx) ?? null;
    this.hitEffectVfx = (settings?.hitEffectVfx as HitEffectVfx) ?? null;
    this.moveSpeed = (settings?.moveSpeed as number) ?? 90;
  }

  setMoveSpeed(speed: number): void {
    this.moveSpeed = speed;
  }

  configureSpawn(params: EnemySpawnParams): void {
    this.typeId = params.typeId;
    this.moveSpeed = params.moveSpeed;
    this.health = params.health;
    this.punchScale = 1;
    this.squashScale = 1;
    this.hitFlashMs = 0;
    this.hitPulseMs = 0;
    this.wobbleAngle = 0;
    const profile = params.moveProfile ?? 'default';
    this.movement.configure(profile, Math.random());
    this.applySpriteSheet();
  }

  init(x: number, y: number, settings: Record<string, unknown> | null): void {
    if (settings?.damageNumberVfx !== undefined) {
      this.damageNumberVfx = settings.damageNumberVfx as DamageNumberVfx | null;
    }
    if (settings?.hitEffectVfx !== undefined) {
      this.hitEffectVfx = settings.hitEffectVfx as HitEffectVfx | null;
    }
    if (settings?.typeId != null) {
      this.configureSpawn({
        typeId: settings.typeId as number,
        health: (settings.health as number) ?? this.health,
        moveSpeed: (settings.moveSpeed as number) ?? this.moveSpeed,
        moveProfile: settings.moveProfile as EnemyMoveProfile | undefined,
      });
    } else {
      this.applySpriteSheet();
    }
    super.init(x, y, settings);
    this.currentAnim = this.anims.walk ?? this.currentAnim;
    this.pos.x = clampToCorridorX(this.pos.x, this.size.x);
    this.syncTileVisuals();
  }

  update(): void {
    if (this._killed) return;

    const tick = this.context.tick ?? 1 / 60;
    const deltaMs = tick * 1000;

    if (this.session?.isGameplayFrozen) {
      this.vel.x = 0;
      this.vel.y = 0;
      this.updateHitFx(deltaMs);
      this.currentAnim?.update();
      this.syncTileVisuals();
      return;
    }

    const player = this.findPlayer();
    let zOffset = 0;
    if (player && !player._killed) {
      const px = player.pos.x + player.size.x / 2;
      const py = player.pos.y + player.size.y / 2;
      const ex = this.pos.x + this.size.x / 2;
      const ey = this.pos.y + this.size.y / 2;
      const dx = px - ex;
      const dy = py - ey;
      const len = Math.hypot(dx, dy) || 1;

      this.facingLeft = dx < 0;

      const move = this.movement.update(deltaMs, {
        playerCenterX: px,
        enemyCenterX: ex,
        moveSpeed: this.moveSpeed,
      });
      const nx = dx / len;
      const ny = dy / len;

      this.vel.x = nx * this.moveSpeed + move.lateralX;
      this.vel.y = ny * this.moveSpeed;
      zOffset = move.zOffset;
      this.squashScale = move.squashScale;
      this.wobbleAngle = move.wobbleAngle;
    }

    this.updateHitFx(deltaMs);
    super.update();
    this.pos.z = Math.max(0, zOffset);
    this.pos.x = clampToCorridorX(this.pos.x, this.size.x);
    this.syncTileVisuals();
  }

  check(other: TPFEntity): void {
    if (other.type !== TPFEntity.TYPE.A) return;
    const player = other as RunnerPlayerEntity;
    if (player.isDead || this.session?.isGameplayFrozen) return;
    if (!this.overlapsPlayerContact(player)) return;
    other.receiveDamage(RUN_GAME_CONFIG.enemyContactDamage, this);
  }

  protected overlapsPlayerContact(player: RunnerPlayerEntity): boolean {
    const pcx = player.pos.x + player.size.x / 2;
    const pcy = player.pos.y + player.size.y / 2;
    const ecx = this.pos.x + this.size.x / 2;
    const ecy = this.pos.y + this.size.y / 2;
    const dx = Math.abs(pcx - ecx);
    const dy = Math.abs(pcy - ecy);
    const playerHalfW = RUN_GAME_CONFIG.playerContactHalfWidth;
    const playerHalfH = this.contactPlayerHalfHeight(player);
    const enemyHalfW = this.contactHalfWidthX();
    const enemyHalfH = this.contactHalfHeightY();
    return dx <= playerHalfW + enemyHalfW && dy <= playerHalfH + enemyHalfH;
  }

  /** 좌우 접촉 판정에 쓰는 적 반폭. 일반 몬스터는 좁게, 보스는 자체 히트박스 사용. */
  protected contactHalfWidthX(): number {
    return RUN_GAME_CONFIG.enemyContactHalfWidthPx;
  }

  /** 앞뒤(런 방향 Y) 접촉 판정에 쓰는 적 반폭. 보스는 자체 히트박스 사용. */
  protected contactHalfHeightY(): number {
    return RUN_GAME_CONFIG.enemyContactHalfHeightPx;
  }

  /** 앞뒤(런 방향 Y) 접촉 판정에 쓰는 플레이어 반폭. 보스는 실제 size.y/2 사용. */
  protected contactPlayerHalfHeight(_player: RunnerPlayerEntity): number {
    return RUN_GAME_CONFIG.playerContactHalfHeight;
  }

  receiveDamage(amount: number, _from: TPFEntity): void {
    if (this._killed) return;

    this.damageNumberVfx?.spawnAtEntity(this, amount);
    this.hitEffectVfx?.spawnAtEntity(this);

    this.hitFlashMs = ENEMY_CONFIG.hitFlashMs;
    this.hitPulseMs = ENEMY_CONFIG.hitPulseMs;
    this.punchScale = ENEMY_CONFIG.hitPulseScale;

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      if (this.entityPool) {
        this.entityPool.releaseEnemy(this, true);
      } else {
        this.kill();
      }
    }
  }

  private applySpriteSheet(): void {
    const image: ImageInfo | null = this.catalog?.get(this.typeId) ?? null;
    if (!image) return;

    this.anims = {};
    this.animSheet = { image, width: ENEMY_FRAME_WIDTH, height: ENEMY_FRAME_HEIGHT };
    const walkFrameTimeSec = 1 / ENEMY_CONFIG.walkAnimFps;
    this.addAnim('walk', walkFrameTimeSec, [0, 1, 2, 3]);
    this.currentAnim = this.anims.walk ?? null;

    if (this.context.renderer) {
      this.tile = new Tile(
        this.animSheet.image,
        0,
        ENEMY_FRAME_WIDTH,
        ENEMY_FRAME_HEIGHT,
        this.getEffectiveScale(),
      );
    }
  }

  protected getEffectiveScale(): number {
    return this.baseDisplayScale * this.punchScale * this.squashScale;
  }

  getSpriteDisplayHeight(): number {
    return ENEMY_FRAME_HEIGHT * this.getEffectiveScale();
  }

  getDamageNumberScale(): number {
    return DAMAGE_NUMBER_CONFIG.displayScale;
  }

  /** 데미지 숫자가 뜰 월드 앵커 (라벨 중심 기준) */
  getDamageNumberAnchor(): { x: number; y: number; z: number } {
    const spriteH = this.getSpriteDisplayHeight();
    const centerY = this.pos.y + this.size.y / 2;
    return {
      x: this.pos.x + this.size.x / 2,
      y: centerY - spriteH * 0.5 - DAMAGE_NUMBER_CONFIG.headMarginPx,
      z: this.pos.z + DAMAGE_NUMBER_CONFIG.zOffset,
    };
  }

  protected updateHitFx(deltaMs: number): void {
    if (this.hitFlashMs > 0) {
      this.hitFlashMs = Math.max(0, this.hitFlashMs - deltaMs);
    }
    if (this.hitPulseMs > 0) {
      this.hitPulseMs = Math.max(0, this.hitPulseMs - deltaMs);
      const t = this.hitPulseMs / ENEMY_CONFIG.hitPulseMs;
      this.punchScale = 1 + (ENEMY_CONFIG.hitPulseScale - 1) * t;
    } else {
      this.punchScale = 1;
    }
  }

  protected syncTileVisuals(): void {
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
      this.tile.quad.rotation[2] = this.wobbleAngle;
    }

    this.updateQuad();
  }

  updateQuad(): void {
    const flashing = this.hitFlashMs > 0;
    const prevDynamicLight = this.dynamicLight;
    if (flashing) {
      this.dynamicLight = false;
    }

    super.updateQuad();

    this.dynamicLight = prevDynamicLight;

    if (!this.tile) return;

    if (flashing) {
      const t = 1 - this.hitFlashMs / ENEMY_CONFIG.hitFlashMs;
      const fade = 1 - t * t;
      const flicker = 0.88 + 0.12 * Math.abs(Math.sin(t * Math.PI * 4));
      const boost = 1 + ENEMY_CONFIG.hitFlashBoost * fade * flicker;
      this.tile.quad.setColor({ r: boost, g: boost, b: boost });
      this.tile.quad.setAlpha(1);
    } else {
      this.tile.quad.setColor(this.baseColor);
      this.tile.quad.setAlpha(1);
    }
  }

  protected findPlayer(): RunnerPlayerEntity | null {
    const game = this.context.game;
    if (!game) return null;
    for (const e of game.entities) {
      if (e.type === TPFEntity.TYPE.A && !e._killed) {
        return e as RunnerPlayerEntity;
      }
    }
    return null;
  }
}
