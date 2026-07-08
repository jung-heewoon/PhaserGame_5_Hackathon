import { AUDIO_CONFIG } from './AudioConfig.ts';
import { TUTORIAL_CONFIG } from './TutorialConfig.ts';
import { UPGRADE_STORAGE_KEY, WALLET_STORAGE_KEY } from './UpgradeConfig.ts';

/** CrazyGames SDK.data / legacy 마이그레이션 대상 키 — 단일 진입점 */
export const HIGH_SCORE_STORAGE_KEY = 'hell-dice-shooter-high-score';
export const LOCALE_STORAGE_KEY = 'hell-dice-shooter-locale';

export const GAME_PERSISTENCE_KEYS = [
  WALLET_STORAGE_KEY,
  UPGRADE_STORAGE_KEY,
  HIGH_SCORE_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  AUDIO_CONFIG.bgmVolumeStorageKey,
  AUDIO_CONFIG.sfxVolumeStorageKey,
  TUTORIAL_CONFIG.introSeenStorageKey,
  TUTORIAL_CONFIG.yatzySeenStorageKey,
] as const;

export type GamePersistenceKey = (typeof GAME_PERSISTENCE_KEYS)[number];

export {
  WALLET_STORAGE_KEY,
  UPGRADE_STORAGE_KEY,
};
