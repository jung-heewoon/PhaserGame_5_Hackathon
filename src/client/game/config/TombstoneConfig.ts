import {
  corridorInnerMinX,
  corridorInnerMaxX,
} from './RunGameConfig.ts';

export const TOMBSTONE_CONFIG = {
  poolSize: 12,
  /** 비석 스프라이트 시각 높이 (px) */
  visualHeightPx: 48,
  /** 통로 전폭 히트박스 높이 */
  hitboxHeightPx: 40,
  /** Y 밴드 내 다중 병합 반경 */
  mergeBandPx: 96,
  coinBonusRatio: 0.1,
  feverSecPerPip: 2,
  feverWarnBeforeMs: 2500,
  /** 비석 상단 라벨 오프셋 (월드 z 기준 HUD 투영 시 추가) */
  labelOffsetZ: 28,
  /** 라벨 DOM 오프셋 (디자인 px, 위쪽) */
  labelHudOffsetY: -18,
} as const;

/** 통로 전폭 픽업 히트박스 폭 */
export function tombstoneCorridorWidthPx(): number {
  const min = corridorInnerMinX();
  const max = corridorInnerMaxX(1);
  return Math.max(32, max - min);
}

export function tombstoneSpawnX(): number {
  return corridorInnerMinX();
}
