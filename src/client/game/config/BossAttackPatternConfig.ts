import type { BossType } from './BossConfig.ts';

export type BossPatternTier = 'early' | 'mid' | 'late';

export type DemonPatternId =
  | 'single_lane'
  | 'double_burst'
  | 'triple_burst'
  | 'wing_pair'
  | 'squeeze';

export type GuardianPatternId =
  | 'single_lane'
  | 'triple_tight'
  | 'flank_pair'
  | 'stagger_burst'
  | 'wave_tight';

export type BringerPatternId = 'gap_slide' | 'sliding_wave';

export type BossPatternId = DemonPatternId | GuardianPatternId | BringerPatternId;

export interface BossPatternDef<T extends string = string> {
  id: T;
  minTier: BossPatternTier;
  weight: number;
  lateWeightMult?: number;
}

export const BOSS_PATTERN_TIER_THRESHOLDS = {
  earlyUntilMs: 240_000,
  midUntilMs: 480_000,
} as const;

const TIER_RANK: Record<BossPatternTier, number> = {
  early: 0,
  mid: 1,
  late: 2,
};

export function resolveBossPatternTier(runElapsedMs: number): BossPatternTier {
  if (runElapsedMs < BOSS_PATTERN_TIER_THRESHOLDS.earlyUntilMs) return 'early';
  if (runElapsedMs < BOSS_PATTERN_TIER_THRESHOLDS.midUntilMs) return 'mid';
  return 'late';
}

export function tierMeetsMin(current: BossPatternTier, min: BossPatternTier): boolean {
  return TIER_RANK[current] >= TIER_RANK[min];
}

export const DEMON_ATTACK_PATTERNS: Record<DemonPatternId, BossPatternDef<DemonPatternId>> = {
  single_lane: { id: 'single_lane', minTier: 'early', weight: 1 },
  double_burst: { id: 'double_burst', minTier: 'mid', weight: 1 },
  triple_burst: { id: 'triple_burst', minTier: 'late', weight: 0.9 },
  wing_pair: { id: 'wing_pair', minTier: 'mid', weight: 0.95 },
  squeeze: { id: 'squeeze', minTier: 'late', weight: 0.85 },
};

export const GUARDIAN_ATTACK_PATTERNS: Record<
  GuardianPatternId,
  BossPatternDef<GuardianPatternId>
> = {
  single_lane: { id: 'single_lane', minTier: 'early', weight: 0.9 },
  triple_tight: { id: 'triple_tight', minTier: 'early', weight: 1 },
  flank_pair: { id: 'flank_pair', minTier: 'mid', weight: 1 },
  stagger_burst: { id: 'stagger_burst', minTier: 'mid', weight: 0.95 },
  wave_tight: { id: 'wave_tight', minTier: 'late', weight: 0.9 },
};

export const BRINGER_ATTACK_PATTERNS: Record<
  BringerPatternId,
  BossPatternDef<BringerPatternId>
> = {
  gap_slide: { id: 'gap_slide', minTier: 'early', weight: 1 },
  sliding_wave: { id: 'sliding_wave', minTier: 'mid', weight: 1 },
};

export const DEMON_PATTERN_POOL: readonly DemonPatternId[] = [
  'single_lane',
  'double_burst',
  'triple_burst',
  'wing_pair',
  'squeeze',
];

export const GUARDIAN_PATTERN_POOL: readonly GuardianPatternId[] = [
  'single_lane',
  'triple_tight',
  'flank_pair',
  'stagger_burst',
  'wave_tight',
];

export const BRINGER_PATTERN_POOL: readonly BringerPatternId[] = ['gap_slide', 'sliding_wave'];

export function patternPoolForBoss(bossType: BossType): readonly BossPatternId[] {
  switch (bossType) {
    case 'demon':
      return DEMON_PATTERN_POOL;
    case 'guardian':
      return GUARDIAN_PATTERN_POOL;
    case 'bringer':
      return BRINGER_PATTERN_POOL;
  }
}

export function patternDefWeight(
  bossType: BossType,
  id: BossPatternId,
  tier: BossPatternTier,
): number {
  let def: BossPatternDef | undefined;
  switch (bossType) {
    case 'demon':
      def = DEMON_ATTACK_PATTERNS[id as DemonPatternId];
      break;
    case 'guardian':
      def = GUARDIAN_ATTACK_PATTERNS[id as GuardianPatternId];
      break;
    case 'bringer':
      def = BRINGER_ATTACK_PATTERNS[id as BringerPatternId];
      break;
  }
  if (!def || !tierMeetsMin(tier, def.minTier)) return 0;
  let w = def.weight;
  if (tier === 'late' && def.minTier === 'early' && def.lateWeightMult != null) {
    w *= def.lateWeightMult;
  } else if (tier === 'late' && def.minTier === 'early') {
    w *= 0.55;
  }
  return w;
}
