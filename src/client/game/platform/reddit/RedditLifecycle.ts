import type {RunFreezeReason} from '../../systems/RunSession.ts';

class RedditLifecycleImpl {
  loadingStart(): void {}

  loadingStop(): void {}

  notifyLoadingComplete(): void {}

  notifyRunStart(): void {}

  notifyFreeze(_reason: RunFreezeReason): void {}

  notifyUnfreeze(_reason: RunFreezeReason | 'resume'): void {}

  happytime(_context?: string): void {}

  setGameContext(_context: Record<string, string | number>): void {}

  clearGameContext(): void {}
}

export const redditLifecycle = new RedditLifecycleImpl();
