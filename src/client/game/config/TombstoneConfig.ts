import {
  clampToCorridorX,
  corridorInnerMaxX,
  corridorInnerMinX,
  posXFromVisualLeft,
} from './RunGameConfig.ts';

/** Tombstone.png 전체 이미지 (138×110) — Heart 픽업과 동일하게 frame×scale로 표시 */
export const TOMBSTONE_CONFIG = {
  poolSize: 12,
  frameWidthPx: 138,
  frameHeightPx: 110,
  /** 화면 표시 목표 너비 ≈ 64px */
  displayScale: 64 / 138,
  /** Y축 근접 습득 반폭 — 통과 시 1개 트리거 */
  pickupBandHalfYPx: 64,
  /** 습득 순간 주변 비석 일괄 병합 반경 */
  mergeBandPx: 520,
  coinBonusRatio: 0.1,
  feverSecPerPip: 2,
  feverWarnBeforeMs: 2500,
  /** 피버타임 중 공격 속도 +30% → 쿨다운 ÷1.3 */
  feverAttackSpeedMul: 1.3,
  /** 라벨 앵커 — 스프라이트 상단 위 (월드 Y, 북쪽) */
  labelHeadMarginPx: 6,
  /** projectQuadCenterToHud verticalHalfExtent */
  labelHalfExtentPx: 7,
  labelOffsetZ: 28,
  /** 통로 중앙 기준 좌우 랜덤 오프셋 반폭 (px) */
  spawnOffsetHalfXPx: 100,
} as const;

export function tombstoneVisualWidthPx(): number {
  return TOMBSTONE_CONFIG.frameWidthPx * TOMBSTONE_CONFIG.displayScale;
}

export function tombstoneVisualHeightPx(): number {
  return TOMBSTONE_CONFIG.frameHeightPx * TOMBSTONE_CONFIG.displayScale;
}

/** 통로 전폭 — X 무관, 달리기 방향(Y) 밴드만 검사 */
export function tombstonePickupOverlapsPlayer(
  tombPosY: number,
  playerPosY: number,
  playerSizeY: number,
): boolean {
  const visualH = tombstoneVisualHeightPx();
  const playerCy = playerPosY + playerSizeY / 2;
  const tombCy = tombPosY + visualH / 2;
  const band = visualH / 2 + playerSizeY / 2 + TOMBSTONE_CONFIG.pickupBandHalfYPx;
  return Math.abs(playerCy - tombCy) <= band;
}

/** 통로 중앙에 비석 스프라이트 배치 */
export function tombstoneCenterPosX(): number {
  const visualW = tombstoneVisualWidthPx();
  const hitboxW = visualW;
  const minLeft = corridorInnerMinX();
  const maxLeft = corridorInnerMaxX(visualW);
  const centerLeft = minLeft + (maxLeft - minLeft) / 2;
  return posXFromVisualLeft(centerLeft, hitboxW, visualW);
}

/** 중앙 ± spawnOffsetHalfXPx 범위에서 랜덤 X */
export function randomTombstoneSpawnPosX(): number {
  const visualW = tombstoneVisualWidthPx();
  const centerX = tombstoneCenterPosX();
  const offset = (Math.random() * 2 - 1) * TOMBSTONE_CONFIG.spawnOffsetHalfXPx;
  return clampToCorridorX(centerX + offset, visualW);
}
