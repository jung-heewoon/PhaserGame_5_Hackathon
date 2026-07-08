/** 무기 강화(업그레이드) 튜닝값 — 배율/비용/영속 저장 키. 수치는 여기서만 조정. */
export const UPGRADE_CONFIG = {
  /** 레벨당 공격력 배율 증가폭 (x1.00 → x1.02 → ...) */
  multiplierPerLevel: 0.02,
  /** 모든 총 공통 기본 강화 비용 (레벨 0 → 1) */
  baseCost: 35,
  /** 레벨당 비용 증가율 — +30 전후(~Lv29) maxCost에 도달하도록 튜닝 */
  costGrowth: 1.215,
  /** 1회 강화 비용 상한 (골드) */
  maxCostPerUpgrade: 10_000,
} as const;

/** 지갑 코인 총량 (런 합산) 영속 키 */
export const WALLET_STORAGE_KEY = 'hell-dice-shooter-wallet';
/** 총별 강화 레벨 영속 키 */
export const UPGRADE_STORAGE_KEY = 'hell-dice-shooter-upgrades';
