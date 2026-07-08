import { ENEMY_CONFIG } from '../config/EnemyConfig.ts';

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/** 초반 장기 유지 — 후반까지 완만·넓게 가속 */
function easeInCubic(t: number): number {
  const c = clamp01(t);
  return c * c * c;
}

/** 0→1 — moveSpeedRampSec 이후 1 유지 */
export function getEnemyMoveSpeedScale(elapsedRunMs: number): number {
  const elapsedSec = elapsedRunMs / 1000;
  const rampSec = ENEMY_CONFIG.moveSpeedRampSec;
  if (elapsedSec >= rampSec) return 1;

  const t = easeInCubic(elapsedSec / rampSec);
  const start = ENEMY_CONFIG.moveSpeedEarlyScaleStart;
  return start + (1 - start) * t;
}

/** 스폰 시 min~max 구간 랜덤 — 현재 값이 램프 완료 후 최고속 */
export function rollEnemyMoveSpeed(elapsedRunMs: number): number {
  const scale = getEnemyMoveSpeedScale(elapsedRunMs);
  const min = ENEMY_CONFIG.moveSpeedMin * scale;
  const max = ENEMY_CONFIG.moveSpeedMax * scale;
  return min + Math.random() * (max - min);
}
