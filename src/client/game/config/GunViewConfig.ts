import type { WeaponId } from '../config/WeaponTable.ts';

/** DOM FPS 총기 뷰(하단 viewmodel) 튜닝 */
export const GUN_VIEW_CONFIG = {
  /** 디자인 720px 기준, 화면 하단보다 아래로 밀어넣는 양 */
  bottomBelowPx: 24,
  /** 무기 교체 시 내려갔다 올라오는 이동량 */
  swapTravelPx: 44,
  swapDurationMs: 280,
  /** 듀얼 피스톨 L/R 총구(불꽃) 기준 간격 — 스프라이트와 별도 (디자인 px) */
  dualPistolInnerGapPx: 200,
  /** 듀얼 피스톨 L/R 스프라이트 안쪽 간격 — 값을 줄이면 총 이미지만 중앙 쪽으로 (디자인 px) */
  dualPistolSpriteInnerGapPx: 160,
  /** 단일 총 최대 높이 (디자인 px) */
  singleMaxHeightPx: 250,
  dualMaxHeightPx: 285,
  /** 뉴클리어 파츠 (idle·hand·missile) */
  nuclearIdleMaxHeightPx: 285,
  nuclearMaxHeightPx: 300,
  /** 듀얼 발사 리코일 */
  dualRecoilMs: 90,
  /** 뉴클리어 DOM 미사일 연출 */
  nuclearMissileLaunchMs: 450,
  nuclearMissileReturnMs: 500,
  /** 720px 디자인 기준 상승 거리 — 총기 max-height와 무관하게 화면 밖까지 */
  nuclearMissileLaunchTravelPx: 820,
  /** 복귀 전 화면 아래 대기 위치 (bottom 앵커 기준) */
  nuclearMissileReturnBelowPx: 140,
  /** 총구 불꽃 — 원본 100×100, 정수 배율만 (픽셀아트 nearest-neighbor) */
  muzzleFlashSourcePx: 100,
  muzzleFlashScale: 4,
  muzzleFlashLargeScale: 5,
  muzzleFlashSmallScale: 5,
  muzzleFlashFrameMs: 10,
  /** 단일 총: 하단 앵커에서 총 높이 비율만큼 위 = 총구 근처 */
  muzzleFlashSingleHeightRatio: 0.48,
  muzzleFlashDualHeightRatio: 0.5,
  /** 불꽃 추가 하향 (bottom px 감소 = 화면 아래) */
  muzzleFlashOffsetDownPx: 48,
  /** 불꽃 transform Y (음수=위, 양수=아래) */
  muzzleFlashTranslateYPercent: 4,
  /** 듀얼 불꽃 L=왼쪽, R=오른쪽으로 추가 이동 (px) — 총 스프라이트 간격과 별도, 총구만 바깥으로 */
  muzzleFlashDualLOffsetOutPx: 24,
  muzzleFlashDualROffsetOutPx: 24,
  /** DOM 총구 불꽃에 맞춘 월드 발사 원점 — 플레이어 중심에서 aim 전방(px) */
  muzzleWorldForwardPx: 64,
  muzzleWorldForwardPxDual: 68,
  muzzleWorldForwardPxMinigun: 60,
  muzzleWorldForwardPxBeam: 66,
  muzzleWorldForwardPxRail: 66,
  /** 듀얼 피스톨: 연사 중 짧은 프레임 루프 (매 발사마다 애니 리셋 방지) */
  minigunMuzzleHoldMs: 100,
  minigunMuzzleFrameStart: 2,
  minigunMuzzleFrameCount: 10,
  minigunMuzzleFrameMs: 5,
  /** 좌우 스트레이프 시 총기 roll (deg) */
  strafeTiltDeg: 8,
  /** tilt 복귀 속도 (클수록 빠름) */
  strafeTiltSmoothing: 14,
  /** 달리기(전진) bob — 위아래 px */
  walkBobAmplitudePx: 6,
  walkBobHz: 2.4,
  /** 듀얼 피스톨 발사 킥 */
  dualRecoilKickPx: 12,
} as const;

/** 단일 총 HUD 리코일 스타일 (듀얼=별도, 뉴클리어=없음) */
export type GunRecoilStyle =
  | 'pistol'
  | 'revolver'
  | 'shotgun'
  | 'minigun'
  | 'missile'
  | 'beam'
  | 'railgun';

export const GUN_RECOIL_STYLE: Record<
  Exclude<WeaponId, 'NUCLEAR_LAUNCHER' | 'DUAL_PISTOL'>,
  GunRecoilStyle
> = {
  DEFAULT_PISTOL: 'pistol',
  REVOLVER: 'revolver',
  SHOTGUN: 'shotgun',
  MINIGUN: 'minigun',
  MISSILE_LAUNCHER: 'missile',
  BEAM_GUN: 'beam',
  RAILGUN: 'railgun',
};

export const GUN_RECOIL_MS: Record<GunRecoilStyle, number> = {
  pistol: 120,
  revolver: 165,
  shotgun: 260,
  minigun: 52,
  missile: 320,
  beam: 80,
  railgun: 580,
};

/** 무기별 리코일 강도 — playFireRecoil 시 CSS 변수로 주입 */
export const GUN_RECOIL_KICK: Record<
  GunRecoilStyle,
  { y: number; scale: number; rotate?: number; xShake?: number }
> = {
  pistol: { y: 14, scale: 0.95 },
  revolver: { y: 18, scale: 0.94, rotate: -2.8 },
  shotgun: { y: 28, scale: 0.9 },
  minigun: { y: 11, scale: 0.97, xShake: 4, rotate: 1.2 },
  missile: { y: 24, scale: 0.92 },
  beam: { y: 9, scale: 0.98 },
  railgun: { y: 38, scale: 0.84, rotate: -1.5 },
};
