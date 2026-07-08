import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import type { EntityContext } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import { GUARDIAN_PATTERN_CONFIG } from '../config/BossPatternConfig.ts';
import {
  clampToCorridorX,
} from '../config/RunGameConfig.ts';
import type { EntityPool } from '../systems/EntityPool.ts';
import type { RunSession } from '../systems/RunSession.ts';
import type GuardianSpikeEntity from './GuardianSpikeEntity.ts';

export interface GuardianVolleySpawnParams {
  pathStartCx: number;
  pathStartCy: number;
  targetCx: number;
  targetCy: number;
}

interface VolleySlot {
  pathDistance: number;
  spike: GuardianSpikeEntity;
}

/**
 * 단일 투사체 헤드 — 캐스트 시점 플레이어 방향 고정 궤적 + 통로 X 클램프.
 */
export default class GuardianVolleyEntity extends TPFEntity {
  private readonly session: RunSession | null;
  private readonly entityPool: EntityPool | null;
  private dirX = 0;
  private dirY = -1;
  private pathStartCx = 0;
  private pathStartCy = 0;
  private headPathDistance = 0;
  private targetPathDistance = 0;
  private maxPathDistance = 0;
  private passMargin = 0;
  private volleyActive = false;
  private slots: VolleySlot[] = [];
  private nextSpawnPathD = 0;

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
    this.gravityFactor = 0;
    this.dynamicLight = false;
    this.size = { x: 1, y: 1 };
    this.session = (settings?.session as RunSession) ?? null;
    this.entityPool = (settings?.entityPool as EntityPool) ?? null;
  }

  isVolleyActive(): boolean {
    return this.volleyActive && !this._killed;
  }

  configureVolley(params: GuardianVolleySpawnParams): void {
    const cfg = GUARDIAN_PATTERN_CONFIG;
    this.volleyActive = true;
    this.slots = [];
    this.headPathDistance = 0;
    this.pathStartCx = this.clampCenterX(params.pathStartCx);
    this.pathStartCy = params.pathStartCy;

    const targetCx = this.clampCenterX(params.targetCx);
    const targetCy = params.targetCy;
    const dx = targetCx - this.pathStartCx;
    const dy = targetCy - this.pathStartCy;
    const len = Math.hypot(dx, dy) || 1;
    this.dirX = dx / len;
    this.dirY = dy / len;
    this.targetPathDistance = len;
    this.maxPathDistance = this.targetPathDistance + cfg.maxTravelBeyondTargetPx;
    this.passMargin = cfg.passDespawnMarginPx;
    this.nextSpawnPathD = 0;

    this.syncHeadWorldPos();
    this.ensureInitialSlots();
  }

  update(): void {
    if (this._killed || !this.volleyActive) return;

    const rawTick = this.context.tick ?? 1 / 60;
    const tick = this.session ? this.session.simTickSec(rawTick) : rawTick;
    if (tick <= 0) return;

    const cfg = GUARDIAN_PATTERN_CONFIG;
    this.headPathDistance += cfg.travelSpeedPx * tick;

    this.syncHeadWorldPos();
    this.ensureTrailSlots();
    this.updateSlotPhases();

    if (this.shouldFinishVolley()) {
      this.finishVolley();
    }
  }

  private clampCenterX(cx: number): number {
    const w = GUARDIAN_PATTERN_CONFIG.hitboxWidthPx;
    const posX = cx - w / 2;
    return clampToCorridorX(posX, w) + w / 2;
  }

  private shouldFinishVolley(): boolean {
    if (this.headPathDistance > this.maxPathDistance) return true;
    return this.headPathDistance >= this.targetPathDistance + this.passMargin;
  }

  finishVolley(): void {
    if (!this.volleyActive) return;
    this.abortVolley();
    if (this.entityPool) {
      this.entityPool.releaseGuardianVolley(this);
    } else {
      this.kill();
    }
  }

  abortVolley(): void {
    this.volleyActive = false;
    for (const slot of this.slots) {
      if (slot.spike.isSlotActive()) {
        slot.spike.deactivateSlot();
      }
    }
    this.slots = [];
  }

  shiftWorldY(deltaY: number): void {
    this.pathStartCy += deltaY;
    this.syncHeadWorldPos();
  }

  private syncHeadWorldPos(): void {
    const cx = this.clampCenterX(this.pathStartCx + this.dirX * this.headPathDistance);
    const cy = this.pathStartCy + this.dirY * this.headPathDistance;
    this.pos.x = cx;
    this.pos.y = cy;
    this.last.x = cx;
    this.last.y = cy;
  }

  private slotWorldPos(pathD: number): { x: number; y: number } {
    const cfg = GUARDIAN_PATTERN_CONFIG;
    const cx = this.clampCenterX(this.pathStartCx + this.dirX * pathD);
    const cy = this.pathStartCy + this.dirY * pathD;
    return {
      x: cx - cfg.hitboxWidthPx / 2,
      y: cy - cfg.hitboxHeightPx / 2,
    };
  }

  private ensureInitialSlots(): void {
    const cfg = GUARDIAN_PATTERN_CONFIG;
    const step = cfg.slotSpawnStepPx;
    const aheadCount = cfg.trailSlotsAhead + 1;
    for (let i = 0; i < aheadCount; i++) {
      this.spawnSlotAtPathD(i * step);
    }
    this.nextSpawnPathD = aheadCount * step;
  }

  private ensureTrailSlots(): void {
    const cfg = GUARDIAN_PATTERN_CONFIG;
    const step = cfg.slotSpawnStepPx;
    const maxAhead = this.headPathDistance + cfg.slotWaveLengthPx * 2 + step;
    while (this.nextSpawnPathD <= maxAhead) {
      this.spawnSlotAtPathD(this.nextSpawnPathD);
      this.nextSpawnPathD += step;
    }
  }

  private spawnSlotAtPathD(pathD: number): void {
    if (!this.entityPool) return;
    if (this.slots.some((s) => Math.abs(s.pathDistance - pathD) < 1)) return;

    const pos = this.slotWorldPos(pathD);
    const spike = this.entityPool.acquireGuardianSpikeSlot(pos.x, pos.y);
    if (!spike) return;

    this.slots.push({ pathDistance: pathD, spike });
  }

  private updateSlotPhases(): void {
    const cfg = GUARDIAN_PATTERN_CONFIG;
    const waveLen = cfg.slotWaveLengthPx;
    const step = cfg.slotSpawnStepPx;
    const removeBehind = -(waveLen + step * 0.5);
    const removeFarAhead = waveLen * 2 + step * 2;

    const keep: VolleySlot[] = [];
    for (const slot of this.slots) {
      if (!slot.spike.isSlotActive()) continue;

      const along = slot.pathDistance - this.headPathDistance;
      if (along < removeBehind || along > removeFarAhead) {
        slot.spike.deactivateSlot();
        continue;
      }

      slot.spike.setRiseAmount(this.sampleWaveRise(along, waveLen));
      const damageAlong = along + cfg.damageHitLagPx;
      slot.spike.setDamageRise(this.sampleWaveRise(damageAlong, waveLen));
      slot.spike.setDamageContext(this.dirX, this.dirY, cfg.damageTrackLagPx);
      keep.push(slot);
    }
    this.slots = keep;
  }

  private sampleWaveRise(along: number, waveLen: number): number {
    if (along > waveLen || along < -waveLen) return 0;
    return (1 + Math.cos((along / waveLen) * Math.PI)) * 0.5;
  }
}
