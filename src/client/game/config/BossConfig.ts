export type BossType = 'bringer' | 'demon' | 'guardian';

export const BOSS_TYPES: readonly BossType[] = ['bringer', 'demon', 'guardian'] as const;

export interface BossSpriteMeta {
  idleFrameWidth: number;
  idleFrameHeight: number;
  idleFrameCount: number;
  walkFrameWidth: number;
  walkFrameHeight: number;
  walkFrameCount: number;
  castFrameWidth: number;
  castFrameHeight: number;
  castFrameCount: number;
  deathFrameWidth: number;
  deathFrameHeight: number;
  deathFrameCount: number;
  displayScale: number;
  baseHealth: number;
  idleAnimFps: number;
  walkAnimFps: number;
  castAnimFps: number;
  deathAnimFps: number;
}

export const BOSS_CONFIG = {
  bossIntervalMs: 30_000,
  warningDurationMs: 2_400,
  minStopDistanceAheadPx: 360,
  approachSpeed: 85,
  /** 고정 후 통로 좌우 왕복 속도 */
  strafeSpeed: 130,
  /** 타입별 스킬 재시도 간격 */
  patternCooldownMs: 2_800,
  fireRowAheadPx: 120,
  stopGoPauseMinMs: 600,
  stopGoPauseMaxMs: 1400,
  stopGoMoveMinMs: 800,
  stopGoMoveMaxMs: 1800,
  /** elapsedSec당 체력 배율 */
  healthTimeScalePerSec: 0.0055,
  hitFlashMs: 280,
  hitPulseMs: 160,
  hitPulseScale: 1.18,
  hitFlashBoost: 4,
} as const;

export const BOSS_SPRITE_META: Record<BossType, BossSpriteMeta> = {
  bringer: {
    idleFrameWidth: 47,
    idleFrameHeight: 56,
    idleFrameCount: 8,
    walkFrameWidth: 56,
    walkFrameHeight: 55,
    walkFrameCount: 8,
    castFrameWidth: 53,
    castFrameHeight: 92,
    castFrameCount: 9,
    deathFrameWidth: 51,
    deathFrameHeight: 60,
    deathFrameCount: 10,
    displayScale: 1.65,
    baseHealth: 280,
    idleAnimFps: 8,
    walkAnimFps: 10,
    castAnimFps: 10,
    deathAnimFps: 10,
  },
  demon: {
    idleFrameWidth: 91,
    idleFrameHeight: 107,
    idleFrameCount: 6,
    walkFrameWidth: 85,
    walkFrameHeight: 100,
    walkFrameCount: 12,
    castFrameWidth: 93,
    castFrameHeight: 114,
    castFrameCount: 9,
    deathFrameWidth: 131,
    deathFrameHeight: 124,
    deathFrameCount: 22,
    displayScale: 1.2,
    baseHealth: 380,
    idleAnimFps: 6,
    walkAnimFps: 10,
    castAnimFps: 10,
    deathAnimFps: 12,
  },
  guardian: {
    idleFrameWidth: 81,
    idleFrameHeight: 92,
    idleFrameCount: 6,
    walkFrameWidth: 93,
    walkFrameHeight: 93,
    walkFrameCount: 10,
    castFrameWidth: 79,
    castFrameHeight: 92,
    castFrameCount: 7,
    deathFrameWidth: 183,
    deathFrameHeight: 92,
    deathFrameCount: 16,
    displayScale: 1.28,
    baseHealth: 440,
    idleAnimFps: 6,
    walkAnimFps: 9,
    castAnimFps: 10,
    deathAnimFps: 10,
  },
};

export function pickRandomBossType(): BossType {
  const idx = Math.floor(Math.random() * BOSS_TYPES.length);
  return BOSS_TYPES[idx] ?? 'bringer';
}

export function computeBossHealth(bossType: BossType, elapsedRunMs: number): number {
  const meta = BOSS_SPRITE_META[bossType];
  const elapsedSec = elapsedRunMs / 1000;
  const scale = 1 + elapsedSec * BOSS_CONFIG.healthTimeScalePerSec;
  return Math.round(meta.baseHealth * scale);
}

export function bossHitboxWidth(bossType: BossType): number {
  return BOSS_SPRITE_META[bossType].idleFrameWidth;
}

export function bossHitboxHeight(bossType: BossType): number {
  return BOSS_SPRITE_META[bossType].idleFrameHeight;
}

export function randomStopGoDuration(moving: boolean): number {
  const min = moving ? BOSS_CONFIG.stopGoMoveMinMs : BOSS_CONFIG.stopGoPauseMinMs;
  const max = moving ? BOSS_CONFIG.stopGoMoveMaxMs : BOSS_CONFIG.stopGoPauseMaxMs;
  return min + Math.random() * (max - min);
}
