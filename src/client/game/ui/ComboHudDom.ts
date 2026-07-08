import { GAME_DESIGN_WIDTH } from '../config/GameDisplayConfig.ts';
import { COMBO_SCORE_CONFIG } from '../config/ComboScoreConfig.ts';
import { pulseScoreHud } from './RunHudDom.ts';

export interface ComboHudSnapshot {
  killCount: number;
  multiplier: number;
  timerRatio: number;
  visible: boolean;
}

let comboHudEl: HTMLElement | null = null;
let comboMultEl: HTMLElement | null = null;
let comboGaugeFillEl: HTMLElement | null = null;
let settleLayerEl: HTMLElement | null = null;
let settlementToken = 0;
let lastComboMultText = '';
let lastComboGaugeWidth = '';
let lastComboVisible = false;

/** #doom-hud-layer 디자인 좌표(1280×720) — HudViewportSync scale 보정 */
function getElementHudCenter(el: HTMLElement): { x: number; y: number } {
  const hudLayer = document.getElementById('doom-hud-layer');
  if (!hudLayer) {
    return { x: GAME_DESIGN_WIDTH / 2, y: 72 };
  }

  const hudRect = hudLayer.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const scale = hudRect.width > 0 ? hudRect.width / GAME_DESIGN_WIDTH : 1;

  return {
    x: (elRect.left + elRect.width / 2 - hudRect.left) / scale,
    y: (elRect.top + elRect.height / 2 - hudRect.top) / scale,
  };
}

export function initComboHud(): void {
  comboHudEl = document.getElementById('combo-hud');
  comboMultEl = document.getElementById('combo-mult');
  comboGaugeFillEl = document.getElementById('combo-gauge-fill');
  settleLayerEl = document.getElementById('combo-settle-layer');
}

export function hideComboHud(): void {
  if (!comboHudEl || !comboGaugeFillEl) return;
  comboHudEl.classList.add('hidden');
  comboHudEl.setAttribute('aria-hidden', 'true');
  comboGaugeFillEl.style.width = '0%';
  lastComboVisible = false;
  lastComboGaugeWidth = '0%';
}

export function resetComboHud(): void {
  settlementToken += 1;
  lastComboMultText = '';
  lastComboGaugeWidth = '';
  lastComboVisible = false;
  if (settleLayerEl) settleLayerEl.replaceChildren();
  if (!comboHudEl || !comboGaugeFillEl) return;
  comboHudEl.classList.add('hidden');
  comboHudEl.setAttribute('aria-hidden', 'true');
  comboGaugeFillEl.style.width = '0%';
}

export function updateComboHud(snapshot: ComboHudSnapshot): void {
  if (!comboHudEl || !comboMultEl || !comboGaugeFillEl) return;

  const visible = snapshot.visible && snapshot.killCount > 0;

  if (!visible) {
    if (lastComboVisible) {
      comboHudEl.classList.add('hidden');
      comboHudEl.setAttribute('aria-hidden', 'true');
      lastComboVisible = false;
    }
    return;
  }

  if (!lastComboVisible) {
    comboHudEl.classList.remove('hidden');
    comboHudEl.setAttribute('aria-hidden', 'false');
    lastComboVisible = true;
  }

  const multText = `x${snapshot.multiplier.toFixed(1)}`;
  if (multText !== lastComboMultText) {
    lastComboMultText = multText;
    comboMultEl.textContent = multText;
  }

  const gaugeWidth = `${Math.round(Math.max(0, Math.min(1, snapshot.timerRatio)) * 1000) / 10}%`;
  if (gaugeWidth !== lastComboGaugeWidth) {
    lastComboGaugeWidth = gaugeWidth;
    comboGaugeFillEl.style.width = gaugeWidth;
  }
}

export function playComboSettlement(amount: number, onComplete: () => void): void {
  if (!settleLayerEl) {
    onComplete();
    return;
  }

  const token = ++settlementToken;
  settleLayerEl.replaceChildren();

  const scoreEl = document.getElementById('hud-score');
  const comboHud = document.getElementById('combo-hud');

  const startPos = comboHud
    ? getElementHudCenter(comboHud)
    : getElementHudCenter(
        (document.querySelector('.doom-hud__score-stack') as HTMLElement | null) ??
          document.body,
      );
  const endPos = scoreEl
    ? getElementHudCenter(scoreEl)
    : { x: GAME_DESIGN_WIDTH / 2, y: 52 };

  hideComboHud();

  const flyEl = document.createElement('span');
  flyEl.className = 'combo-settle-fly';
  flyEl.textContent = `+${amount}`;
  flyEl.style.left = `${startPos.x}px`;
  flyEl.style.top = `${startPos.y}px`;
  settleLayerEl.appendChild(flyEl);

  requestAnimationFrame(() => {
    if (token !== settlementToken) return;
    flyEl.classList.add('combo-settle-fly--pop');
  });

  window.setTimeout(() => {
    if (token !== settlementToken) return;

    flyEl.classList.remove('combo-settle-fly--pop');
    flyEl.classList.add('combo-settle-fly--flying');
    flyEl.style.left = `${endPos.x}px`;
    flyEl.style.top = `${endPos.y}px`;
    flyEl.style.opacity = '0';
    flyEl.style.transform = 'translate(-50%, -50%) scale(0.55)';
  }, COMBO_SCORE_CONFIG.settlementHoldMs);

  window.setTimeout(() => {
    if (token !== settlementToken) return;
    flyEl.remove();
    onComplete();
    pulseScoreHud();
  }, COMBO_SCORE_CONFIG.settlementHoldMs + COMBO_SCORE_CONFIG.settlementFlyMs);
}
