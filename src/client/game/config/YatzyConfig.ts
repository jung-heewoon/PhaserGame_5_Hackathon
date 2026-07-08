/** 야찌 타임 리롤/홀드 규칙 튜닝 */
export const YATZY_CONFIG = {
  /** 첫 굴림 이후 추가로 굴릴 수 있는 횟수 */
  maxRerolls: 2,
  /** 홀드 가능한 최대 주사위 수 (최소 1개는 굴려야 하므로 4개) */
  maxHold: 4,
  /**
   * 홀드한 주사위 개수별 리롤 1회당 소모되는 보유 주사위 수.
   * index = 홀드 개수(0~5). 홀드 0개(그냥 다시 굴리기)는 무료.
   * 1개=1, 2개=2, 3개=4, 4개=8 (2^(n-1)). 5개 홀드는 리롤 대상이 없어 실질 미사용.
   */
  holdCostByCount: [0, 1, 2, 4, 8, 8] as const,
} as const;

/** 홀드 개수 → 리롤 1회 소모 주사위 수 */
export function holdRerollCost(heldCount: number): number {
  const table = YATZY_CONFIG.holdCostByCount;
  const clamped = Math.max(0, Math.min(table.length - 1, heldCount));
  return table[clamped]!;
}
