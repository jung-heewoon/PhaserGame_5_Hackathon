/** DOM 하트 HUD — 스프라이트 시트·슬롯 수 */
export const HEART_HUD_CONFIG = {
  maxHearts: 3,
  sheetFrameCount: 5,
  sheetFrameWidthPx: 17,
  sheetFrameHeightPx: 17,
  sheetWidthPx: 85,
  sheetHeightPx: 17,
  displayScale: 2,
  animFrameMs: 55,
} as const;

export const HEART_DISPLAY_SIZE_PX =
  HEART_HUD_CONFIG.sheetFrameWidthPx * HEART_HUD_CONFIG.displayScale;

export const HEART_SHEET_DISPLAY_WIDTH_PX =
  HEART_HUD_CONFIG.sheetWidthPx * HEART_HUD_CONFIG.displayScale;
