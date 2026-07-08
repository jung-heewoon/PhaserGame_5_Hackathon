import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import { Tile } from 'twopointfive-phaser-3/src/twopointfive/world/tile.ts';
import type { EntityContext, ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import { GUARDIAN_PATTERN_CONFIG } from '../config/BossPatternConfig.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import type { EntityPool } from '../systems/EntityPool.ts';
import type { RunSession } from '../systems/RunSession.ts';
import type RunnerPlayerEntity from './RunnerPlayerEntity.ts';
import { showFrozenOverlay } from '../ui/FrozenStatusDom.ts';

/**
 * 고정 월드 좌표에서 rise/fall만 하는 얼음 기둥 슬롯.
 * 이동은 GuardianVolleyEntity가 헤드만 담당하고, 슬롯 위치는 스폰 시 고정.
 */
export default class GuardianSpikeEntity extends TPFEntity {
  zIndex = 2;

  private readonly spikeImage: ImageInfo | null;
  private readonly session: RunSession | null;
  private readonly entityPool: EntityPool | null;
  private slotActive = false;
  private hasHit = false;
  private riseAmount = 0;
  private damageRiseAmount = 0;
  private cosmeticMs = 0;
  /** volley 진행 방향 — 피격 AABB만 트랙 lag */
  private volleyDirX = 0;
  private volleyDirY = -1;
  private damageTrackLagPx = 0;
  /** updateQuad 전용 수직 오프셋 — pos.z는 TPF가 0 미만 클램프 */
  private visualLiftZ = 0;

  constructor(
    x: number,
    y: number,
    settings: Record<string, unknown> | null,
    context: Partial<EntityContext> | null,
  ) {
    super(x, y, settings, context);
    this.type = TPFEntity.TYPE.B;
    this.checkAgainst = TPFEntity.TYPE.NONE;
    this.collides = TPFEntity.COLLIDES.NEVER;
    this.size = {
      x: GUARDIAN_PATTERN_CONFIG.hitboxWidthPx,
      y: GUARDIAN_PATTERN_CONFIG.hitboxHeightPx,
    };
    this.scale = GUARDIAN_PATTERN_CONFIG.spikeDisplayScale;
    this.gravityFactor = 0;
    this.dynamicLight = false;
    this.rotateToView = true;
    this.spikeImage = (settings?.spikeImage as ImageInfo) ?? null;
    this.session = (settings?.session as RunSession) ?? null;
    this.entityPool = (settings?.entityPool as EntityPool) ?? null;
  }

  isSlotActive(): boolean {
    return this.slotActive && !this._killed;
  }

  /** 월드 고정 위치 (히트박스 top-left) */
  activateSlot(worldX: number, worldY: number): void {
    this._killed = false;
    this.slotActive = true;
    this.hasHit = false;
    this.cosmeticMs = 0;
    this.pos.x = worldX;
    this.pos.y = worldY;
    this.pos.z = 0;
    this.last.x = worldX;
    this.last.y = worldY;
    this.vel.x = 0;
    this.vel.y = 0;
    this.vel.z = 0;
    this.type = TPFEntity.TYPE.B;

    this.ensureVisualTile();
    this.setRiseAmount(0);
    this.setDamageRise(0);
    this.syncTileVisuals();
    if (this.context.culledSectors) {
      this.context.culledSectors.moveEntity(this);
    }
  }

  deactivateSlot(): void {
    if (!this.slotActive) return;
    this.slotActive = false;
    if (this.entityPool) {
      this.entityPool.releaseGuardianSpike(this);
    } else {
      this.kill();
    }
  }

  setRiseAmount(rise: number): void {
    const cfg = GUARDIAN_PATTERN_CONFIG;
    this.riseAmount = Math.max(0, Math.min(1, rise));
    const buryDepth = this.visualHeightPx() * cfg.riseBuryDepthRatio;
    this.visualLiftZ = -buryDepth * (1 - this.riseAmount);
    this.setDisplayFrame(this.cosmeticFrameIndex());
  }

  /** 연출과 분리 — volley가 트랙 lag 적용 후 전달 */
  setDamageRise(rise: number): void {
    this.damageRiseAmount = Math.max(0, Math.min(1, rise));
  }

  setDamageContext(dirX: number, dirY: number, trackLagPx: number): void {
    this.volleyDirX = dirX;
    this.volleyDirY = dirY;
    this.damageTrackLagPx = trackLagPx;
  }

  tickCosmetic(deltaMs: number): void {
    this.cosmeticMs += deltaMs;
    this.setDisplayFrame(this.cosmeticFrameIndex());
  }

  tryHitPlayer(): void {
    if (!this.slotActive || this.hasHit || !this.isDamageActive()) return;

    const player = this.findPlayer();
    if (!player || player._killed || player.isDead) return;
    if (!this.overlapsPlayerContact(player)) return;

    this.hasHit = true;
    player.receiveDamage(GUARDIAN_PATTERN_CONFIG.spikeDamage, this);
    player.applyFreeze(GUARDIAN_PATTERN_CONFIG.frozenDurationMs);
    showFrozenOverlay(GUARDIAN_PATTERN_CONFIG.frozenDurationMs);
  }

  update(): void {
    if (this._killed || !this.slotActive) return;

    const rawTick = this.context.tick ?? 1 / 60;
    const tick = this.session ? this.session.simTickSec(rawTick) : rawTick;
    if (tick <= 0) return;

    this.tickCosmetic(tick * 1000);
    this.syncTileVisuals();
    this.tryHitPlayer();
  }

  private trackCenterY(): number {
    return this.pos.y + this.size.y / 2;
  }

  private visualHeightPx(): number {
    const cfg = GUARDIAN_PATTERN_CONFIG;
    return cfg.frameHeightPx * cfg.spikeDisplayScale;
  }

  private cosmeticFrameIndex(): number {
    const cfg = GUARDIAN_PATTERN_CONFIG;
    return Math.floor(this.cosmeticMs / cfg.cosmeticFrameMs) % cfg.frameCount;
  }

  private isDamageActive(): boolean {
    return this.damageRiseAmount >= GUARDIAN_PATTERN_CONFIG.damageRiseThreshold;
  }

  private ensureVisualTile(): void {
    if (!this.spikeImage) return;
    const cfg = GUARDIAN_PATTERN_CONFIG;
    this.anims = {};
    this.animSheet = {
      image: this.spikeImage,
      width: cfg.frameWidthPx,
      height: cfg.frameHeightPx,
    };
    if (this.context.renderer && !this.tile) {
      this.tile = new Tile(this.spikeImage, 0, cfg.frameWidthPx, cfg.frameHeightPx, this.scale);
    }
  }

  private setDisplayFrame(frameIndex: number): void {
    if (!this.spikeImage || !this.animSheet) return;
    const key = `f${frameIndex}`;
    if (!this.anims[key]) {
      const anim = this.addAnim(key, 1, [frameIndex]);
      anim.rewind();
    }
    this.currentAnim = this.anims[key] ?? null;
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
    if (this.rotateToView && this.context.camera) {
      this.tile.quad.rotation[1] = this.context.camera.rotation[1];
    }
    this.updateQuad();
  }

  override updateQuad(): void {
    if (!this.tile || !this.animSheet) return;

    const ctx = this.context;
    const camera = ctx.camera;
    const collisionMap = ctx.collisionMap;
    const culledSectors = ctx.culledSectors;

    const halfH = this.visualHeightPx() / 2;
    const effectiveZ = this.pos.z + this.visualLiftZ;

    const tpos = this.tile.quad.position;
    tpos[0] = this.pos.x + this.size.x / 2;
    tpos[2] = this.pos.y + this.size.y / 2;
    const ts = collisionMap && 'tilesize' in collisionMap ? collisionMap.tilesize : 64;
    tpos[1] = effectiveZ - ts / 2 + halfH;

    if (this.rotateToView && camera) {
      this.tile.quad.rotation[1] = camera.rotation[1];
    }
    this.tile.quad._dirty = true;

    if (!this._killed && culledSectors) {
      culledSectors.moveEntity(this);
    }
  }

  private overlapsPlayerContact(player: RunnerPlayerEntity): boolean {
    const cfg = GUARDIAN_PATTERN_CONFIG;
    const riseExtent = this.visualHeightPx() * this.damageRiseAmount * cfg.damageRiseYExtentRatio;

    const pcx = player.pos.x + player.size.x / 2;
    const pcy = player.pos.y + player.size.y / 2;
    const scx = this.pos.x + this.size.x / 2 - this.volleyDirX * this.damageTrackLagPx;
    const scy = this.trackCenterY() - this.volleyDirY * this.damageTrackLagPx + riseExtent / 2;
    const dx = Math.abs(pcx - scx);
    const dy = Math.abs(pcy - scy);
    const playerHalfW = RUN_GAME_CONFIG.playerContactHalfWidth;
    const playerHalfH = RUN_GAME_CONFIG.playerContactHalfHeight;
    const spikeHalfW = cfg.hitboxWidthPx / 2;
    const spikeHalfH = cfg.hitboxHeightPx / 2;
    return dx <= playerHalfW + spikeHalfW && dy <= playerHalfH + spikeHalfH + riseExtent / 2;
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
}
