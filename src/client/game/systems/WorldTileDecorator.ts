import { WORLD_LEVEL } from '../config/WorldVisualConfig.ts';
import {
  CEILING_DECO_TILES,
  FLOOR_DECO_TILES,
  TILE_CEILING_MAIN,
  TILE_DECO_PROBABILITY,
  TILE_FLOOR,
  WALL_DECO_TILES,
  WALL_MAIN_TILES,
} from '../config/WorldTileConfig.ts';

/**
 * 복도 타일 데코레이터.
 * 무한 순환(16타일=1024px 리사이클)에서 이음새가 안 보이도록,
 * y를 patternPeriodRows(16)로 접어 결정론적 해시로 타일을 고른다.
 * → rows 0–15 와 16–31 이 동일해져 순간이동 전후 화면이 연속됨.
 */
const PERIOD = WORLD_LEVEL.patternPeriodRows;

/** (x, y, salt) → [0,1) 결정론적 난수 */
function cellRand(x: number, y: number, salt: number): number {
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(salt + 1, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pick(pool: readonly number[], r: number): number {
  return pool[Math.floor(r * pool.length) % pool.length]!;
}

function yMod(y: number): number {
  return ((y % PERIOD) + PERIOD) % PERIOD;
}

export function decorateFloorTile(x: number, y: number): number {
  const yy = yMod(y);
  return cellRand(x, yy, 11) < TILE_DECO_PROBABILITY
    ? pick(FLOOR_DECO_TILES, cellRand(x, yy, 12))
    : TILE_FLOOR;
}

export function decorateCeilingTile(x: number, y: number): number {
  const yy = yMod(y);
  return cellRand(x, yy, 21) < TILE_DECO_PROBABILITY
    ? pick(CEILING_DECO_TILES, cellRand(x, yy, 22))
    : TILE_CEILING_MAIN;
}

export function decorateWallTile(x: number, y: number): number {
  const yy = yMod(y);
  if (cellRand(x, yy, 31) < TILE_DECO_PROBABILITY) {
    return pick(WALL_DECO_TILES, cellRand(x, yy, 32));
  }
  return pick(WALL_MAIN_TILES, cellRand(x, yy, 33));
}
