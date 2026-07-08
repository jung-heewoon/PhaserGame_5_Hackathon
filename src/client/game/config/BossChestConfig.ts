import { BOSS_CHEST_SPRITE } from '../assets/ChestAssets.ts';

export type BossChestTier = 'bronze' | 'silver' | 'gold' | 'premium';
export type BossChestRewardKind = 'gold' | 'dice';

export interface BossChestReward {
  kind: BossChestRewardKind;
  amount: number;
}

export interface BossChestTierDef {
  tier: BossChestTier;
  /** 스프라이트 시트 행 (1-based) */
  spriteRow: number;
  weight: number;
  goldMin: number;
  goldMax: number;
  diceMin: number;
  diceMax: number;
  displayScale: number;
  animFps: number;
  idleHoldMs: number;
  vfx: {
    glow: boolean;
    shake: 'none' | 'mild' | 'strong';
    particles: number;
    rays: boolean;
    flashBoost: number;
  };
}

const TIER_DEFS: readonly BossChestTierDef[] = [
  {
    tier: 'bronze',
    spriteRow: 9,
    weight: 50,
    goldMin: 12,
    goldMax: 28,
    diceMin: 11,
    diceMax: 20,
    displayScale: 4.5,
    animFps: 10,
    idleHoldMs: 420,
    vfx: { glow: false, shake: 'none', particles: 0, rays: false, flashBoost: 0 },
  },
  {
    tier: 'silver',
    spriteRow: 2,
    weight: 30,
    goldMin: 28,
    goldMax: 45,
    diceMin: 21,
    diceMax: 30,
    displayScale: 4.5,
    animFps: 12,
    idleHoldMs: 380,
    vfx: { glow: true, shake: 'none', particles: 0, rays: false, flashBoost: 0.15 },
  },
  {
    tier: 'gold',
    spriteRow: 8,
    weight: 15,
    goldMin: 45,
    goldMax: 85,
    diceMin: 30,
    diceMax: 50,
    displayScale: 4.8,
    animFps: 13,
    idleHoldMs: 340,
    vfx: { glow: true, shake: 'mild', particles: 10, rays: false, flashBoost: 0.35 },
  },
  {
    tier: 'premium',
    spriteRow: 10,
    weight: 5,
    goldMin: 80,
    goldMax: 180,
    diceMin: 51,
    diceMax: 100,
    displayScale: 5.1,
    animFps: 14,
    idleHoldMs: 300,
    vfx: {
      glow: true,
      shake: 'strong',
      particles: 24,
      rays: true,
      flashBoost: 0.85,
    },
  },
] as const;

const TIER_BY_ID = Object.fromEntries(TIER_DEFS.map((d) => [d.tier, d])) as Record<
  BossChestTier,
  BossChestTierDef
>;

const TOTAL_WEIGHT = TIER_DEFS.reduce((s, d) => s + d.weight, 0);

export const BOSS_CHEST_CONFIG = {
  sprite: BOSS_CHEST_SPRITE,
  tiers: TIER_DEFS,
  rewardCountUpMs: 680,
  /** 코인 vs 주사위 — 코인 60%, 주사위 40% */
  rewardGoldWeight: 0.6,
  /** 상자 열림 연출 중 코인 분출 (0-based 프레임 13~20 = 표시 14~21) */
  coinEruptFrameStart: 13,
  coinEruptFrameEnd: 20,
  coinEruptSpreadMinPx: 48,
  coinEruptSpreadMaxPx: 158,
  /** 상자에서 막 튀어날 때 (작게) */
  coinEruptSizePx: 18,
  coinEruptStartScale: 0.36,
  /** 포물선 비행 중 최대 scale (안착 전까지 작게 유지) */
  coinArcEndScale: 0.58,
  /** 포물선 비행 끝 / 팝업에 머무를 때 */
  coinHoldSizePx: 34,
  coinHoldScale: 1.08,
  coinArcMs: 460,
  /** 포물선 최고점 상승량 (HUD px) */
  coinArcPeakMinPx: 36,
  coinArcPeakMaxPx: 72,
  coinTrailIntervalMs: 24,
  /** 비행 트레일 점 크기 = 코인 시각 크기 × 이 배율 */
  coinTrailSizeMult: 0.82,
  coinTrailMinPx: 11,
  coinLandPopMs: 180,
} as const;

export function getBossChestTierDef(tier: BossChestTier): BossChestTierDef {
  return TIER_BY_ID[tier];
}

export function rollBossChestTier(): BossChestTier {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const def of TIER_DEFS) {
    roll -= def.weight;
    if (roll <= 0) return def.tier;
  }
  return 'bronze';
}

export function rollGoldForTier(tier: BossChestTier): number {
  const def = getBossChestTierDef(tier);
  const span = Math.max(0, def.goldMax - def.goldMin);
  return def.goldMin + Math.floor(Math.random() * (span + 1));
}

export function rollDiceForTier(tier: BossChestTier): number {
  const def = getBossChestTierDef(tier);
  const span = Math.max(0, def.diceMax - def.diceMin);
  return def.diceMin + Math.floor(Math.random() * (span + 1));
}

/** 등급 확정 후 코인 또는 주사위 중 하나만 롤 */
export function rollBossChestReward(tier: BossChestTier): BossChestReward {
  const kind: BossChestRewardKind =
    Math.random() < BOSS_CHEST_CONFIG.rewardGoldWeight ? 'gold' : 'dice';
  const amount = kind === 'gold' ? rollGoldForTier(tier) : rollDiceForTier(tier);
  return { kind, amount };
}

/** 1-based 행 → 0-based background Y 오프셋 (px, 스케일 전) */
export function chestRowOffsetY(spriteRow: number): number {
  return (spriteRow - 1) * BOSS_CHEST_SPRITE.topRowHeightPx;
}

/** 보상 골드량에 따른 시각적 fly 코인 개수 */
export function visualCoinCountForGold(gold: number): number {
  if (gold <= 30) return 5 + Math.floor(Math.random() * 4);
  if (gold <= 50) return 8 + Math.floor(Math.random() * 5);
  if (gold <= 100) return 12 + Math.floor(Math.random() * 7);
  return 18 + Math.floor(Math.random() * 13);
}

/** 보상 주사위량에 따른 시각적 fly 주사위 개수 */
export function visualDiceCountForReward(totalDice: number): number {
  if (totalDice <= 20) return 6 + Math.floor(Math.random() * 4);
  if (totalDice <= 30) return 8 + Math.floor(Math.random() * 4);
  if (totalDice <= 50) return 10 + Math.floor(Math.random() * 6);
  return 14 + Math.floor(Math.random() * 10);
}

/** totalDice를 visualCount개 fly 주사위로 분배 */
export function buildBossChestDiceChunks(totalDice: number): number[] {
  const visualCount = visualDiceCountForReward(totalDice);
  return distributeGoldAcrossCoins(totalDice, visualCount);
}

/** totalGold를 visualCount개로 나눠 fly 코인별 가산량 배열 */
export function distributeGoldAcrossCoins(totalGold: number, visualCount: number): number[] {
  const count = Math.max(1, visualCount);
  const base = Math.floor(totalGold / count);
  let remainder = totalGold - base * count;
  const chunks: number[] = [];
  for (let i = 0; i < count; i++) {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    chunks.push(base + extra);
  }
  return chunks;
}
