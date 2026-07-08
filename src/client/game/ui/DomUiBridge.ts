import { applyLocaleDom } from '../locale/applyLocaleDom.ts';
import { localeManager } from '../locale/LocaleManager.ts';
import type { GameRunSnapshot } from '../systems/GameRunState.ts';
import type { GameRunState } from '../systems/GameRunState.ts';
import { resetGunHudTracking, updateRunHud } from './RunHudDom.ts';
import { refreshYatzyModalLocale } from './YatzyModalDom.ts';
import { refreshBossChestModalLocale } from './BossChestModalDom.ts';
import { refreshTutorialLocale } from './TutorialModalDom.ts';

class DomUiBridgeImpl {
  private toastEl: HTMLElement | null = null;
  private hudLayer: HTMLElement | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;
  private unsubscribeLocale: (() => void) | null = null;
  private lastSnapshot: GameRunSnapshot | null = null;

  init(): void {
    this.hudLayer = document.getElementById('doom-hud-layer');
    this.toastEl = document.getElementById('doom-toast');

    this.unsubscribeLocale?.();
    this.unsubscribeLocale = localeManager.onChange(() => this.refreshLocale());
  }

  bindState(state: GameRunState): void {
    this.unsubscribe?.();
    resetGunHudTracking();
    const listener = (snap: GameRunSnapshot) => {
      this.lastSnapshot = snap;
      updateRunHud(snap);
    };
    this.unsubscribe = state.onChange(listener);
    listener(state.snapshot);
  }

  private refreshLocale(): void {
    applyLocaleDom();
    if (this.lastSnapshot) {
      updateRunHud(this.lastSnapshot);
    }
    refreshYatzyModalLocale();
    refreshBossChestModalLocale();
    refreshTutorialLocale();
  }

  setLayerInteractive(on: boolean): void {
    this.hudLayer?.classList.toggle('interactive', on);
  }

  showToast(message: string, ms = 2200): void {
    if (!this.toastEl) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    this.toastTimer = setTimeout(() => {
      this.toastEl?.classList.add('hidden');
      this.toastTimer = null;
    }, ms);
  }
}

export const domUiBridge = new DomUiBridgeImpl();
