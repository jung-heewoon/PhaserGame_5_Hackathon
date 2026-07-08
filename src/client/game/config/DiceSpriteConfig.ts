/** 야찌 모달 주사위 스프라이트 레이아웃 (src/Image/UI/Dice) */
export const DICE_SPRITE_CONFIG = {
  /** 주사위 면 시트: 7프레임 (0=빈주사위, 1~6=눈) */
  faceFrameCount: 7,
  /** dice_full_dragging.png 프레임 크기 (기본) */
  faceDragging: { frameW: 22, frameH: 24 },
  /** dice_full_normal.png 프레임 크기 (홀드/눌림) */
  faceNormal: { frameW: 22, frameH: 22 },
  /** highlight_overlay_dragging.png (기본 테두리) */
  overlayDragging: { w: 24, h: 26 },
  /** highlight_overlay_normal.png (홀드 테두리) */
  overlayNormal: { w: 24, h: 24 },
  /** selection_cursor.png: 2프레임(각 32x32), 홀드 시 애니메이션 */
  cursor: { frameW: 32, frameH: 32, frameCount: 2 },

  /** 필드 주사위 픽업이 표시할 면 프레임 (0=빈주사위, 1~6=눈 → 5눈금) */
  pickupFaceFrame: 5,
  /** 필드 주사위 픽업 월드 스케일 (frameW 22 기준, 기존 절차 텍스처와 유사 크기) */
  pickupScale: 0.9,

  /** 저해상도 원본 → 정수배 확대 (image-rendering: pixelated) */
  displayScale: 3,
  /** 커서 2프레임 왕복 애니 주기(ms, 프레임당) */
  cursorFrameMs: 160,
  /** 리롤 시 비홀드 주사위 셔플 지속(ms) */
  shuffleMs: 520,
  /** 셔플 중 프레임 교체 간격(ms) */
  shuffleTickMs: 60,
  /** 주사위 셀 간 순차 공개 지연(ms) */
  revealStaggerMs: 90,
} as const;
