import { ENEMY_CONFIG } from '../config/EnemyConfig.ts';

export type SpawnWavePhase = 'swarm' | 'normal' | 'breather';

export interface SpawnWaveMod {
  phase: SpawnWavePhase;
  countDelta: number;
  hpMult: number;
  intervalBonusMs: number;
}

/** 50s 주기 — 많지만 약함 / 기준 / 숨고르기 */
export function getSpawnWave(elapsedRunMs: number): SpawnWaveMod {
  const elapsedSec = elapsedRunMs / 1000;
  const cycle = ENEMY_CONFIG.spawnWaveCycleSec;
  const t = elapsedSec % cycle;
  const late = elapsedSec >= ENEMY_CONFIG.spawnWaveLateStartSec;

  if (t < ENEMY_CONFIG.spawnWaveSwarmEndSec) {
    return {
      phase: 'swarm',
      countDelta:
        ENEMY_CONFIG.spawnWaveSwarmCountDelta +
        (late ? ENEMY_CONFIG.spawnWaveLateSwarmCountBonus : 0),
      hpMult: ENEMY_CONFIG.spawnWaveSwarmHpMult,
      intervalBonusMs: 0,
    };
  }

  if (t < ENEMY_CONFIG.spawnWaveNormalEndSec) {
    return {
      phase: 'normal',
      countDelta: 0,
      hpMult: 1,
      intervalBonusMs: 0,
    };
  }

  return {
    phase: 'breather',
    countDelta: ENEMY_CONFIG.spawnWaveBreatherCountDelta,
    hpMult: 1,
    intervalBonusMs:
      ENEMY_CONFIG.spawnWaveBreatherIntervalBonusMs +
      (late ? ENEMY_CONFIG.spawnWaveLateBreatherIntervalBonusMs : 0),
  };
}
