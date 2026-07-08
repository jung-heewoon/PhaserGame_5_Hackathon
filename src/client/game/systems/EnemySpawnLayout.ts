import { ENEMY_CONFIG, enemyHitboxWidth } from '../config/EnemyConfig.ts';
import { fogMinEnemySpawnAheadRatio } from '../config/FogConfig.ts';
import {
  clampPosXToCorridorVisual,
  corridorInnerMaxX,
  corridorInnerMinX,
  corridorRowSlotPosXs,
  posXFromVisualLeft,
  RUN_GAME_CONFIG,
} from '../config/RunGameConfig.ts';

/** 배치 스폰 공간 패턴 */
export type EnemyBatchLayout = 'lane_narrow' | 'wide_front' | 'flank' | 'surround';

export interface BatchSpawnSlot {
  x: number;
  y: number;
}

export interface BatchSpawnOptions {
  flankSoft?: boolean;
}

function enemyVisualWidth(): number {
  return ENEMY_CONFIG.frameWidth * ENEMY_CONFIG.displayScale;
}

function visualCorridorSpan(): { minLeft: number; maxLeft: number; span: number } {
  const visualW = enemyVisualWidth();
  const minLeft = corridorInnerMinX();
  const maxLeft = corridorInnerMaxX(visualW);
  return { minLeft, maxLeft, span: Math.max(0, maxLeft - minLeft) };
}

function clampSpawnPosX(posX: number): number {
  const hitboxW = enemyHitboxWidth();
  return clampPosXToCorridorVisual(posX, hitboxW, enemyVisualWidth());
}

function posXFromVisualLeftEdge(visualLeft: number): number {
  const hitboxW = enemyHitboxWidth();
  return posXFromVisualLeft(visualLeft, hitboxW, enemyVisualWidth());
}

function clampSpawnDepthRatio(depthRatio: number): number {
  const minRatio = fogMinEnemySpawnAheadRatio(RUN_GAME_CONFIG.spawnAheadDistance);
  return Math.max(minRatio, Math.min(1, depthRatio));
}

function aheadY(playerY: number, depthRatio: number, index: number): number {
  const ratio = clampSpawnDepthRatio(depthRatio);
  const aheadPx =
    RUN_GAME_CONFIG.spawnAheadDistance * ratio +
    index * ENEMY_CONFIG.enemyBatchSpreadYPx +
    Math.random() * 20;
  return playerY - aheadPx;
}

/** surround — 안개 밖(깊은) ~ 안개 안쪽 가까운 경계까지 3단 깊이 */
function surroundDepthRatios(): [number, number, number] {
  const minRatio = fogMinEnemySpawnAheadRatio(RUN_GAME_CONFIG.spawnAheadDistance);
  const midRatio = minRatio + (1 - minRatio) * 0.5;
  return [1, midRatio, minRatio];
}

function flankSideVisualLeftXs(count: number, soft: boolean): { leftX: number; rightX: number } {
  const visualW = enemyVisualWidth();
  const hitboxW = enemyHitboxWidth();
  const { minLeft, maxLeft, span } = visualCorridorSpan();
  const inset = soft ? span * ENEMY_CONFIG.flankSideInsetRatio : 0;
  const leftVisual = minLeft + inset;
  const rightVisual = maxLeft - inset;
  const leftX = posXFromVisualLeft(leftVisual, hitboxW, visualW);
  const rightX = posXFromVisualLeft(rightVisual, hitboxW, visualW);
  void count;
  return { leftX, rightX };
}

