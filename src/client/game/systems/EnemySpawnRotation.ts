import { ENEMY_CONFIG } from '../config/EnemyConfig.ts';

const SPAWN_PHASES: readonly number[][] = buildSpawnPhases();

function buildSpawnPhases(): number[][] {
  const phases: number[][] = [];
  for (let start = 1; start <= ENEMY_CONFIG.spriteCount; start++) {
    for (let width = 1; width <= 3; width++) {
      const pool: number[] = [];
      for (let i = 0; i < width; i++) {
        const id = start + i;
        if (id <= ENEMY_CONFIG.spriteCount) pool.push(id);
      }
      if (pool.length > 0) phases.push(pool);
    }
  }
  return phases;
}

export function getSpawnPool(elapsedRunMs: number): readonly number[] {
  if (SPAWN_PHASES.length === 0) return [1];
  const phaseMs = ENEMY_CONFIG.spawnRotationCycleMs / SPAWN_PHASES.length;
  const phaseIndex = Math.floor(elapsedRunMs / phaseMs) % SPAWN_PHASES.length;
  return SPAWN_PHASES[phaseIndex]!;
}

export function pickEnemyType(pool: readonly number[]): number {
  if (pool.length === 0) return 1;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
