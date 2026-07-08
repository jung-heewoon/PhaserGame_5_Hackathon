import { ENEMY_CONFIG } from '../config/EnemyConfig.ts';
import { getSpawnWave, type SpawnWaveMod } from './EnemySpawnWave.ts';

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

export function baseEnemiesPerBatch(elapsedSec: number): number {
  const extra = Math.floor(elapsedSec / ENEMY_CONFIG.enemiesPerBatchStepSec);
  return Math.min(
    ENEMY_CONFIG.enemiesPerBatchMax,
    ENEMY_CONFIG.enemiesPerBatchStart + extra,
  );
}

/** 배치당 절대 상한 — waypoint 구간 선형 보간(반올림) */
export function getBatchAbsoluteCap(elapsedSec: number): number {
  const waypoints = ENEMY_CONFIG.spawnBatchAbsoluteCapWaypoints;
  if (elapsedSec <= waypoints[0]!.sec) {
    return waypoints[0]!.cap;
  }

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1]!;
    const next = waypoints[i]!;
    if (elapsedSec <= next.sec) {
      const span = Math.max(1, next.sec - prev.sec);
      const t = clamp01((elapsedSec - prev.sec) / span);
      return Math.round(prev.cap + (next.cap - prev.cap) * t);
    }
  }

  return waypoints[waypoints.length - 1]!.cap;
}

/** 배치당 몬스터 수 — 시간 baseline + 웨이브 변조 + 절대 상한 */
export function getEnemiesPerBatch(elapsedRunMs: number, wave?: SpawnWaveMod): number {
  const elapsedSec = elapsedRunMs / 1000;
  const mod = wave ?? getSpawnWave(elapsedRunMs);
  const base = baseEnemiesPerBatch(elapsedSec);
  let count = Math.max(1, base + mod.countDelta);
  count = Math.min(count, getBatchAbsoluteCap(elapsedSec));
  return count;
}

/** 배치 간격(ms) — elapsed ramp + 웨이브 breather 보너스 */
export function getEnemyBatchIntervalMs(elapsedRunMs: number, wave?: SpawnWaveMod): number {
  const elapsedSec = elapsedRunMs / 1000;
  const mod = wave ?? getSpawnWave(elapsedRunMs);
  const ramp = ENEMY_CONFIG.enemyBatchIntervalRampSec;
  const t = clamp01(elapsedSec / ramp);
  const start = ENEMY_CONFIG.enemyBatchIntervalStartMs;
  const end = ENEMY_CONFIG.enemyBatchIntervalMinMs;
  return Math.round(start + (end - start) * t) + mod.intervalBonusMs;
}
