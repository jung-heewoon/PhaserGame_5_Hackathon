import {
  GAME_PERSISTENCE_KEYS,
  type GamePersistenceKey,
} from '../../config/GamePersistenceConfig.ts';
import {
  Endpoint,
  type GetPersistenceBulkRsp,
  type SetPersistenceReq,
} from '../../../../shared/api.ts';

const FLUSH_MS = 300;

class RedditPersistenceImpl {
  private cache = new Map<string, string>();
  private hydrated = false;
  private pendingWrites = new Map<string, string>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  get isReady(): boolean {
    return this.hydrated;
  }

  async hydrate(): Promise<void> {
    if (this.hydrated) return;

    try {
      const rsp = await fetch(Endpoint.GetPersistenceBulk, {
        headers: {Accept: 'application/json'},
      });
      if (rsp.ok) {
        const data = (await rsp.json()) as GetPersistenceBulkRsp;
        for (const [key, value] of Object.entries(data.values)) {
          this.cache.set(key, value);
        }
      }
    } catch (err) {
      console.warn('[RedditPersistence] bulk load failed; using local fallback', err);
    }

    for (const key of GAME_PERSISTENCE_KEYS) {
      if (this.cache.has(key)) continue;
      const legacy = this.readLocal(key);
      if (legacy !== null) this.cache.set(key, legacy);
    }

    this.hydrated = true;
  }

  getItem(key: GamePersistenceKey | string): string | null {
    if (this.cache.has(key)) {
      return this.cache.get(key) ?? null;
    }
    return this.readLocal(key);
  }

  setItem(key: GamePersistenceKey | string, value: string): void {
    this.cache.set(key, value);
    this.writeLocal(key, value);
    this.pendingWrites.set(key, value);
    this.scheduleFlush();
  }

  removeItem(key: GamePersistenceKey | string): void {
    this.cache.delete(key);
    this.removeLocal(key);
    this.pendingWrites.delete(key);
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, FLUSH_MS);
  }

  private async flush(): Promise<void> {
    const entries = [...this.pendingWrites.entries()];
    this.pendingWrites.clear();

    for (const [key, value] of entries) {
      const req: SetPersistenceReq = {key, value};
      try {
        const rsp = await fetch(Endpoint.SetPersistence, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(req),
        });
        if (!rsp.ok) {
          console.warn(`[RedditPersistence] save failed for ${key}: HTTP ${rsp.status}`);
        }
      } catch (err) {
        console.warn(`[RedditPersistence] save failed for ${key}`, err);
      }
    }
  }

  private readLocal(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeLocal(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }

  private removeLocal(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export const gamePersistence = new RedditPersistenceImpl();
