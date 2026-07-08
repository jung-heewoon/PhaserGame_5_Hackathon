/**
 * TPF runner-corridor / base1 타일 인덱스 (1-based).
 * 레이어 규칙: floor·walls·collision 필수, ceiling·light는 통로 내부만 채움.
 */

export const WORLD_TILESET = {
  path: 'media/tiles/basic-tiles-64.png',
  tilePx: 64,
} as const;

export const WORLD_LIGHTS = {
  path: 'media/tiles/lights-64.png',
  tilePx: 64,
} as const;

/** 바닥·외곽 쉘 (좌측 4x4 블록 메인 = 평평한 진회색 패널) */
export const TILE_FLOOR = 2;
export const TILE_SHELL = 2;

/** 천장 메인 (좌측 블록 메인, 바닥과 동일 톤) */
export const TILE_CEILING_MAIN = 2;

/** 통로 양쪽 벽 메인 로테이션 — 우측 4x4 블록 상단 2x2 (엔진 인덱스 5·6·13·14) */
export const WALL_MAIN_TILES = [5, 6, 13, 14] as const;

/**
 * 데코 풀 (내용 있는 타일만 사용, 빈칸 회피).
 * - 좌측 블록: 바닥/천장 데코
 * - 우측 블록: 벽 데코
 */
export const FLOOR_DECO_TILES = [1, 4, 11, 18, 19, 20, 27] as const;
export const CEILING_DECO_TILES = [3, 9, 10, 12, 17] as const;
export const WALL_DECO_TILES = [7, 8, 15, 16, 21, 22, 23, 24, 29, 30, 31] as const;

/** 메인 타일 대비 데코 타일이 나올 확률 (0~1) */
export const TILE_DECO_PROBABILITY = 0.15;
