import heartUrl from '../Image/UI/Heart/heart.png';
import bulletUrl from '../Image/Object/bullet.png';
import { BOSS_CHEST_CONFIG } from '../config/BossChestConfig.ts';
import { COIN_CONFIG } from '../config/CoinConfig.ts';
import { PICKUP_FLY_CONFIG, type PickupKind } from '../config/PickupFlyConfig.ts';
import { GAME_DESIGN_HEIGHT, GAME_DESIGN_WIDTH } from '../config/GameDisplayConfig.ts';

const TARGET_IDS: Record<PickupKind, string> = {
  dice: 'hud-dice-count',
  heart: 'hud-hearts',
  bullet: 'hud-ammo',
};

const sprites: Record<PickupKind, string> = {
  dice: '',
  heart: heartUrl,
  bullet: bulletUrl,
};

let layerEl: HTMLElement | null = null;
let activeCount = 0;
let token = 0;

interface PendingBossDice {
  el: HTMLElement;
  holdX: number;
  holdY: number;
  holdScale: number;
}

const pendingBossDice: PendingBossDice[] = [];
let bossChestDiceErupting = 0;
let bossChestDiceExpectedCount = 0;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function clearPendingBossDice(): void {
  for (const dice of pendingBossDice) {
    dice.el.remove();
  }
  pendingBossDice.length = 0;
  bossChestDiceErupting = 0;
  bossChestDiceExpectedCount = 0;
  layerEl?.classList.remove('pickup-fly-layer--boss-chest');
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function easeInCubic(t: number): number {
  return t * t * t;
}

/** #doom-hud-layer 디자인 좌표(1280×720) 기준 요소 중심 */
function getElementHudCenter(el: HTMLElement): { x: number; y: number } {
  const hudLayer = document.getElementById('doom-hud-layer');
  if (!hudLayer) return { x: GAME_DESIGN_WIDTH / 2, y: GAME_DESIGN_HEIGHT / 2 };

  const hudRect = hudLayer.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const scale = hudRect.width > 0 ? hudRect.width / GAME_DESIGN_WIDTH : 1;

  return {
    x: (elRect.left + elRect.width / 2 - hudRect.left) / scale,
    y: (elRect.top + elRect.height / 2 - hudRect.top) / scale,
  };
}

function pulseTarget(kind: PickupKind): void {
  const el = document.getElementById(TARGET_IDS[kind]);
  if (!el) return;
  el.classList.remove('pickup-target-pulse');
  void el.offsetWidth;
  el.classList.add('pickup-target-pulse');
}

export function initPickupFly(): void {
  layerEl = document.getElementById('pickup-fly-layer');
}

/** 주사위는 절차적 캔버스 텍스처 → 씬에서 dataURL 주입 */
export function setDiceSprite(dataUrl: string): void {
  sprites.dice = dataUrl;
}

export function resetPickupFly(): void {
  token += 1;
  activeCount = 0;
  clearPendingBossDice();
  if (layerEl) layerEl.replaceChildren();
}

/** 보스 상자 연출 — 주사위 fly 레이어를 팝업 위로 */
export function beginBossChestDiceLayer(expectedDiceCount = 0): void {
  bossChestDiceExpectedCount = expectedDiceCount;
  layerEl?.classList.add('pickup-fly-layer--boss-chest');
}

/** 상자 중심에서 포물선으로 분출 → 팝업 안에 안착 */
export function eruptBossChestDice(
  originX: number,
  originY: number,
  spreadIndex: number,
  totalCount: number,
): void {
  const url = sprites.dice;
  if (!url || !layerEl) return;

  const myToken = token;
  bossChestDiceErupting += 1;
  activeCount += 1;

  const {
    coinEruptSpreadMinPx,
    coinEruptSpreadMaxPx,
    coinEruptSizePx,
    coinEruptStartScale,
    coinArcEndScale,
    coinHoldSizePx,
    coinHoldScale,
    coinArcMs,
    coinArcPeakMinPx,
    coinArcPeakMaxPx,
    coinLandPopMs,
  } = BOSS_CHEST_CONFIG;

  const holdSizePx = Math.round(coinHoldSizePx * 0.92);
  const eruptStartScale = (coinEruptSizePx * coinEruptStartScale) / holdSizePx;
  const arcEndScaleVal = (coinEruptSizePx * coinArcEndScale) / holdSizePx;

  const el = document.createElement('div');
  el.className = 'pickup-fly pickup-fly--boss-chest';
  el.style.width = `${holdSizePx}px`;
  el.style.height = `${holdSizePx}px`;
  el.style.backgroundImage = `url("${url}")`;
  layerEl.appendChild(el);

  const baseAng = (spreadIndex / Math.max(1, totalCount)) * Math.PI * 2;
  const ang = baseAng + (Math.random() * 0.5 - 0.25);
  const dist =
    coinEruptSpreadMinPx +
    Math.random() * Math.max(0, coinEruptSpreadMaxPx - coinEruptSpreadMinPx);
  const holdX = originX + Math.cos(ang) * dist + (Math.random() * 2 - 1) * 14;
  const holdY = originY + Math.sin(ang) * dist * 0.68 + (Math.random() * 2 - 1) * 12;
  const arcPeak =
    coinArcPeakMinPx + Math.random() * Math.max(0, coinArcPeakMaxPx - coinArcPeakMinPx);

  const startT = performance.now();

  const step = (now: number): void => {
    if (myToken !== token || !el.isConnected) {
      el.remove();
      bossChestDiceErupting = Math.max(0, bossChestDiceErupting - 1);
      activeCount = Math.max(0, activeCount - 1);
      return;
    }

    const t = now - startT;
    let x: number;
    let y: number;
    let scale: number;

    if (t <= coinArcMs) {
      const p = coinArcMs > 0 ? Math.min(1, t / coinArcMs) : 1;
      const e = easeOutCubic(p);
      x = lerp(originX, holdX, e);
      y = lerp(originY, holdY, e) - arcPeak * Math.sin(Math.PI * p);
      scale = lerp(eruptStartScale, arcEndScaleVal, p);
    } else if (t <= coinArcMs + coinLandPopMs) {
      const p = coinLandPopMs > 0 ? Math.min(1, (t - coinArcMs) / coinLandPopMs) : 1;
      const e = easeOutCubic(p);
      x = holdX;
      y = holdY;
      scale = lerp(arcEndScaleVal, coinHoldScale, e);
    } else {
      x = holdX;
      y = holdY;
      scale = coinHoldScale;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;
      el.classList.add('pickup-fly--boss-hold');
      bossChestDiceErupting = Math.max(0, bossChestDiceErupting - 1);
      activeCount = Math.max(0, activeCount - 1);
      pendingBossDice.push({ el, holdX, holdY, holdScale: scale });
      return;
    }

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    requestAnimationFrame(step);
  };

  el.style.left = `${originX}px`;
  el.style.top = `${originY}px`;
  el.style.transform = `translate(-50%, -50%) scale(${eruptStartScale * 0.85})`;
  requestAnimationFrame(step);
}

/** 팝업 닫을 때 대기 중인 주사위를 HUD로 흡수 */
export function releaseBossChestDiceToHud(): void {
  let waitAttempts = 0;
  const maxWaitAttempts = 50;

  const startRelease = (): void => {
    waitAttempts += 1;
    const stillErupting = bossChestDiceErupting > 0;
    const stillLanding =
      bossChestDiceExpectedCount > 0 && pendingBossDice.length < bossChestDiceExpectedCount;

    if ((stillErupting || stillLanding) && waitAttempts < maxWaitAttempts) {
      window.setTimeout(startRelease, 40);
      return;
    }

    if (pendingBossDice.length === 0) {
      layerEl?.classList.remove('pickup-fly-layer--boss-chest');
      bossChestDiceExpectedCount = 0;
      return;
    }

    const myToken = token;
    const diceList = pendingBossDice.splice(0, pendingBossDice.length);
    layerEl?.classList.remove('pickup-fly-layer--boss-chest');
    bossChestDiceExpectedCount = 0;

    diceList.forEach((dice, i) => {
      if (activeCount >= PICKUP_FLY_CONFIG.maxActive) {
        dice.el.remove();
        return;
      }

      window.setTimeout(() => {
        suckHeldDiceToHud(dice, myToken);
      }, i * COIN_CONFIG.staggerMs);
    });
  };

  startRelease();
}

function suckHeldDiceToHud(dice: PendingBossDice, myToken: number): void {
  if (!layerEl || myToken !== token) {
    dice.el.remove();
    return;
  }

  activeCount += 1;
  const el = dice.el;
  el.classList.remove('pickup-fly--boss-hold');

  const startT = performance.now();
  const { suckMs } = COIN_CONFIG;
  const fx = dice.holdX;
  const fy = dice.holdY;
  const startScale = dice.holdScale;

  const step = (now: number): void => {
    if (myToken !== token || !el.isConnected) {
      el.remove();
      activeCount = Math.max(0, activeCount - 1);
      return;
    }

    const p = suckMs > 0 ? Math.min(1, (now - startT) / suckMs) : 1;
    const e = easeInCubic(p);
    const targetEl = document.getElementById(TARGET_IDS.dice);
    const end = targetEl
      ? getElementHudCenter(targetEl)
      : { x: GAME_DESIGN_WIDTH - 140, y: 52 };
    const x = lerp(fx, end.x, e);
    const y = lerp(fy, end.y, e);
    const scale = lerp(startScale, PICKUP_FLY_CONFIG.suckEndScale, e);
    const opacity = p > 0.82 ? Math.max(0, 1 - (p - 0.82) / 0.18) : 1;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    el.style.opacity = String(opacity);

    if (p >= 1) {
      el.remove();
      activeCount = Math.max(0, activeCount - 1);
      pulseTarget('dice');
      return;
    }

    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

/** 픽업 획득 위치(HUD 좌표)에서 해당 HUD로 날아가는 연출 */
export function spawnPickupFly(kind: PickupKind, startX: number, startY: number): void {
  if (!layerEl) return;
  const url = sprites[kind];
  if (!url) return;
  if (activeCount >= PICKUP_FLY_CONFIG.maxActive) return;

  const myToken = token;
  activeCount += 1;

  const size = PICKUP_FLY_CONFIG.sizePx[kind];
  const el = document.createElement('div');
  el.className = 'pickup-fly';
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.backgroundImage = `url("${url}")`;
  layerEl.appendChild(el);

  const ang = Math.random() * Math.PI * 2;
  const r = Math.random() * PICKUP_FLY_CONFIG.spreadPx;
  const ox = startX + Math.cos(ang) * r;
  const oy = startY + Math.sin(ang) * r;
  const fx = ox + (Math.random() * 2 - 1) * PICKUP_FLY_CONFIG.floatDriftPx * 0.5;
  const fy = oy - PICKUP_FLY_CONFIG.floatDriftPx;

  const startT = performance.now();
  const { popMs, floatMs, suckMs } = PICKUP_FLY_CONFIG;
  const preMs = popMs + floatMs;

  const step = (now: number): void => {
    if (myToken !== token || !el.isConnected) {
      el.remove();
      activeCount = Math.max(0, activeCount - 1);
      return;
    }

    const t = now - startT;
    let x: number;
    let y: number;
    let scale: number;
    let opacity = 1;

    if (t <= popMs) {
      const p = popMs > 0 ? t / popMs : 1;
      x = ox;
      y = oy;
      scale = lerp(0.4, PICKUP_FLY_CONFIG.popScale, easeOutBack(Math.min(1, p)));
    } else if (t <= preMs) {
      const p = floatMs > 0 ? (t - popMs) / floatMs : 1;
      const e = easeInOut(Math.min(1, p));
      x = lerp(ox, fx, e);
      y = lerp(oy, fy, e);
      scale = lerp(PICKUP_FLY_CONFIG.popScale, PICKUP_FLY_CONFIG.floatScale, e);
    } else {
      const p = suckMs > 0 ? Math.min(1, (t - preMs) / suckMs) : 1;
      const e = easeInCubic(p);
      const targetEl = document.getElementById(TARGET_IDS[kind]);
      const end = targetEl
        ? getElementHudCenter(targetEl)
        : { x: GAME_DESIGN_WIDTH / 2, y: GAME_DESIGN_HEIGHT / 2 };
      x = lerp(fx, end.x, e);
      y = lerp(fy, end.y, e);
      scale = lerp(PICKUP_FLY_CONFIG.floatScale, PICKUP_FLY_CONFIG.suckEndScale, e);
      opacity = p > 0.82 ? Math.max(0, 1 - (p - 0.82) / 0.18) : 1;

      if (p >= 1) {
        el.remove();
        activeCount = Math.max(0, activeCount - 1);
        pulseTarget(kind);
        return;
      }
    }

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    el.style.opacity = String(opacity);
    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}
