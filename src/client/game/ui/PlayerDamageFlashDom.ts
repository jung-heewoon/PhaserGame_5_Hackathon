const FLASH_DURATION_MS = 520;

let flashEl: HTMLElement | null = null;

export function initPlayerDamageFlash(): void {
  flashEl = document.getElementById('player-damage-flash');
}

/** 플레이어 피격 시 화면 붉은 비네트 깜빡임 */
export function playPlayerDamageFlash(): void {
  if (!flashEl) flashEl = document.getElementById('player-damage-flash');
  if (!flashEl) return;

  flashEl.classList.remove('is-active');
  void flashEl.offsetWidth;
  flashEl.classList.add('is-active');

  window.setTimeout(() => {
    flashEl?.classList.remove('is-active');
  }, FLASH_DURATION_MS);
}
