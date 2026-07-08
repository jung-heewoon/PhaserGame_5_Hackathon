import { WORLD_LEVEL } from './WorldVisualConfig.ts';

/** 한 큐(패턴) 길이 — Y-shift 16타일과 동기 */
export const LIGHT_CUE_ROW_COUNT = WORLD_LEVEL.patternPeriodRows;

/** lights-64.png 그리드: 16열(색상) × 10행(톤) */
export const LIGHT_PALETTE_COLS = 16;

/**
 * 조명 테마에 쓸 톤(행) — 빛나는 행만 사용 (0=선명 밝음, 1=밝음, 5·6=파스텔).
 * 너무 어두운 행(3·4·8·9)은 복도가 검게 죽으므로 제외.
 */
export const LIGHT_THEME_TONE_ROWS = [0, 1, 5, 6] as const;

/** (색상열, 톤행) → 1-based 조명 타일 인덱스 */
export function lightThemeTile(col: number, toneRow: number): number {
  return toneRow * LIGHT_PALETTE_COLS + col + 1;
}

/**
 * 보스 처치 후 색조 전환 연출.
 * 보스 처치 후: `frontierY = playerY - aheadPx` 북쪽만 새 색(1회 구움).
 * 경계 남쪽(보이는 통로)은 기존 TileMesh 유지 → 전진하며 뒤로 밀림.
 * 리사이클 시 `frontierY += shift` 로 맵·플레이어 좌표 동기화.
 */
export const LIGHT_THEME_TRANSITION = {
  aheadPx: 640,
  blendPx: 192,
} as const;

/**
 * lights-64.png 팔레트 — row 6~7 (눈부심 적은 파스텔 톤).
 * 인덱스 1-based, 16열 그리드.
 */
export const LIGHT_TILE = {
  SOFT_WHITE: 97,
  SOFT_DIM: 113,
  WARM_A: 98,
  WARM_B: 99,
  WARM_C: 114,
  WARM_D: 115,
  AMBER: 100,
  SOFT_GREEN: 102,
  SOFT_CYAN: 103,
  SOFT_BLUE: 104,
  LAVENDER_A: 107,
  LAVENDER_B: 108,
} as const;

/**
 * 조명 큐 — 1큐(16행) 재생 후 다음 큐로 전환.
 * 각 행은 통로 전체에 동일 타일 (DomeLightAnimator가 Y 스크롤).
 */
export const LIGHT_CUES = [
  // 큐1: 웜 7 : 소프트 화이트 3 반복
  [
    LIGHT_TILE.WARM_A,
    LIGHT_TILE.WARM_B,
    LIGHT_TILE.WARM_C,
    LIGHT_TILE.WARM_D,
    LIGHT_TILE.WARM_A,
    LIGHT_TILE.WARM_B,
    LIGHT_TILE.WARM_C,
    LIGHT_TILE.SOFT_WHITE,
    LIGHT_TILE.SOFT_DIM,
    LIGHT_TILE.SOFT_WHITE,
    LIGHT_TILE.WARM_B,
    LIGHT_TILE.WARM_C,
    LIGHT_TILE.WARM_D,
    LIGHT_TILE.WARM_A,
    LIGHT_TILE.WARM_B,
    LIGHT_TILE.WARM_C,
  ],
  // 큐2: 시안·블루 워시 + 짧은 휴식
  [
    LIGHT_TILE.SOFT_CYAN,
    LIGHT_TILE.SOFT_CYAN,
    LIGHT_TILE.SOFT_BLUE,
    LIGHT_TILE.SOFT_BLUE,
    LIGHT_TILE.SOFT_CYAN,
    LIGHT_TILE.SOFT_GREEN,
    LIGHT_TILE.SOFT_CYAN,
    LIGHT_TILE.SOFT_WHITE,
    LIGHT_TILE.SOFT_DIM,
    LIGHT_TILE.SOFT_WHITE,
    LIGHT_TILE.SOFT_BLUE,
    LIGHT_TILE.SOFT_BLUE,
    LIGHT_TILE.SOFT_CYAN,
    LIGHT_TILE.SOFT_CYAN,
    LIGHT_TILE.SOFT_BLUE,
    LIGHT_TILE.SOFT_DIM,
  ],
  // 큐3: 앰버 ↔ 라벤더 교차
  [
    LIGHT_TILE.AMBER,
    LIGHT_TILE.WARM_B,
    LIGHT_TILE.AMBER,
    LIGHT_TILE.LAVENDER_A,
    LIGHT_TILE.LAVENDER_B,
    LIGHT_TILE.LAVENDER_A,
    LIGHT_TILE.WARM_B,
    LIGHT_TILE.SOFT_WHITE,
    LIGHT_TILE.SOFT_DIM,
    LIGHT_TILE.SOFT_WHITE,
    LIGHT_TILE.LAVENDER_B,
    LIGHT_TILE.LAVENDER_A,
    LIGHT_TILE.AMBER,
    LIGHT_TILE.LAVENDER_A,
    LIGHT_TILE.WARM_B,
    LIGHT_TILE.AMBER,
  ],
  // 큐4: 저대비 뉴트럴 호흡 (거의 회색 + 살짝 색 포인트)
  [
    LIGHT_TILE.SOFT_DIM,
    LIGHT_TILE.SOFT_WHITE,
    LIGHT_TILE.SOFT_DIM,
    LIGHT_TILE.WARM_C,
    LIGHT_TILE.SOFT_WHITE,
    LIGHT_TILE.SOFT_DIM,
    LIGHT_TILE.SOFT_CYAN,
    LIGHT_TILE.SOFT_WHITE,
    LIGHT_TILE.SOFT_DIM,
    LIGHT_TILE.SOFT_WHITE,
    LIGHT_TILE.WARM_D,
    LIGHT_TILE.SOFT_WHITE,
    LIGHT_TILE.SOFT_DIM,
    LIGHT_TILE.SOFT_BLUE,
    LIGHT_TILE.SOFT_WHITE,
    LIGHT_TILE.SOFT_DIM,
  ],
] as const satisfies ReadonlyArray<readonly number[]>;

export function lightTileForCueRow(cueIndex: number, rowInCue: number): number {
  const cue = LIGHT_CUES[cueIndex % LIGHT_CUES.length]!;
  return cue[((rowInCue % LIGHT_CUE_ROW_COUNT) + LIGHT_CUE_ROW_COUNT) % LIGHT_CUE_ROW_COUNT]!;
}
