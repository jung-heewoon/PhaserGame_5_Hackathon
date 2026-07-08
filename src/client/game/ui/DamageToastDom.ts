const MAX_TOASTS = 20;
const TOAST_DURATION_MS = 850;

let layerEl: HTMLElement | null = null;
const active: HTMLElement[] = [];

export function initDamageToastLayer(): void {
  layerEl = document.getElementById('floating-damage-layer');
}

/** EnemyEntity에서 TPF 투영 후 design HUD 좌표 전달 */
export interface DamageToastAnchor {
  hudX: number;
  hudY: number;
}

export function spawnDamageToast(
  amount: number,
  anchor: DamageToastAnchor,
  className = 'damage-toast',
): void {
  if (!layerEl) layerEl = document.getElementById('floating-damage-layer');
  if (!layerEl || amount <= 0) return;

  while (active.length >= MAX_TOASTS) {
    const oldest = active.shift();
    oldest?.remove();
  }

  const el = document.createElement('span');
  el.className = className;
  el.textContent = `-${Math.round(amount)}`;
  el.style.left = `${anchor.hudX}px`;
  el.style.top = `${anchor.hudY}px`;
  layerEl.appendChild(el);
  active.push(el);

  requestAnimationFrame(() => el.classList.add('damage-toast--active'));

  window.setTimeout(() => {
    el.remove();
    const idx = active.indexOf(el);
    if (idx >= 0) active.splice(idx, 1);
  }, TOAST_DURATION_MS);
}

export function clearDamageToasts(): void {
  for (const el of active) el.remove();
  active.length = 0;
}
