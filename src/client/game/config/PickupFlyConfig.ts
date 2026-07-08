export type PickupKind = 'dice' | 'heart' | 'bullet';

/** 하트·주사위·총알 픽업 → 각 HUD로 빨려드는 연출 (코인 연출과 동일 골격) */
export const PICKUP_FLY_CONFIG = {
  popMs: 90,
  floatMs: 120,
  suckMs: 240,
  popScale: 1.9,
  floatScale: 1.15,
  suckEndScale: 0.55,
  spreadPx: 18,
  floatDriftPx: 34,
  maxActive: 40,
  /** 종류별 fly 스프라이트 표시 크기 (디자인 px) */
  sizePx: { dice: 60, heart: 60, bullet: 54 },
} as const;
