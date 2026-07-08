import type { EnemyBatchLayout } from '../systems/EnemySpawnLayout.ts';
import type { EnemyMoveProfile } from '../systems/EnemyMovementBehavior.ts';

export type SpawnPatternModuleId =
  | 'layout_lane'
  | 'layout_wide'
  | 'layout_surround'
  | 'layout_alternate'
  | 'move_rush_light'
  | 'move_default'
  | 'move_zigzag'
  | 'move_rush'
  | 'move_cross'
  | 'stat_swarm_light'
  | 'stat_elite_speed';

export type SpawnModuleAxis = 'layout' | 'move' | 'stat';

export type SpawnPatternTier = 'early' | 'late';

export interface SpawnPatternModuleDef {
  id: SpawnPatternModuleId;
  axis: SpawnModuleAxis;
  tier: SpawnPatternTier;
  weight: number;
  layout?: EnemyBatchLayout;
  flankSoft?: boolean;
  layoutAlternate?: readonly EnemyBatchLayout[];
  moveProfile?: EnemyMoveProfile;
  speedMult?: number;
  hpMult?: number;
  batchCountDelta?: number;
}

export const SPAWN_PATTERN_CONFIG = {
  /** 이전까지 early 풀(모듈 1개) */
  earlyTierUntilSec: 180,
  /** late 덱에 stat 모듈 0~1개 붙일 확률 */
  lateStatModuleChance: 0.45,
  maxSpeedMult: 1.35,
  minHpMult: 0.8,
} as const;

export const SPAWN_PATTERN_MODULES: Record<SpawnPatternModuleId, SpawnPatternModuleDef> = {
  layout_lane: {
    id: 'layout_lane',
    axis: 'layout',
    tier: 'early',
    weight: 1,
    layout: 'lane_narrow',
  },
  layout_wide: {
    id: 'layout_wide',
    axis: 'layout',
    tier: 'early',
    weight: 1,
    layout: 'wide_front',
  },
  layout_surround: {
    id: 'layout_surround',
    axis: 'layout',
    tier: 'late',
    weight: 1,
    layout: 'surround',
  },
  layout_alternate: {
    id: 'layout_alternate',
    axis: 'layout',
    tier: 'late',
    weight: 0.9,
    layoutAlternate: ['wide_front', 'surround'],
  },
  move_rush_light: {
    id: 'move_rush_light',
    axis: 'move',
    tier: 'early',
    weight: 0.85,
    layout: 'wide_front',
    moveProfile: 'default',
    speedMult: 1.15,
  },
  move_default: {
    id: 'move_default',
    axis: 'move',
    tier: 'late',
    weight: 1,
    moveProfile: 'default',
  },
  move_zigzag: {
    id: 'move_zigzag',
    axis: 'move',
    tier: 'late',
    weight: 1,
    moveProfile: 'zigzag',
  },
  move_rush: {
    id: 'move_rush',
    axis: 'move',
    tier: 'late',
    weight: 0.95,
    moveProfile: 'rush',
    speedMult: 1.28,
  },
  move_cross: {
    id: 'move_cross',
    axis: 'move',
    tier: 'late',
    weight: 0.9,
    moveProfile: 'cross',
  },
  stat_swarm_light: {
    id: 'stat_swarm_light',
    axis: 'stat',
    tier: 'late',
    weight: 0.85,
    batchCountDelta: 1,
    hpMult: 0.85,
  },
  stat_elite_speed: {
    id: 'stat_elite_speed',
    axis: 'stat',
    tier: 'late',
    weight: 0.8,
  },
};

export const EARLY_PATTERN_POOL: readonly SpawnPatternModuleId[] = [
  'layout_lane',
  'layout_wide',
  'move_rush_light',
];

export const LATE_LAYOUT_POOL: readonly SpawnPatternModuleId[] = [
  'layout_wide',
  'layout_surround',
  'layout_alternate',
];

export const LATE_MOVE_POOL: readonly SpawnPatternModuleId[] = [
  'move_default',
  'move_zigzag',
  'move_rush',
  'move_cross',
];

export const LATE_STAT_POOL: readonly SpawnPatternModuleId[] = [
  'stat_swarm_light',
  'stat_elite_speed',
];
