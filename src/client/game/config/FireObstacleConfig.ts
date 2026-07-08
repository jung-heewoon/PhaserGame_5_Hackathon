export type FireSpawnPattern = 'left' | 'right' | 'center';

export const FIRE_OBSTACLE_CONFIG = {
  frameWidthPx: 16,
  frameHeightPx: 32,
  frameCount: 14,
  displayScale: 2.4,
  /** 충돌 폭 = 스프라이트 간격과 동일 → 인접 히트박스가 맞닿아 구멍 없이 연속 */
  hitboxWidthPx: 40,
  hitboxHeightPx: 20,
  animFps: 12,
  contactDamage: 1,
  /** 불꽃 스프라이트 중심 간격(월드px). 시각 폭(16*2.4≈38.4)보다 넓게 두어 겹침 최소화 */
  tileSpacingPx: 40,
} as const;

export const FIRE_SPAWN_PATTERNS: readonly FireSpawnPattern[] = ['left', 'right', 'center'] as const;

export function pickRandomFirePattern(): FireSpawnPattern {
  const idx = Math.floor(Math.random() * FIRE_SPAWN_PATTERNS.length);
  return FIRE_SPAWN_PATTERNS[idx] ?? 'center';
}
