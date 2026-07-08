export const DAMAGE_NUMBER_CONFIG = {
  durationMs: 850,
  floatSpeedPxPerSec: 48,
  displayScale: 0.58,
  /** 보스 피격 시 약간 작게 */
  bossDisplayScale: 0.55,
  popScale: 1.28,
  popMs: 160,
  font: 'bold 20px Impact, "Arial Black", sans-serif',
  /** 스프라이트 상단(머리) 위 여백 — 월드 Y(북쪽) */
  headMarginPx: 20,
  /** 몬스터 pos.z 위 — 스프라이트보다 앞(화면 쪽) */
  zOffset: 32,
  /** 보스 상체 — 스프라이트 depth보다 앞(최소값, 동적 lift와 병행) */
  bossZOffset: 88,
  poolSize: 24,
  textureKeyPrefix: 'damage-num-pool-',
} as const;
