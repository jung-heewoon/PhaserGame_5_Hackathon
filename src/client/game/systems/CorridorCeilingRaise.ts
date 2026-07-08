import type GameState from 'twopointfive-phaser-3/src/twopointfive/game.ts';
import type { Color } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import CulledSectors from 'twopointfive-phaser-3/src/twopointfive/world/culled-sectors.ts';
import type LightMap from 'twopointfive-phaser-3/src/twopointfive/world/light-map.ts';
import type Map from 'twopointfive-phaser-3/src/twopointfive/world/map.ts';
import { TileMesh, type Tile } from 'twopointfive-phaser-3/src/twopointfive/world/tile.ts';
import WallMap from 'twopointfive-phaser-3/src/twopointfive/world/wall-map.ts';
import { LIGHT_CUE_ROW_COUNT } from '../config/WorldLightConfig.ts';
import { CEILING_RAISE_TILES, WORLD_LEVEL } from '../config/WorldVisualConfig.ts';

interface SectorLike {
  x: number;
  y: number;
  world: TileMesh;
}

type WallFaceTiles = Record<string, Tile>;
type RgbColor = { r: number; g: number; b: number };

const WALL_FACE_OFFSETS: Record<string, { x: number; y: number }> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
};

function raiseCeilingMapTiles(ceilingMap: Map, raiseTiles: number): void {
  const offsetY = raiseTiles * ceilingMap.tilesize;
  ceilingMap.yOffset += offsetY;

  for (const y in ceilingMap.tileData) {
    const row = ceilingMap.tileData[y as unknown as number];
    if (!row) continue;
    for (const x in row) {
      const tile = row[x as unknown as number] as Tile;
      const pos = tile.quad.position;
      tile.quad.setPosition(pos[0], pos[1] + offsetY, pos[2]);
    }
  }
}

/** 통로 양쪽 벽면(17)을 천장 높이까지 연장 */
function raiseCorridorSideWalls(wallMap: Map, raiseTiles: number): void {
  if (!(wallMap instanceof WallMap)) return;

  const offsetY = raiseTiles * wallMap.tilesize;
  const cMin = WORLD_LEVEL.corridorColMin;
  const cMax = WORLD_LEVEL.corridorColMax;

  for (const y in wallMap.tileData) {
    const row = wallMap.tileData[y as unknown as number];
    if (!row) continue;

    for (const x in row) {
      const col = Number(x);
      if (col !== cMin && col !== cMax) continue;

      const faces = row[x as unknown as number] as WallFaceTiles;
      const faceName = col === cMin ? 'right' : 'left';
      const wallTile = faces[faceName];
      if (!wallTile) continue;

      const quad = wallTile.quad;
      const pos = quad.position;
      quad.setSize(quad.width, quad.height + offsetY);
      quad.setPosition(pos[0], pos[1] + offsetY / 2, pos[2]);
    }
  }
}

/** 천장·벽 높이만 조정 (섹터 메시는 건드리지 않음) */
export function raiseCorridorCeiling(gs: GameState | null, raiseTiles = CEILING_RAISE_TILES): void {
  if (!gs || raiseTiles <= 0) return;

  const ceilingMap = gs.getMapByName('ceiling');
  const wallMap = gs.getMapByName('walls');
  if (!ceilingMap || !wallMap) return;

  raiseCeilingMapTiles(ceilingMap, raiseTiles);
  raiseCorridorSideWalls(wallMap, raiseTiles);
}

/** 월드 섹터 메시를 현재 타일 quad 색으로 다시 굽는다 — 조명 적용 직후 1회만 호출 */
export function refreshWorldSectorMeshes(gs: GameState): void {
  const floorMap = gs.getMapByName('floor');
  const renderer = gs.context.renderer;
  if (!floorMap || !renderer) return;

  gs.culledSectors = new CulledSectors(floorMap, gs.backgroundMaps, gs.sectorSize, renderer);

  for (const ent of gs.entities) {
    ent.context.culledSectors = gs.culledSectors;
    ent.__sectorX = null;
    ent.__sectorY = null;
    gs.culledSectors.moveEntity(ent);
  }
}

function applyLightMapToRect(
  maps: Map[],
  lightMap: LightMap,
  xs: number,
  ys: number,
  w: number,
  h: number,
): void {
  for (const map of maps) {
    if (map instanceof WallMap) {
      for (let y = ys; y < ys + h; y++) {
        const row = map.tileData[y as unknown as number];
        if (!row) continue;
        for (let x = xs; x < xs + w; x++) {
          const faces = row[x as unknown as number] as WallFaceTiles | undefined;
          if (!faces) continue;
          for (const name in faces) {
            const off = WALL_FACE_OFFSETS[name];
            if (!off) continue;
            faces[name]!.quad.setColor(lightMap.getLight(x + off.x, y + off.y));
          }
        }
      }
      continue;
    }

    for (let y = ys; y < ys + h; y++) {
      const row = map.tileData[y as unknown as number];
      if (!row) continue;
      for (let x = xs; x < xs + w; x++) {
        const tile = row[x as unknown as number] as Tile | undefined;
        if (tile) tile.quad.setColor(lightMap.getLight(x, y));
      }
    }
  }
}

