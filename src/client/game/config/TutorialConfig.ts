/** 튜토리얼 타이밍·SDK 저장 키 — 수치는 여기서만 조정 */
export const TUTORIAL_CONFIG = {
  /** 최초 시퀀스에서 탭 힌트 표시 전 대기(ms) */
  tapHintDelayMs: 2000,
  /** 조작+아이템 최초 시퀀스 완료 플래그 */
  introSeenStorageKey: 'hell-dice-shooter-tutorial-intro-seen',
  /** 다이스포커 최초 튜토리얼 완료 플래그 */
  yatzySeenStorageKey: 'hell-dice-shooter-tutorial-yatzy-seen',
} as const;
