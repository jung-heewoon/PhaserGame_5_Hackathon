import chestUrl from '../Image/UI/Chest.png';

export const CHEST_SPRITE_URL = chestUrl;

/** Chest.png — 1008×568, 상단 10행 동일 높이, 가로 21프레임 */
export const BOSS_CHEST_SPRITE = {
  sheetWidthPx: 1008,
  sheetHeightPx: 568,
  frameWidthPx: 48,
  frameCount: 21,
  /** 상단 10행 공통 높이 (568 = 10×40 + 7×24) */
  topRowHeightPx: 40,
  bottomRowHeightPx: 24,
  topRowCount: 10,
  /** 프레임 내 상자가 상단 정렬 — 스테이지에서 아래로 밀어 뚜껑 여유 확보 (디자인 px, scale 미적용) */
  stageAnchorOffsetY: 8,
} as const;
