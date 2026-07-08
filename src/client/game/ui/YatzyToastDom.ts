const TOAST_DURATION_MS = 2000;
const MAX_TOASTS = 4;

let layerEl: HTMLElement | null = null;
const active: HTMLElement[] = [];

function getLayer(): HTMLElement | null {
  if (!layerEl) layerEl = document.getElementById('yatzy-toast-layer');
  return layerEl;
}

/** 소모량 표기 근처(주사위·버튼 사이) HUD 좌표 */
function toastAnchorY(layer: HTMLElement): number {
  const cost = document.getElementById('yatzy-reroll-cost');
  const diceRow = document.getElementById('yatzy-dice-row');
  const anchor = cost ?? diceRow;
  if (!anchor) return layer.clientHeight * 0.62;

  const layerRect = layer.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  if (layerRect.height <= 0 || layer.clientHeight <= 0) return layer.clientHeight * 0.62;

  const scale = layerRect.height / layer.clientHeight;
  return (anchorRect.top - layerRect.top) / scale + anchorRect.height / scale / 2;
}

/** 야찌 모달 위 플로팅 토스트 (위로 떠오르며 페이드아웃) */
export function showYatzyToast(message: string, ms = TOAST_DURATION_MS): void {
  const layer = getLayer();
  if (!layer) return;

  while (active.length >= MAX_TOASTS) {
    active.shift()?.remove();
  }

  const el = document.createElement('div');
  el.className = 'yz-toast';
  el.textContent = message;
  el.style.left = '50%';
  el.style.top = `${toastAnchorY(layer)}px`;
  layer.appendChild(el);
  active.push(el);

  requestAnimationFrame(() => el.classList.add('yz-toast--active'));

  window.setTimeout(() => {
    el.remove();
    const idx = active.indexOf(el);
    if (idx >= 0) active.splice(idx, 1);
  }, ms);
}

export function hideYatzyToast(): void {
  for (const el of active) el.remove();
  active.length = 0;
}
