import { HIGH_SCORE_STORAGE_KEY } from '../config/GamePersistenceConfig.ts';
import { gamePersistence } from '../platform/crazygames/GamePersistence.ts';

/** 생존 점수 최고 기록 — CrazyGames SDK.data 영속 */
class HighScoreStoreImpl {
  private cached = 0;
  private hydrated = false;

  hydrate(): void {
    this.cached = this.read();
    this.hydrated = true;
  }

  get(): number {
    if (!this.hydrated) return this.read();
    return this.cached;
  }

  /** 현재 점수 반영 후 표시용 최고 기록과 신기록 여부 */
  tryUpdate(score: number): { highScore: number; isNewRecord: boolean } {
    const prev = this.get();
    const next = Math.max(prev, Math.max(0, Math.floor(score)));
    const isNewRecord = score > 0 && next > prev;
    if (next !== prev) {
      this.cached = next;
      gamePersistence.setItem(HIGH_SCORE_STORAGE_KEY, String(next));
    }
    return { highScore: next, isNewRecord };
  }

  private read(): number {
    try {
      const raw = gamePersistence.getItem(HIGH_SCORE_STORAGE_KEY);
      const value = raw === null ? 0 : Number.parseInt(raw, 10);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }
}

export const highScoreStore = new HighScoreStoreImpl();

/** ms → m:ss (분:초) */
export function formatRunElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
