import {
  BOSS_WARNING_BAR_URL,
  BOSS_WARNING_BANG_URL,
} from '../assets/BossWarningAssets.ts';
import { BOSS_CONFIG } from '../config/BossConfig.ts';
import { BOSS_WARNING_CONFIG } from '../config/BossWarningConfig.ts';

let overlayEl: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function initBossWarning(): void {
  overlayEl = document.getElementById('boss-warning-overlay');
  const barEl = document.getElementById('boss-warning-bar');
  const bangLEl = document.getElementById('boss-warning-bang-l');
  const bangREl = document.getElementById('boss-warning-bang-r');

  if (overlayEl) {
    overlayEl.style.setProperty(
      '--boss-warning-bar-scale',
      String(BOSS_WARNING_CONFIG.barDisplayScale),
    );
    overlayEl.style.setProperty(
      '--boss-warning-bang-scale',
      String(BOSS_WARNING_CONFIG.bangDisplayScale),
    );
    overlayEl.style.setProperty(
      '--boss-warning-offset-y',
      `${BOSS_WARNING_CONFIG.centerOffsetY}px`,
    );
  }

  if (barEl) {
    barEl.style.backgroundImage = `url("${BOSS_WARNING_BAR_URL}")`;
  }
  if (bangLEl) {
    bangLEl.style.backgroundImage = `url("${BOSS_WARNING_BANG_URL}")`;
  }
  if (bangREl) {
    bangREl.style.backgroundImage = `url("${BOSS_WARNING_BANG_URL}")`;
  }
}

/** 보스 경고 스프라이트 오버레이 표시 */
export function showBossWarning(durationMs = BOSS_CONFIG.warningDurationMs): void {
  if (!overlayEl) initBossWarning();
  if (!overlayEl) return;

  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  overlayEl.classList.remove('hidden');
  overlayEl.classList.remove('is-active');
  void overlayEl.offsetWidth;
  overlayEl.classList.add('is-active');

  hideTimer = setTimeout(() => {
    hideBossWarning();
    hideTimer = null;
  }, durationMs);
}

export function hideBossWarning(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  overlayEl?.classList.remove('is-active');
  overlayEl?.classList.add('hidden');
}

export { BOSS_WARNING_CONFIG };
