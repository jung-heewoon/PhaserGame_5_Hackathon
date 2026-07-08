/** coin4_16x16.png — 144×16 (9프레임 회전 스프라이트). UI는 1프레임 아이콘, fly는 회전 */
export const COIN_CONFIG = {
  frameSize: 16,
  frameCount: 9,
  /** 몬스터 처치 드롭 범위 (포함) */
  minDrop: 1,
  maxDrop: 3,
  /** 경과 분당 드롭 보너스 (+1/분), 상한 */
  timeBonusPerMinute: 1,
  timeBonusMax: 4,
  /** HUD 아이콘 표시 크기 (디자인 px) */
  iconSizePx: 30,
  /** 날아가는 코인 크기 (디자인 px) */
  flySizePx: 34,
  /** 회전 애니 1바퀴 시간 */
  spinDurationMs: 620,
  /** 동시 활성 fly 상한 (초과분은 즉시 가산) */
  maxActiveFly: 60,
  /** 연출 단계 시간 */
  popMs: 175,
  floatMs: 250,
  suckMs: 470,
  /** 낱개 코인 스폰 간 시차 */
  staggerMs: 55,
  /** 스케일: 처음 커짐 → 원래 → 빨려들며 축소 */
  popScale: 1.75,
  floatScale: 1.0,
  suckEndScale: 0.5,
  /** 사망 위치 주변 흩뿌림 반경 (HUD px) */
  spreadPx: 26,
  /** float 단계에서 살짝 위로 떠오르는 거리 (HUD px) */
  floatDriftPx: 34,
} as const;
