/** Shared persistence keys used by client stores and server Redis API. */
export const HIGH_SCORE_STORAGE_KEY = 'hell-dice-shooter-high-score'
export const LOCALE_STORAGE_KEY = 'hell-dice-shooter-locale'
export const WALLET_STORAGE_KEY = 'hell-dice-shooter-wallet'
export const UPGRADE_STORAGE_KEY = 'hell-dice-shooter-upgrades'
export const SFX_VOLUME_STORAGE_KEY = 'hell-dice-shooter-sfx-volume'
export const BGM_VOLUME_STORAGE_KEY = 'hell-dice-shooter-bgm-volume'
export const TUTORIAL_INTRO_SEEN_STORAGE_KEY =
  'hell-dice-shooter-tutorial-intro-seen'
export const TUTORIAL_YATZY_SEEN_STORAGE_KEY =
  'hell-dice-shooter-tutorial-yatzy-seen'

export const GAME_PERSISTENCE_KEYS = [
  WALLET_STORAGE_KEY,
  UPGRADE_STORAGE_KEY,
  HIGH_SCORE_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  BGM_VOLUME_STORAGE_KEY,
  SFX_VOLUME_STORAGE_KEY,
  TUTORIAL_INTRO_SEEN_STORAGE_KEY,
  TUTORIAL_YATZY_SEEN_STORAGE_KEY,
] as const

export type GamePersistenceKey = (typeof GAME_PERSISTENCE_KEYS)[number]
