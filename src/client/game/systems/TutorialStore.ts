import { TUTORIAL_CONFIG } from '../config/TutorialConfig.ts';
import { gamePersistence } from '../platform/crazygames/GamePersistence.ts';

const SEEN_VALUE = '1';

function readSeen(key: string): boolean {
  return gamePersistence.getItem(key) === SEEN_VALUE;
}

class TutorialStoreImpl {
  isIntroSeen(): boolean {
    return readSeen(TUTORIAL_CONFIG.introSeenStorageKey);
  }

  markIntroSeen(): void {
    gamePersistence.setItem(TUTORIAL_CONFIG.introSeenStorageKey, SEEN_VALUE);
  }

  isYatzySeen(): boolean {
    return readSeen(TUTORIAL_CONFIG.yatzySeenStorageKey);
  }

  markYatzySeen(): void {
    gamePersistence.setItem(TUTORIAL_CONFIG.yatzySeenStorageKey, SEEN_VALUE);
  }
}

export const tutorialStore = new TutorialStoreImpl();
