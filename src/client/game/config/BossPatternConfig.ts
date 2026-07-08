import {
  FIRE_SPAWN_PATTERNS,
  pickRandomFirePattern,
  type FireSpawnPattern,
} from './FireObstacleConfig.ts';
import type { BringerPatternId } from './BossAttackPatternConfig.ts';

export { pickRandomFirePattern, type FireSpawnPattern };

export const GUARDIAN_PATTERN_CONFIG = {
  spikeDisplayScale: 3.2,
  frameWidthPx: 15,
  frameHeightPx: 34,
  frameCount: 3,
  /** 목표 지점에서 역방향으로 이만큼 떨어진 곳에서 투사체 스폰 */
  spawnLeadDistancePx: 580,
  travelSpeedPx: 120,
  volleyCount: 3,
  /** 3투사체 — 플레이어 근처 좁은 간격 */
  volleyLaneXOffsets: [-48, 0, 48] as const,
  /** 양옆만 (중앙 비움) — 플레이어 바로 옆 */
  flankLaneXOffsets: [-40, 40] as const,
  /** 연속 파도용 좁은 5레인 */
  waveTightOffsets: [-56, -28, 0, 28, 56] as const,
  /** 파도 1주기 길이 — 작을수록 세트·세트 사이 간격 감소 */
  slotWaveLengthPx: 36,
  /** 스파이크 스폰 간격 — waveLength/2 (반쯤 겹치는 파도) */
  slotSpawnStepPx: 18,
  /** 헤드 앞쪽 유지할 슬롯 수 (spawn step 기준) */
  trailSlotsAhead: 6,
  /** updateQuad tpos[1] 오프셋 — pos.z는 TPF가 0 미만 클램프 */
  riseBuryDepthRatio: 1,
  /** 3프레임 동일 규격 — 연출용 순환 */
  cosmeticFrameMs: 95,
  passDespawnMarginPx: 140,
  /** 플레이어 통과 후에도 추적 여유 (플레이어 질주 대비) */
  maxTravelBeyondTargetPx: 960,
  damageRiseThreshold: 0.88,
  /** 피격 rise 파형 lag (0=연출 동시, ~40=많이 늦음) */
  damageHitLagPx: 20,
  /** 피격 중심 트랙 lag (volley 진행 반대, px) */
  damageTrackLagPx: 18,
  /** rise 기반 Y 히트박스 확장 비율 (1=수정 전, 0=고정 박스) */
  damageRiseYExtentRatio: 0.32,
  spikeDamage: 1,
  frozenDurationMs: 1000,
  hitboxWidthPx: 36,
  hitboxHeightPx: 22,
  staggerBurstGapMs: 650,
  staggerBurstRapidMs: 220,
  waveTightIntervalMs: 360,
  minVolleyReactionMs: 400,
} as const;

export const BRINGER_PATTERN_CONFIG = {
  frameWidthPx: 36,
  frameHeightPx: 57,
  frameCount: 16,
  displayScale: 2.1,
  /** 한 행 슬롯 수 (통로 가로 전체 균등 배치) */
  rowSlotCount: 9,
  /** 9칸 촘촘 배치용 히트박스/간격 (시각 폭보다 좁아 약간 겹침) */
  tileSpacingPx: 40,
  hitboxWidthPx: 40,
  hitboxHeightPx: 28,
  rowAheadPx: 100,
  safeFrameStart: 0,
  safeFrameEnd: 3,
  dangerFrameStart: 4,
  dangerFrameEnd: 12,
  safeAnimFps: 32,
  dangerAnimFps: 32,
  previewHoldMs: 1600,
  dangerDurationMs: 2400,
  contactDamage: 1,
  safeSlotCount: 2,
  /** gap_slide — 프리뷰 끝에서 플레이어 쪽으로 밀려온 비율 (1=변화 없음, 0.5=절반 거리) */
  gapSlideApproachEndRatio: 0.48,
  /** sliding_wave — safe 구간 좌↔중↔우 핑퐁 */
  slidingWaveKeyframes: [0, 3, 6] as const,
  slideStepMs: 240,
  /** 핑퐁 최대 시간 — `slideLockWhenWithinPx` 조건이 먼저 오면 더 일찍 확정 */
  slideOscillateUntilMs: 1000,
  /** 플레이어가 행에 이 거리(px)까지 접근하면 safe 구간 확정 */
  slideLockWhenWithinPx: 280,
  slideFinalHoldMs: 300,
  /** sliding_wave — 플레이어 앞 멀리 스폰; 프리뷰 중 setAnchoredRowY 미적용 → 러너 전진으로 접근 */
  slideRowSpawnFarPx: 540,
  skillOutlinePx: 1,
} as const;

export const DEMON_PATTERN_CONFIG = {
  fireRowAheadPx: 120,
  /** 단일 행 대신 2~3연속 불꽃을 쓸 확률 */
  burstChance: 0.52,
  /** burst 시 3연속 확률 — 나머지 burst는 2연속 */
  burstTripleChance: 0.14,
  burstCountMin: 2,
  burstCountMax: 3,
  /** 연속 샷 사이 간격(ms) */
  burstShotIntervalMs: 480,
  /** 연속 샷마다 앞쪽(Y-)으로 밀어 한 행 전체를 막지 않음 */
  burstRowStaggerPx: 80,
  minReactionMs: 400,
  wingPairIntervalMs: 480,
} as const;

/** 연속 샷용 — 행마다 1구간만 막도록 각 샷은 서로 다른 레인 우선 */
export function pickDemonBurstFirePatterns(count: number): FireSpawnPattern[] {
  const lanes = [...FIRE_SPAWN_PATTERNS];
  const out: FireSpawnPattern[] = [];
  for (let i = 0; i < count; i++) {
    if (lanes.length === 0) {
      lanes.push(...FIRE_SPAWN_PATTERNS);
    }
    const idx = Math.floor(Math.random() * lanes.length);
    out.push(lanes[idx] ?? 'center');
    lanes.splice(idx, 1);
  }
  return out;
}

/** Bringer 슬롯별 safe(true) / danger(false) */
export function buildBringerSafeMask(
  patternId: BringerPatternId,
  slotCount: number,
  safeStart: number,
): boolean[] {
  const safeLen = BRINGER_PATTERN_CONFIG.safeSlotCount;
  const mask = new Array<boolean>(slotCount).fill(false);
  if (patternId === 'gap_slide' || patternId === 'sliding_wave') {
    for (let i = 0; i < slotCount; i++) {
      mask[i] = i >= safeStart && i < safeStart + safeLen;
    }
  }
  return mask;
}

export function demonBurstDelayMs(configuredMs: number): number {
  return Math.max(configuredMs, DEMON_PATTERN_CONFIG.minReactionMs);
}
