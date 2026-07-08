import {
  TILE_SHELL,
  WORLD_LIGHTS,
  WORLD_TILESET,
} from '../config/WorldTileConfig.ts';
import { WORLD_LEVEL } from '../config/WorldVisualConfig.ts';
import {
  decorateCeilingTile,
  decorateFloorTile,
  decorateWallTile,
} from '../systems/WorldTileDecorator.ts';
import type { LevelData } from 'twopointfive-phaser-3/src/twopointfive/types.ts';

function emptyGrid(w: number, h: number): number[][] {
  return Array.from({ length: h }, () => Array(w).fill(0));
}

const layerShell = {
  width: WORLD_LEVEL.width,
  height: WORLD_LEVEL.height,
  linkWithCollision: false,
  visible: 0,
  repeat: false,
  preRender: false,
  distance: '1',
  tilesize: WORLD_LEVEL.tilesize,
  foreground: false,
} as const;

/**
 * runner-corridor.json 구조 + TPF 레이어 규칙:
 * - floor: 통로(12–19) = 메인 2 + 데코 (WorldTileDecorator)
 * - walls: 외곽 = TILE_SHELL, 통로 양끝 = 메인 5·6·13·14 로테이션 + 데코, 통로 내부 = 0
 * - collision: 외곽 = 1, 통로 = 0
 * - ceiling/light: 통로 내부만 채움 (0 = 빈 하늘/구멍)
 * 데코는 y%16 결정론적 패턴 → 무한 순환 이음새 없음.
 */
export function buildRunnerCorridorLevel(): LevelData {
  const w = WORLD_LEVEL.width;
  const h = WORLD_LEVEL.height;
  const cMin = WORLD_LEVEL.corridorColMin;
  const cMax = WORLD_LEVEL.corridorColMax;

  const floor = emptyGrid(w, h);
  const walls = emptyGrid(w, h);
  const ceiling = emptyGrid(w, h);
  const collision = emptyGrid(w, h);
  const light = emptyGrid(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const onCorridorEdge = x === cMin || x === cMax;
      const isOuterShell = x < cMin || x > cMax;

      if (isOuterShell) {
        walls[y]![x] = TILE_SHELL;
        collision[y]![x] = 1;
        continue;
      }

      floor[y]![x] = decorateFloorTile(x, y);

      if (onCorridorEdge) {
        walls[y]![x] = decorateWallTile(x, y);
      }

      ceiling[y]![x] = decorateCeilingTile(x, y);
      light[y]![x] = 1;
    }
  }

  return {
    entities: [
      {
        type: 'RunnerPlayer',
        x: 960,
        y: 1792,
        settings: { name: 'player' },
      },
      {
        type: 'EntityVoid',
        x: 1024,
        y: 1024,
        settings: {
          fogColor: '0x0a1018',
          fogNear: 128,
          fogFar: 512,
          name: 'info',
          sectorSize: 4,
        },
      },
    ],
    layer: [
      { name: 'floor', tilesetName: WORLD_TILESET.path, data: floor, ...layerShell },
      { name: 'collision', tilesetName: WORLD_TILESET.path, data: collision, ...layerShell },
      { name: 'walls', tilesetName: WORLD_TILESET.path, data: walls, ...layerShell },
      { name: 'ceiling', tilesetName: WORLD_TILESET.path, data: ceiling, ...layerShell },
      { name: 'light', tilesetName: WORLD_LIGHTS.path, data: light, ...layerShell },
    ],
  };
}