/** 배치마다 레인 1개 고정 → 세로 한 줄 스택 방지: 몬스터마다 레인 랜덤 */
function slotsLaneNarrow(count: number, playerY: number): BatchSpawnSlot[] {
  const lanes = [0.22, 0.5, 0.78] as const;
  const { minLeft, span } = visualCorridorSpan();
  const halfBand = (span * ENEMY_CONFIG.laneNarrowBandRatio) / 2;
  const slots: BatchSpawnSlot[] = [];
  for (let i = 0; i < count; i++) {
    const lane = lanes[Math.floor(Math.random() * lanes.length)] ?? 0.5;
    const visualLeft = minLeft + span * lane + (Math.random() * 2 - 1) * halfBand;
    slots.push({
      x: clampSpawnPosX(posXFromVisualLeftEdge(visualLeft)),
      y: aheadY(playerY, 1, i),
    });
  }
  return slots;
}

function slotsWideFront(count: number, playerY: number): BatchSpawnSlot[] {
  const { minLeft, span } = visualCorridorSpan();
  const inset = span * ((1 - ENEMY_CONFIG.laneWideSpreadRatio) / 2);
  const spread = Math.max(0, span - inset * 2);
  const slots: BatchSpawnSlot[] = [];
  for (let i = 0; i < count; i++) {
    const visualLeft = minLeft + inset + Math.random() * Math.max(1, spread);
    slots.push({
      x: clampSpawnPosX(posXFromVisualLeftEdge(visualLeft)),
      y: aheadY(playerY, 1, i),
    });
  }
  return slots;
}

/** flank — 통로 양끝에서 교대 스폰 (soft 시 벽 inset) */
function slotsFlank(count: number, playerY: number, soft: boolean): BatchSpawnSlot[] {
  const { leftX, rightX } = flankSideVisualLeftXs(count, soft);
  const slots: BatchSpawnSlot[] = [];

  for (let i = 0; i < count; i++) {
    let basePosX: number;
    if (count === 1) {
      basePosX = Math.random() < 0.5 ? leftX : rightX;
    } else {
      basePosX = i % 2 === 0 ? leftX : rightX;
    }
    const jitter = (Math.random() * 2 - 1) * 18;
    slots.push({
      x: clampSpawnPosX(basePosX + jitter),
      y: aheadY(playerY, 1, i),
    });
  }
  return slots;
}

/** surround — 통로 가로 균등 슬롯을 순환 */
function slotsSurround(count: number, playerY: number): BatchSpawnSlot[] {
  const rowPosXs = corridorRowSlotPosXs(Math.max(count, 3), enemyVisualWidth(), enemyHitboxWidth());
  const [farRatio, midRatio, nearRatio] = surroundDepthRatios();
  const slots: BatchSpawnSlot[] = [];

  for (let i = 0; i < count; i++) {
    const basePosX = rowPosXs[i % rowPosXs.length] ?? rowPosXs[0]!;
    const jitter = (Math.random() * 2 - 1) * 14;
    const depthBucket = i % 3;
    const depthRatio = depthBucket === 0 ? farRatio : depthBucket === 1 ? midRatio : nearRatio;
    slots.push({
      x: clampSpawnPosX(basePosX + jitter),
      y: aheadY(playerY, depthRatio, Math.floor(i / 3)),
    });
  }
  return slots;
}

/** 레이아웃별 X·Y 슬롯 — playerY 기준 전방(−Y) 스폰 */
export function buildBatchSpawnSlots(
  count: number,
  layout: EnemyBatchLayout,
  playerY: number,
  options: BatchSpawnOptions = {},
): BatchSpawnSlot[] {
  if (count <= 0) return [];
  const flankSoft = options.flankSoft ?? false;
  switch (layout) {
    case 'lane_narrow':
      return slotsLaneNarrow(count, playerY);
    case 'wide_front':
      return slotsWideFront(count, playerY);
    case 'flank':
      return slotsFlank(count, playerY, flankSoft);
    case 'surround':
      return slotsSurround(count, playerY);
    default:
      return slotsWideFront(count, playerY);
  }
}

/** 플레이어 바로 앞에 겹치지 않도록 Y 필터 */
export function isValidEnemySpawnY(spawnY: number, playerY: number): boolean {
  return spawnY < playerY - 32;
}
