import {
  BOSS_CONFIG,
  computeBossHealth,
  pickRandomBossType,
  type BossType,
} from '../config/BossConfig.ts';
import type { BringerPatternId } from '../config/BossAttackPatternConfig.ts';
import {
  BRINGER_PATTERN_CONFIG,
  DEMON_PATTERN_CONFIG,
  GUARDIAN_PATTERN_CONFIG,
  buildBringerSafeMask,
  demonBurstDelayMs,
  pickDemonBurstFirePatterns,
  pickRandomFirePattern,
  type FireSpawnPattern,
} from '../config/BossPatternConfig.ts';
import { FIRE_OBSTACLE_CONFIG } from '../config/FireObstacleConfig.ts';
import {
  corridorInnerMaxX,
  corridorInnerMinX,
  corridorRowSlotPosXs,
  spawnAheadY,
} from '../config/RunGameConfig.ts';
import type BossEntity from '../entities/BossEntity.ts';
import type BringerBeamSlotEntity from '../entities/BringerBeamSlotEntity.ts';
import type RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';
import type { EntityPool } from './EntityPool.ts';
import { BossPatternDirector } from './BossPatternDirector.ts';
import type { RunSession } from './RunSession.ts';
import { sfxManager } from './SfxManager.ts';
import { hideBossWarning, showBossWarning } from '../ui/BossWarningDom.ts';
type BossPhase = 'idle' | 'warning' | 'active' | 'reward';
type BringerWavePhase = 'none' | 'preview' | 'danger';
interface DemonStep {
  delayBeforeMs: number;
  pattern?: FireSpawnPattern;
  rowY?: number;
}
interface GuardianStep {
  delayBeforeMs: number;
  offsets: readonly number[];
}
export class BossDirector {
  private phase: BossPhase = 'idle';
  private nextBossAtMs: number = BOSS_CONFIG.bossIntervalMs;
  private warningElapsedMs = 0;
  private patternCooldownRemainingMs = 0;
  private activeBoss: BossEntity | null = null;
  private readonly patternDirector = new BossPatternDirector();
  private bringerSlots: BringerBeamSlotEntity[] = [];
  private bringerRowGroups: BringerBeamSlotEntity[][] = [];
  private bringerPatternId: BringerPatternId = 'gap_slide';
  private bringerSafeStart = 0;
  private bringerPreviewRemainingMs = 0;
  private bringerDangerRemainingMs = 0;
  private bringerWavePhase: BringerWavePhase = 'none';
  private bringerSlideKeyframeIndex = 0;
  private bringerSlideStepRemainingMs = 0;
  private bringerSlideElapsedMs = 0;
  private bringerSlidePingDir = 1;
  private bringerSlideInFinalHold = false;
  private bringerSlideFinalHoldMs = 0;
  /** sliding_wave 최종 확정 hold — 그 시점 Y 고정 */
  private bringerRowLockedY = 0;
  private demonSteps: DemonStep[] = [];
  private demonStepIndex = 0;
  private demonStepDelayMs = 0;
  private guardianSteps: GuardianStep[] = [];
  private guardianStepIndex = 0;
  private guardianStepDelayMs = 0;
  private readonly getPlayer: () => RunnerPlayerEntity | null;
  private readonly session: RunSession;
  private readonly entityPool: EntityPool;
  private readonly onBossPhaseEnd?: () => void;
  private readonly onBossSpawn?: (bossType: BossType) => void;
  private readonly onBossDeathAudio?: () => void;
  private readonly onBossDefeatedAudio?: () => void;
  constructor(
    getPlayer: () => RunnerPlayerEntity | null,
    session: RunSession,
    entityPool: EntityPool,
    onBossPhaseEnd?: () => void,
    onBossSpawn?: (bossType: BossType) => void,
    onBossDeathAudio?: () => void,
    onBossDefeatedAudio?: () => void,
  ) {
    this.getPlayer = getPlayer;
    this.session = session;
    this.entityPool = entityPool;
    this.onBossPhaseEnd = onBossPhaseEnd;
    this.onBossSpawn = onBossSpawn;
    this.onBossDeathAudio = onBossDeathAudio;
    this.onBossDefeatedAudio = onBossDefeatedAudio;
  }
  get enemySpawnBlocked(): boolean {
    return this.phase !== 'idle';
  }
  get isBossActive(): boolean {
    return this.phase === 'active' && this.activeBoss != null && this.activeBoss.isAliveAndActive();
  }
  tick(deltaMs: number): void {
    if (this.session.isGameplayFrozen) return;
    const simDelta = this.session.simDeltaMs(deltaMs);
    const player = this.getPlayer();
    if (!player || player.isDead) return;
    if (this.phase === 'idle') {
      if (this.session.runElapsedMs >= this.nextBossAtMs) {
        this.startWarning();
      }
      return;
    }
    if (this.phase === 'warning') {
      this.warningElapsedMs += simDelta;
      if (this.warningElapsedMs >= BOSS_CONFIG.warningDurationMs) {
        this.spawnBoss(player);
      }
      return;
    }
    if (this.phase === 'active') {
      if (!this.activeBoss || this.activeBoss._killed) {
        this.endPhase();
        return;
      }
      this.tickBringerWave(simDelta);
      this.tickBossPattern(simDelta, player);
    }
  }
  private startWarning(): void {
    this.phase = 'warning';
    this.warningElapsedMs = 0;
    showBossWarning(BOSS_CONFIG.warningDurationMs);
    sfxManager.playBossWarning();
  }
  private spawnBoss(player: RunnerPlayerEntity): void {
    hideBossWarning();
    this.phase = 'active';
    this.patternCooldownRemainingMs = 0;
    this.clearBringerWave();
    this.clearDemonSequence();
    this.clearGuardianSequence();
    const bossType = pickRandomBossType();
    const health = computeBossHealth(bossType, this.session.runElapsedMs);
    const spawnY = spawnAheadY(player.pos.y);
    const spawnX = player.pos.x;
    const boss = this.entityPool.acquireBoss(spawnX, spawnY, {
      bossType,
      health,
      onBossDefeated: () => this.onBossDefeated(),
      onBossDeathStart: () => this.onBossDeathAudio?.(),
    });
    this.activeBoss = boss;
    this.onBossSpawn?.(bossType);
  }
  private onBossDefeated(): void {
    this.activeBoss = null;
    this.releaseAllBossEffects();
    this.phase = 'reward';
    this.onBossPhaseEnd?.();
    this.onBossDefeatedAudio?.();
  }
  completeBossReward(): void {
    if (this.phase !== 'reward') return;
    this.nextBossAtMs = this.session.runElapsedMs + BOSS_CONFIG.bossIntervalMs;
    this.phase = 'idle';
  }
  private endPhase(): void {
    this.activeBoss = null;
    this.releaseAllBossEffects();
    this.nextBossAtMs = this.session.runElapsedMs + BOSS_CONFIG.bossIntervalMs;
    this.phase = 'idle';
    hideBossWarning();
  }
  private releaseAllBossEffects(): void {
    this.entityPool.releaseAllBossEffects();
    this.clearBringerWave();
    this.clearDemonSequence();
    this.clearGuardianSequence();
    this.activeBoss?.endPatternHold();
  }
  private tickBossPattern(simDeltaMs: number, player: RunnerPlayerEntity): void {
    const boss = this.activeBoss;
    if (!boss) return;
    if (this.demonSteps.length > 0 && this.demonStepIndex < this.demonSteps.length) {
      this.tickDemonSequence(simDeltaMs);
      return;
    }
    if (this.guardianSteps.length > 0 && this.guardianStepIndex < this.guardianSteps.length) {
      this.tickGuardianSequence(simDeltaMs, boss, player);
      return;
    }
    if (boss.isCastingNow() || boss.isPatternHold()) return;
    if (this.bringerWavePhase !== 'none') return;
    if (this.patternCooldownRemainingMs > 0) {
      this.patternCooldownRemainingMs = Math.max(0, this.patternCooldownRemainingMs - simDeltaMs);
    }
    if (
      !boss.getIsAnchored() ||
      !boss.isMoving() ||
      this.patternCooldownRemainingMs > 0
    ) {
      return;
    }
    this.patternCooldownRemainingMs = BOSS_CONFIG.patternCooldownMs;
    boss.beginCast(() => this.executePattern(boss.getBossType(), boss, player));
  }
  private executePattern(
    bossType: BossType,
    boss: BossEntity,
    player: RunnerPlayerEntity,
  ): void {
    switch (bossType) {
      case 'demon':
        this.executeDemonPattern(boss, player);
        break;
      case 'guardian':
        this.executeGuardianPattern(boss, player);
        break;
      case 'bringer':
        this.executeBringerPattern(boss, player);
        break;
    }
  }
  private executeDemonPattern(boss: BossEntity, _player: RunnerPlayerEntity): void {
    const patternId = this.patternDirector.pickDemon(this.session.runElapsedMs);
    const cfg = DEMON_PATTERN_CONFIG;
    const baseRowY = boss.pos.y - cfg.fireRowAheadPx;
    switch (patternId) {
      case 'single_lane': {
        this.spawnFireRow(pickRandomFirePattern(), baseRowY);
        break;
      }
      case 'double_burst': {
        this.startDemonBurst(boss, baseRowY, 2);
        break;
      }
      case 'triple_burst': {
        this.startDemonBurst(boss, baseRowY, 3);
        break;
      }
      case 'wing_pair': {
        const steps: DemonStep[] = [
          { delayBeforeMs: 0, pattern: 'left', rowY: baseRowY },
          {
            delayBeforeMs: demonBurstDelayMs(cfg.wingPairIntervalMs),
            pattern: 'right',
            rowY: baseRowY,
          },
        ];
        this.beginDemonSequence(boss, steps);
        break;
      }
      case 'squeeze': {
        this.spawnFireRow('left', baseRowY);
        this.spawnFireRow('right', baseRowY);
        break;
      }
    }
  }
  private startDemonBurst(boss: BossEntity, baseRowY: number, count: number): void {
    const cfg = DEMON_PATTERN_CONFIG;
    const patterns = pickDemonBurstFirePatterns(count);
    const steps: DemonStep[] = patterns.map((pattern, i) => ({
      delayBeforeMs:
        i === 0 ? 0 : demonBurstDelayMs(cfg.burstShotIntervalMs),
      pattern,
      rowY: baseRowY - i * cfg.burstRowStaggerPx,
    }));
    this.beginDemonSequence(boss, steps);
  }
  private beginDemonSequence(boss: BossEntity, steps: DemonStep[]): void {
    if (steps.length === 0) return;
    boss.beginPatternHold();
    this.clearDemonSequence();
    this.demonSteps = steps;
    this.demonStepIndex = 0;
    this.demonStepDelayMs = 0;
  }
  private tickDemonSequence(simDeltaMs: number): void {
    this.demonStepDelayMs -= simDeltaMs;
    if (this.demonStepDelayMs > 0) return;
    const step = this.demonSteps[this.demonStepIndex];
    if (!step) {
      this.finishDemonSequence();
      return;
    }
    this.demonStepIndex += 1;
    if (step.pattern != null && step.rowY != null) {
      this.spawnFireRow(step.pattern, step.rowY);
    }
    const next = this.demonSteps[this.demonStepIndex];
    if (!next) {
      this.finishDemonSequence();
      return;
    }
    this.demonStepDelayMs = demonBurstDelayMs(next.delayBeforeMs);
  }
  private finishDemonSequence(): void {
    this.clearDemonSequence();
    this.activeBoss?.endPatternHold();
  }
  private clearDemonSequence(): void {
    this.demonSteps = [];
    this.demonStepIndex = 0;
    this.demonStepDelayMs = 0;
  }
  private executeGuardianPattern(boss: BossEntity, player: RunnerPlayerEntity): void {
    const patternId = this.patternDirector.pickGuardian(this.session.runElapsedMs);
    const cfg = GUARDIAN_PATTERN_CONFIG;
    let steps: GuardianStep[] = [];
    switch (patternId) {
      case 'single_lane':
        steps = [{ delayBeforeMs: 0, offsets: [0] }];
        break;
      case 'triple_tight':
        steps = [{ delayBeforeMs: 0, offsets: cfg.volleyLaneXOffsets }];
        break;
      case 'flank_pair':
        steps = [{ delayBeforeMs: 0, offsets: cfg.flankLaneXOffsets }];
        break;
      case 'stagger_burst':
        steps = [
          { delayBeforeMs: 0, offsets: [0] },
          {
            delayBeforeMs: Math.max(cfg.staggerBurstGapMs, cfg.minVolleyReactionMs),
            offsets: [cfg.volleyLaneXOffsets[0]!],
          },
          {
            delayBeforeMs: Math.max(cfg.staggerBurstRapidMs, cfg.minVolleyReactionMs),
            offsets: [cfg.volleyLaneXOffsets[1]!],
          },
          {
            delayBeforeMs: Math.max(cfg.staggerBurstRapidMs, cfg.minVolleyReactionMs),
            offsets: [cfg.volleyLaneXOffsets[2]!],
          },
        ];
        break;
      case 'wave_tight':
        steps = cfg.waveTightOffsets.map((offset, i) => ({
          delayBeforeMs:
            i === 0
              ? 0
              : Math.max(cfg.waveTightIntervalMs, cfg.minVolleyReactionMs),
          offsets: [offset],
        }));
        break;
    }
    if (steps.length === 0) return;
    if (steps.length === 1 && steps[0]!.offsets.length > 1) {
      this.spawnGuardianVolleys(boss, player, steps[0]!.offsets);
      return;
    }
    this.beginGuardianSequence(boss, steps, player);
  }
  private beginGuardianSequence(
    boss: BossEntity,
    steps: GuardianStep[],
    player: RunnerPlayerEntity,
  ): void {
    boss.beginPatternHold();
    this.clearGuardianSequence();
    this.guardianSteps = steps;
    this.guardianStepIndex = 0;
    this.guardianStepDelayMs = 0;
    this.guardianQueuedPlayer = player;
    this.guardianQueuedBoss = boss;
  }
  private guardianQueuedPlayer: RunnerPlayerEntity | null = null;
  private guardianQueuedBoss: BossEntity | null = null;
  private tickGuardianSequence(
    simDeltaMs: number,
    boss: BossEntity,
    player: RunnerPlayerEntity,
  ): void {
    this.guardianStepDelayMs -= simDeltaMs;
    if (this.guardianStepDelayMs > 0) return;
    const step = this.guardianSteps[this.guardianStepIndex];
    if (!step) {
      this.finishGuardianSequence();
      return;
    }
    this.guardianStepIndex += 1;
    const b = this.guardianQueuedBoss ?? boss;
    const p = this.guardianQueuedPlayer ?? player;
    this.spawnGuardianVolleys(b, p, step.offsets);
    const next = this.guardianSteps[this.guardianStepIndex];
    if (!next) {
      this.finishGuardianSequence();
      return;
    }
    this.guardianStepDelayMs = Math.max(next.delayBeforeMs, GUARDIAN_PATTERN_CONFIG.minVolleyReactionMs);
  }
  private finishGuardianSequence(): void {
    this.clearGuardianSequence();
    this.activeBoss?.endPatternHold();
  }
  private clearGuardianSequence(): void {
    this.guardianSteps = [];
    this.guardianStepIndex = 0;
    this.guardianStepDelayMs = 0;
    this.guardianQueuedPlayer = null;
    this.guardianQueuedBoss = null;
  }
  private spawnGuardianVolleys(
    boss: BossEntity,
    player: RunnerPlayerEntity,
    offsets: readonly number[],
  ): void {
    const cfg = GUARDIAN_PATTERN_CONFIG;
    const bossCx = boss.pos.x + boss.size.x / 2;
    const bossCy = boss.pos.y + boss.size.y * 0.5;
    const playerCx = player.pos.x + player.size.x / 2;
    const playerCy = player.pos.y + player.size.y / 2;
    const lead = cfg.spawnLeadDistancePx;
    const dx = playerCx - bossCx;
    const dy = playerCy - bossCy;
    const len = Math.hypot(dx, dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;
    // 레인 간격 — 이동 방향에 수직 (보스 좌·유저 우여도 패턴 폭 유지)
    const perpX = -dirY;
    const perpY = dirX;

    for (const offset of offsets) {
      const targetCx = playerCx + perpX * offset;
      const targetCy = playerCy + perpY * offset;
      const pathStartCx = targetCx - dirX * lead;
      const pathStartCy = targetCy - dirY * lead;

      this.entityPool.acquireGuardianVolley({
        pathStartCx,
        pathStartCy,
        targetCx,
        targetCy,
      });
    }
  }
  private executeBringerPattern(boss: BossEntity, player: RunnerPlayerEntity): void {
    this.clearBringerWave();
    const patternId = this.patternDirector.pickBringer(this.session.runElapsedMs);
    this.bringerPatternId = patternId;
    const cfg = BRINGER_PATTERN_CONFIG;
    const py = player.pos.y + player.size.y / 2;

    if (patternId === 'sliding_wave') {
      const rowY = py - cfg.slideRowSpawnFarPx;
      this.bringerRowGroups = [this.spawnBringerRow(rowY)];
    } else {
      const rowY = boss.pos.y - cfg.rowAheadPx;
      this.bringerRowGroups = [this.spawnBringerRow(rowY)];
    }
    this.bringerSlots = this.bringerRowGroups.flat();
    if (this.bringerSlots.length === 0) return;
    if (patternId === 'gap_slide') {
      const count = this.bringerRowGroups[0]?.length ?? 0;
      const safeLen = cfg.safeSlotCount;
      this.bringerSafeStart =
        count <= safeLen ? 0 : Math.floor(Math.random() * (count - safeLen + 1));
      this.bringerPreviewRemainingMs = cfg.previewHoldMs;
    } else {
      this.bringerSafeStart = cfg.slidingWaveKeyframes[0] ?? 0;
      this.bringerSlideKeyframeIndex = 0;
      this.bringerSlidePingDir = 1;
      this.bringerSlideElapsedMs = 0;
      this.bringerSlideStepRemainingMs = cfg.slideStepMs;
      this.bringerSlideInFinalHold = false;
      this.bringerSlideFinalHoldMs = 0;
      this.bringerPreviewRemainingMs = 0;
      this.applyBringerPreviewHighlights();
    }
    for (const slot of this.bringerSlots) {
      if (!slot._killed) slot.setMode('safe');
    }
    boss.beginPatternHold();
    this.bringerWavePhase = 'preview';
    this.bringerDangerRemainingMs = 0;
  }
  private spawnBringerRow(rowY: number): BringerBeamSlotEntity[] {
    const cfg = BRINGER_PATTERN_CONFIG;
    const visualW = cfg.frameWidthPx * cfg.displayScale;
    const posXs = corridorRowSlotPosXs(cfg.rowSlotCount, visualW, cfg.hitboxWidthPx);
    const slots: BringerBeamSlotEntity[] = [];
    for (const x of posXs) {
      const slot = this.entityPool.acquireBringerBeam(x, rowY, { mode: 'safe' });
      if (slot) slots.push(slot);
    }
    return slots;
  }
  private syncBringerRowPreviewHold(): void {
    const boss = this.activeBoss;
    const player = this.getPlayer();
    if (!boss || boss._killed || !player || player.isDead) return;
    const py = player.pos.y + player.size.y / 2;
    const cfg = BRINGER_PATTERN_CONFIG;

    if (this.bringerPatternId === 'sliding_wave') {
      if (!this.bringerSlideInFinalHold) return;
      for (const slot of this.bringerSlots) {
        if (slot._killed) continue;
        slot.setAnchoredRowY(this.bringerRowLockedY);
      }
      return;
    }

    const holdCenterY = py - BOSS_CONFIG.minStopDistanceAheadPx;
    const bossY = holdCenterY - boss.size.y / 2;
    let aheadPx = cfg.rowAheadPx;
    if (this.bringerPatternId === 'gap_slide') {
      const total = cfg.previewHoldMs;
      const t = total > 0 ? 1 - this.bringerPreviewRemainingMs / total : 1;
      aheadPx *= 1 - t * (1 - cfg.gapSlideApproachEndRatio);
    }
    const rowY = bossY - aheadPx;
    for (const slot of this.bringerSlots) {
      if (slot._killed) continue;
      slot.setAnchoredRowY(rowY);
    }
  }
  private tickBringerWave(simDeltaMs: number): void {
    if (this.bringerWavePhase === 'none') return;
    if (this.bringerWavePhase === 'preview') {
      if (this.bringerPatternId === 'sliding_wave') {
        this.tickBringerSlidingPreview(simDeltaMs);
        this.syncBringerRowPreviewHold();
        return;
      }
      this.syncBringerRowPreviewHold();
      this.bringerPreviewRemainingMs -= simDeltaMs;
      if (this.bringerPreviewRemainingMs <= 0) {
        this.activateBringerDangerZones();
        this.bringerWavePhase = 'danger';
        this.bringerDangerRemainingMs = BRINGER_PATTERN_CONFIG.dangerDurationMs;
        this.activeBoss?.endPatternHold();
      }
      return;
    }
    if (this.bringerWavePhase === 'danger') {
      this.bringerDangerRemainingMs -= simDeltaMs;
      if (this.bringerDangerRemainingMs <= 0) {
        this.clearBringerWave();
      }
    }
  }
  private shouldLockBringerSlidingPreview(): boolean {
    const cfg = BRINGER_PATTERN_CONFIG;
    if (this.bringerSlideElapsedMs >= cfg.slideOscillateUntilMs) return true;

    const player = this.getPlayer();
    const anchor = this.bringerSlots.find((s) => !s._killed);
    if (!player || player.isDead || !anchor) return false;

    const py = player.pos.y + player.size.y / 2;
    const rowCy = anchor.pos.y + cfg.hitboxHeightPx / 2;
    const distanceAhead = py - rowCy;
    return distanceAhead <= cfg.slideLockWhenWithinPx;
  }
  private beginBringerSlidingFinalHold(): void {
    const cfg = BRINGER_PATTERN_CONFIG;
    this.bringerSlideInFinalHold = true;
    this.bringerSlideFinalHoldMs = cfg.slideFinalHoldMs;
    const anchor = this.bringerSlots.find((s) => !s._killed);
    this.bringerRowLockedY = anchor?.pos.y ?? 0;
    this.applyBringerPreviewHighlights();
  }
  private tickBringerSlidingPreview(simDeltaMs: number): void {
    const cfg = BRINGER_PATTERN_CONFIG;
    this.bringerSlideElapsedMs += simDeltaMs;
    if (this.bringerSlideInFinalHold) {
      this.bringerSlideFinalHoldMs -= simDeltaMs;
      if (this.bringerSlideFinalHoldMs <= 0) {
        this.activateBringerDangerZones();
        this.bringerWavePhase = 'danger';
        this.bringerDangerRemainingMs = cfg.dangerDurationMs;
        this.activeBoss?.endPatternHold();
      }
      return;
    }
    if (this.shouldLockBringerSlidingPreview()) {
      this.beginBringerSlidingFinalHold();
      return;
    }
    this.bringerSlideStepRemainingMs -= simDeltaMs;
    if (this.bringerSlideStepRemainingMs > 0) return;
    const keyframes = cfg.slidingWaveKeyframes;
    const lastKf = keyframes.length - 1;
    let kfIdx = this.bringerSlideKeyframeIndex + this.bringerSlidePingDir;
    if (kfIdx >= lastKf) {
      kfIdx = lastKf;
      this.bringerSlidePingDir = -1;
    } else if (kfIdx <= 0) {
      kfIdx = 0;
      this.bringerSlidePingDir = 1;
    }
    this.bringerSlideKeyframeIndex = kfIdx;
    this.bringerSafeStart = keyframes[kfIdx] ?? 0;
    this.applyBringerPreviewHighlights();
    this.bringerSlideStepRemainingMs = cfg.slideStepMs;
  }
  private applyBringerPreviewHighlights(): void {
    if (this.bringerPatternId !== 'sliding_wave') return;
    const cfg = BRINGER_PATTERN_CONFIG;
    const safeLen = cfg.safeSlotCount;
    const safeStart = this.bringerSafeStart;
    for (const group of this.bringerRowGroups) {
      for (let i = 0; i < group.length; i++) {
        const slot = group[i];
        if (!slot || slot._killed) continue;
        const inWindow = i >= safeStart && i < safeStart + safeLen;
        slot.setPreviewHighlight(inWindow);
      }
    }
  }
  private activateBringerDangerZones(): void {
    const group = this.bringerRowGroups[0];
    if (!group || group.length === 0) return;
    const mask = buildBringerSafeMask(
      this.bringerPatternId,
      group.length,
      this.bringerSafeStart,
    );
    this.applyBringerMaskToGroup(group, mask);
  }
  private applyBringerMaskToGroup(
    slots: BringerBeamSlotEntity[],
    mask: boolean[],
  ): void {
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot || slot._killed) continue;
      slot.clearPreviewHighlight();
      slot.setMode(mask[i] ? 'safe' : 'danger');
    }
  }
  private clearBringerWave(): void {
    for (const slot of this.bringerSlots) {
      if (!slot._killed) {
        this.entityPool.releaseBringerBeam(slot);
      }
    }
    this.bringerSlots = [];
    this.bringerRowGroups = [];
    this.bringerPatternId = 'gap_slide';
    this.bringerSafeStart = 0;
    this.bringerPreviewRemainingMs = 0;
    this.bringerDangerRemainingMs = 0;
    this.bringerWavePhase = 'none';
    this.bringerSlideKeyframeIndex = 0;
    this.bringerSlideStepRemainingMs = 0;
    this.bringerSlideElapsedMs = 0;
    this.bringerSlidePingDir = 1;
    this.bringerSlideInFinalHold = false;
    this.bringerSlideFinalHoldMs = 0;
    this.bringerRowLockedY = 0;
    this.activeBoss?.endPatternHold();
  }
  private spawnFireRow(pattern: FireSpawnPattern, rowY: number): void {
    const tileW =
      FIRE_OBSTACLE_CONFIG.frameWidthPx * FIRE_OBSTACLE_CONFIG.displayScale;
    const { startX, endX } = getFirePatternXRange(pattern, tileW);
    const span = endX - startX;
    const count = Math.max(2, Math.round(span / FIRE_OBSTACLE_CONFIG.tileSpacingPx) + 1);
    const step = count > 1 ? span / (count - 1) : 0;
    for (let i = 0; i < count; i++) {
      const x = count > 1 ? startX + step * i : startX + span / 2;
      this.entityPool.acquireFire(x, rowY);
    }
  }
  reset(): void {
    this.phase = 'idle';
    this.nextBossAtMs = BOSS_CONFIG.bossIntervalMs;
    this.warningElapsedMs = 0;
    this.patternCooldownRemainingMs = 0;
    this.activeBoss = null;
    this.patternDirector.reset();
    this.clearBringerWave();
    this.clearDemonSequence();
    this.clearGuardianSequence();
    hideBossWarning();
  }
}
function getFirePatternXRange(
  pattern: FireSpawnPattern,
  tileWidth: number,
): { startX: number; endX: number } {
  const minX = corridorInnerMinX();
  const maxX = corridorInnerMaxX(tileWidth);
  const span = maxX - minX;
  const third = span / 3;
  switch (pattern) {
    case 'left':
      return { startX: minX, endX: minX + third };
    case 'center':
      return { startX: minX + third, endX: minX + 2 * third };
    case 'right':
      return { startX: minX + 2 * third, endX: maxX };
  }
}