function applyThemeColorsToRect(
  maps: Map[],
  xs: number,
  ys: number,
  w: number,
  h: number,
  rowColors: readonly RgbColor[],
  corridorMask: boolean[][],
  white: RgbColor,
): void {
  const pick = (tx: number, ty: number): RgbColor => {
    if (!corridorMask[ty]?.[tx]) return white;
    return rowColors[ty % LIGHT_CUE_ROW_COUNT] ?? white;
  };

  for (const map of maps) {
    if (map instanceof WallMap) {
      for (let y = ys; y < ys + h; y++) {
        const row = map.tileData[y as unknown as number];
        if (!row) continue;
        for (let x = xs; x < xs + w; x++) {
          const faces = row[x as unknown as number] as WallFaceTiles | undefined;
          if (!faces) continue;
          for (const name in faces) {
            const off = WALL_FACE_OFFSETS[name];
            if (!off) continue;
            faces[name]!.quad.setColor(pick(x + off.x, y + off.y));
          }
        }
      }
      continue;
    }

    for (let y = ys; y < ys + h; y++) {
      const row = map.tileData[y as unknown as number];
      if (!row) continue;
      for (let x = xs; x < xs + w; x++) {
        const tile = row[x as unknown as number] as Tile | undefined;
        if (tile) tile.quad.setColor(pick(x, y));
      }
    }
  }
}

function collectSectorTiles(maps: Map[], xs: number, ys: number, w: number, h: number): Tile[] {
  let tiles: Tile[] = [];
  for (const map of maps) {
    tiles = tiles.concat(map.getTilesInRect(xs, ys, w, h));
  }
  return tiles;
}

function rebakeSectorMesh(
  gs: GameState,
  sector: SectorLike,
  sectorSize: number,
): void {
  const maps = gs.backgroundMaps;
  if (!maps) return;

  const xs = sector.x * sectorSize;
  const ys = sector.y * sectorSize;
  sector.world = new TileMesh(collectSectorTiles(maps, xs, ys, sectorSize, sectorSize));
}

/** 런 시작 시 1회 — 섹터 단위로 lightMap 적용 (전역 applyLightMap 금지) */
export function rebakeWorldLighting(gs: GameState, lightMap: LightMap): void {
  const culled = gs.culledSectors as unknown as {
    sectors: Record<number, Record<number, SectorLike>>;
    sectorSize: number;
  } | null;
  const maps = gs.backgroundMaps;
  if (!culled || !maps) return;

  const size = culled.sectorSize;
  for (const sy in culled.sectors) {
    const row = culled.sectors[sy as unknown as number]!;
    for (const sx in row) {
      const sector = row[sx as unknown as number]!;
      const xs = sector.x * size;
      const ys = sector.y * size;
      applyLightMapToRect(maps, lightMap, xs, ys, size, size);
      rebakeSectorMesh(gs, sector, size);
    }
  }
}

function writeThemeColorsToLightMapRect(
  lightMap: LightMap,
  xs: number,
  ys: number,
  w: number,
  h: number,
  rowColors: readonly RgbColor[],
  corridorMask: boolean[][],
  white: RgbColor,
): void {
  const pick = (tx: number, ty: number): Color => {
    if (!corridorMask[ty]?.[tx]) return white;
    return rowColors[ty % LIGHT_CUE_ROW_COUNT] ?? white;
  };

  for (let y = ys; y < ys + h; y++) {
    const dstRow = lightMap.data[y] as Color[];
    if (!dstRow) continue;
    for (let x = xs; x < xs + w; x++) {
      dstRow[x] = { ...pick(x, y) };
    }
  }
}

export interface RebakeThemeLightingOptions {
  /** 물리 playerY — 남쪽(뒤) 섹터 스킵 */
  playerY: number;
  /** 맵 Y 경계 — minY < frontierY 인 북쪽만 새 테마 */
  frontierY: number;
  tileSize: number;
  rowColors: readonly RgbColor[];
  corridorMask: boolean[][];
  white: RgbColor;
  lightMap: LightMap;
  rebakedKeys: Set<string>;
}

/**
 * frontierY 북쪽 섹터 — quad + lightMap + TileMesh 를 새 테마로 1회 동기화.
 * 남쪽(플레이어 뒤·경계 아래)은 기존 메시 그대로.
 */
export function rebakeThemeLightingSectors(gs: GameState, opts: RebakeThemeLightingOptions): void {
  const culled = gs.culledSectors as unknown as {
    sectors: Record<number, Record<number, SectorLike>>;
    sectorSize: number;
  } | null;
  const maps = gs.backgroundMaps;
  if (!culled || !maps) return;

  const size = culled.sectorSize;

  for (const sy in culled.sectors) {
    const row = culled.sectors[sy as unknown as number]!;
    for (const sx in row) {
      const sector = row[sx as unknown as number]!;
      const key = `${sector.x},${sector.y}`;
      if (opts.rebakedKeys.has(key)) continue;

      const sectorMinYpx = sector.y * size * opts.tileSize;
      if (sectorMinYpx >= opts.playerY) continue;
      if (sectorMinYpx >= opts.frontierY) continue;

      const xs = sector.x * size;
      const ys = sector.y * size;
      applyThemeColorsToRect(
        maps,
        xs,
        ys,
        size,
        size,
        opts.rowColors,
        opts.corridorMask,
        opts.white,
      );
      writeThemeColorsToLightMapRect(
        opts.lightMap,
        xs,
        ys,
        size,
        size,
        opts.rowColors,
        opts.corridorMask,
        opts.white,
      );
      rebakeSectorMesh(gs, sector, size);
      opts.rebakedKeys.add(key);
    }
  }
}

/** @deprecated raiseCorridorCeiling + refreshWorldSectorMeshes 를 씬에서 순서대로 호출 */
export function applyCorridorCeilingRaise(gs: GameState | null, raiseTiles = CEILING_RAISE_TILES): void {
  raiseCorridorCeiling(gs, raiseTiles);
  if (gs) refreshWorldSectorMeshes(gs);
}
