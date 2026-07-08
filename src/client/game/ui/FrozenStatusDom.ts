const FADE_MS = 180;

let overlayEl: HTMLElement | null = null;
let labelEl: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function initFrozenOverlay(): void {
  overlayEl = document.getElementById('frozen-overlay');
  labelEl = document.getElementById('frozen-overlay-label');
}

/** Guardian 스파이크 피격 — 파란 딤 + 중앙 "얼어버림" */
export function showFrozenOverlay(durationMs: number): void {
  if (!overlayEl) overlayEl = document.getElementById('frozen-overlay');
  if (!labelEl) labelEl = document.getElementById('frozen-overlay-label');
  if (!overlayEl) return;

  if (hideTimer != null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  overlayEl.classList.remove('is-active');
  void overlayEl.offsetWidth;
  overlayEl.classList.add('is-active');

  hideTimer = window.setTimeout(() => {
    overlayEl?.classList.remove('is-active');
    hideTimer = null;
  }, durationMs + FADE_MS);
}

export function hideFrozenOverlay(): void {
  if (hideTimer != null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  overlayEl?.classList.remove('is-active');
}
