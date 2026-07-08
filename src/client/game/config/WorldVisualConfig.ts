import { RUN_GAME_CONFIG } from './RunGameConfig.ts';

/** 레벨 그리드 — runner-corridor */
export const WORLD_LEVEL = {
  width: 32,
  height: 32,
  tilesize: 64,
  corridorColMin: RUN_GAME_CONFIG.corridorTileMinX,
  corridorColMax: RUN_GAME_CONFIG.corridorTileMaxX,
  /** Y-shift 1024px = 16타일 — 조명 큐 1회전 길이 */
  patternPeriodRows: 16,
} as const;

/** 천장 쿼드 높이(Y)를 올리는 타일 수 — TPF 기본은 tilesize/2 */
export const CEILING_RAISE_TILES = 1;

/** DomeLightAnimator — 행 1칸 스크롤 간격 (ms) */
export const DOME_LIGHT_PHASE_MS = 140;
