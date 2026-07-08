import type { BossType } from '../config/BossConfig.ts';
import {
  BOSS_PATTERN_TIER_THRESHOLDS,
  patternDefWeight,
  patternPoolForBoss,
  resolveBossPatternTier,
  tierMeetsMin,
  type BossPatternId,
  type BossPatternTier,
  type BringerPatternId,
  type DemonPatternId,
  type GuardianPatternId,
  BRINGER_ATTACK_PATTERNS,
  DEMON_ATTACK_PATTERNS,
  GUARDIAN_ATTACK_PATTERNS,
} from '../config/BossAttackPatternConfig.ts';

export { resolveBossPatternTier, type BossPatternTier };

function pickWeightedPattern(
  bossType: BossType,
  tier: BossPatternTier,
  excludeId: BossPatternId | null,
): BossPatternId {
  const pool = patternPoolForBoss(bossType);
  const candidates: { id: BossPatternId; weight: number }[] = [];

  for (const id of pool) {
    if (id === excludeId) continue;
    const w = patternDefWeight(bossType, id, tier);
    if (w > 0) candidates.push({ id, weight: w });
  }

  if (candidates.length === 0) {
    for (const id of pool) {
      const w = patternDefWeight(bossType, id, tier);
      if (w > 0) return id;
    }
    return pool[0] ?? 'single_lane';
  }

  let total = 0;
  for (const c of candidates) total += c.weight;
  let roll = Math.random() * total;
  for (const c of candidates) {
    roll -= c.weight;
    if (roll <= 0) return c.id;
  }
  return candidates[candidates.length - 1]!.id;
}

export class BossPatternDirector {
  private lastPatternByBoss: Partial<Record<BossType, BossPatternId>> = {};

  resolveTier(runElapsedMs: number): BossPatternTier {
    return resolveBossPatternTier(runElapsedMs);
  }

  pick(bossType: BossType, runElapsedMs: number): BossPatternId {
    const tier = this.resolveTier(runElapsedMs);
    const exclude = this.lastPatternByBoss[bossType] ?? null;
    const id = pickWeightedPattern(bossType, tier, exclude);
    this.lastPatternByBoss[bossType] = id;
    return id;
  }

  pickDemon(runElapsedMs: number): DemonPatternId {
    return this.pick('demon', runElapsedMs) as DemonPatternId;
  }

  pickGuardian(runElapsedMs: number): GuardianPatternId {
    return this.pick('guardian', runElapsedMs) as GuardianPatternId;
  }

  pickBringer(runElapsedMs: number): BringerPatternId {
    return this.pick('bringer', runElapsedMs) as BringerPatternId;
  }

  reset(): void {
    this.lastPatternByBoss = {};
  }
}

/** tier 임계값 export (테스트·HUD용) */
export const BOSS_PATTERN_TIER_MS = BOSS_PATTERN_TIER_THRESHOLDS;

export function isPatternAvailable(
  bossType: BossType,
  patternId: BossPatternId,
  tier: BossPatternTier,
): boolean {
  switch (bossType) {
    case 'demon':
      return tierMeetsMin(tier, DEMON_ATTACK_PATTERNS[patternId as DemonPatternId]?.minTier ?? 'late');
    case 'guardian':
      return tierMeetsMin(
        tier,
        GUARDIAN_ATTACK_PATTERNS[patternId as GuardianPatternId]?.minTier ?? 'late',
      );
    case 'bringer':
      return tierMeetsMin(
        tier,
        BRINGER_ATTACK_PATTERNS[patternId as BringerPatternId]?.minTier ?? 'late',
      );
  }
}
