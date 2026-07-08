import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type GameState from 'twopointfive-phaser-3/src/twopointfive/game.ts';
import type { Color } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import type { LightMapPixels } from 'twopointfive-phaser-3/src/twopointfive/world/light-map.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import {
  LIGHT_CUE_ROW_COUNT,
  LIGHT_PALETTE_COLS,
  LIGHT_THEME_TONE_ROWS,
  LIGHT_THEME_TRANSITION,
  lightThemeTile,
} from '../config/WorldLightConfig.ts';
import type { RunSession } from './RunSession.ts';
import { rebakeThemeLightingSectors, rebakeWorldLighting } from './CorridorCeilingRaise.ts';

type RgbColor = { r: number; g: number; b: number };

function buildLightPalette(imagePixels: LightMapPixels, tilesize: number): RgbColor[] {
  const colors: RgbColor[] = [];
  const px = imagePixels.data;
  const imgW = imagePixels.width || 0;
  const imgH = imagePixels.height || 0;
  for (let y = 0; y < imgH; y += tilesize) {
    for (let x = 0; x < imgW; x += tilesize) {
      const index = (y * imgW + x) * 4;
      colors.push({
        r: (px[index] || 0) / 255,
        g: (px[index + 1] || 0) / 255,
        b: (px[index + 2] || 0) / 255,
      });
    }
  }
  return colors;
}

/**
 * 보스 후 조명 — 단일 규칙:
 * - 런 시작: lightMap + 전 섹터 1회 구움
 * - 보스 처치: frontierY(맵 Y) 북쪽만 새 테마, 남쪽은 기존 메시 유지
 * - 월드 리사이클: frontierY도 +shift (맵 타일은 고정, 플레이어만 점프하므로)
 * - frozen / 트랙Y / wrap / per-frame lightMap 갱신 없음
 */
export class DomeLightAnimator {
  private corridorMask: boolean[][] | null = null;
  private palette: RgbColor[] = [];
  private gridH = 0;
  private gridW = 0;
  private readonly white: RgbColor = { r: 1, g: 1, b: 1 };
  private themeColumn = 0;
  private curColors: RgbColor[] = [];

  private transitionActive = false;
  /** 맵 Y 기준 — 이 값 북쪽(작은 Y)만 새 테마. 리사이클 시 +shift */
  private frontierY = 0;
  private readonly rebakedSectorKeys = new Set<string>();
  private needsInitialBake = false;

  bindLightLayer(lightData: number[][], lightPixels: LightMapPixels, tilesize: number): void {
    this.gridH = lightData.length;
    this.gridW = lightData[0]?.length ?? 0;
    this.corridorMask = lightData.map((row) => row.map((tile) => tile > 0));
    this.palette = buildLightPalette(lightPixels, tilesize);
    this.curColors = this.pickThemeColors();
    this.transitionActive = false;
    this.rebakedSectorKeys.clear();
    this.frontierY = 0;
    this.needsInitialBake = true;
  }

  applyInitialTheme(gs: GameState): void {
    if (!this.needsInitialBake) return;
    const lightMap = gs.lightMap;
    const mask = this.corridorMask;
    if (!lightMap || !mask) return;

    this.writeFullLightGrid(lightMap, mask);
    rebakeWorldLighting(gs, lightMap);
    this.needsInitialBake = false;
  }

  private pickThemeColors(): RgbColor[] {
    const cols = LIGHT_PALETTE_COLS;
    const prev = this.themeColumn;
    let next = prev;
    while (next === prev) {
      next = 1 + Math.floor(Math.random() * (cols - 1));
    }
    this.themeColumn = next;

    const tones = LIGHT_THEME_TONE_ROWS;
    return Array.from({ length: LIGHT_CUE_ROW_COUNT }, () => {
      const idx = lightThemeTile(next, tones[Math.floor(Math.random() * tones.length)]!);
      return this.palette[idx - 1] ? { ...this.palette[idx - 1]! } : { ...this.white };
    });
  }

  rerollTheme(gs: GameState, playerY: number): void {
    if (this.curColors.length === 0 || !this.corridorMask) return;
    this.curColors = this.pickThemeColors();
    this.transitionActive = true;
    this.rebakedSectorKeys.clear();
    this.frontierY = playerY - LIGHT_THEME_TRANSITION.aheadPx;
    this.applyThemeToFrontier(gs, playerY);
  }

  update(tpf: TwoPointFiveScenePlugin, playerY: number, session: RunSession): void {
    const gs = tpf.getGameState();
    const mask = this.corridorMask;
    if (!gs || !mask || this.gridH === 0 || !this.transitionActive) return;

    if (session.worldShiftedThisFrame) {
      this.frontierY += RUN_GAME_CONFIG.trackRecycleSegmentPx;
    }

    this.applyThemeToFrontier(gs, playerY);
  }

  private applyThemeToFrontier(gs: GameState, playerY: number): void {
    const lightMap = gs.lightMap;
    if (!lightMap) return;

    rebakeThemeLightingSectors(gs, {
      playerY,
      frontierY: this.frontierY,
      tileSize: RUN_GAME_CONFIG.tileSize,
      rowColors: this.curColors,
      corridorMask: this.corridorMask!,
      white: this.white,
      lightMap,
      rebakedKeys: this.rebakedSectorKeys,
    });
  }

  private writeFullLightGrid(lightMap: { data: Color[][] }, mask: boolean[][]): void {
    for (let y = 0; y < this.gridH; y++) {
      const period = y % LIGHT_CUE_ROW_COUNT;
      const rowColor = this.curColors[period] ?? this.white;
      const dstRow = lightMap.data[y] as Color[];
      const maskRow = mask[y]!;
      for (let x = 0; x < this.gridW; x++) {
        dstRow[x] = maskRow[x] ? { ...rowColor } : { ...this.white };
      }
    }
  }

  dispose(): void {
    this.corridorMask = null;
    this.palette = [];
    this.curColors = [];
    this.gridH = 0;
    this.gridW = 0;
    this.transitionActive = false;
    this.rebakedSectorKeys.clear();
    this.frontierY = 0;
    this.needsInitialBake = false;
  }
}
