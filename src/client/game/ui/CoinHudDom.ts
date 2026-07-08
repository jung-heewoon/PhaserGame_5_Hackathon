import coinUrl from '../Image/UI/coin4_16x16.png';
import {
  BOSS_CHEST_CONFIG,
  distributeGoldAcrossCoins,
  visualCoinCountForGold,
} from '../config/BossChestConfig.ts';
import { COIN_CONFIG } from '../config/CoinConfig.ts';
import { GAME_DESIGN_WIDTH } from '../config/GameDisplayConfig.ts';
import { sfxManager } from '../systems/SfxManager.ts';

let iconEl: HTMLElement | null = null;
let countEl: HTMLElement | null = null;
let layerEl: HTMLElement | null = null;

let displayed = 0;
let activeCount = 0;
/** reset 시 진행 중인 연출 무효화 */
let token = 0;

interface PendingBossCoin {
  el: HTMLElement;
  holdX: number;
  holdY: number;
  holdScale: number;
  value: number;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function setBossCoinPixelSize(el: HTMLElement, sizePx: number): void {
  el.style.setProperty('--coin-fly-size', `${sizePx}px`);
  el.style.width = `${sizePx}px`;
  el.style.height = `${sizePx}px`;
  el.style.backgroundSize = `${sizePx * COIN_CONFIG.frameCount}px ${sizePx}px`;
}

function applyBossChestCoinVisual(el: HTMLElement, sizePx: number): void {
  el.classList.add('coin-fly', 'coin-fly--boss-chest');
  setBossCoinPixelSize(el, sizePx);
}

function spawnBossCoinTrail(x: number, y: number, coinVisualPx: number, myToken: number): void {
  if (!layerEl || myToken !== token) return;

  const dot = document.createElement('div');
  dot.className = 'coin-boss-trail';
  const trailSize = Math.max(
    BOSS_CHEST_CONFIG.coinTrailMinPx,
    coinVisualPx * BOSS_CHEST_CONFIG.coinTrailSizeMult,
  );
  dot.style.width = `${trailSize}px`;
  dot.style.height = `${trailSize}px`;
  dot.style.left = `${x}px`;
  dot.style.top = `${y}px`;
  layerEl.insertBefore(dot, layerEl.firstChild);

  window.setTimeout(() => {
    if (dot.isConnected) dot.remove();
  }, 450);
}

const pendingBossCoins: PendingBossCoin[] = [];
let bossChestErupting = 0;
let bossChestExpectedCount = 0;

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
  if (!hudLayer) return { x: GAME_DESIGN_WIDTH - 140, y: 52 };

  const hudRect = hudLayer.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const scale = hudRect.width > 0 ? hudRect.width / GAME_DESIGN_WIDTH : 1;

  return {
    x: (elRect.left + elRect.width / 2 - hudRect.left) / scale,
    y: (elRect.top + elRect.height / 2 - hudRect.top) / scale,
  };
}

function setDisplayed(value: number): void {
  displayed = Math.max(0, value);
  if (countEl) countEl.textContent = String(displayed);
}

function pulseIcon(): void {
  if (!iconEl) return;
  iconEl.classList.remove('doom-hud__coin-icon--pulse');
  void iconEl.offsetWidth;
  iconEl.classList.add('doom-hud__coin-icon--pulse');
}

function onCoinArrivedAtHud(value: number): void {
  setDisplayed(displayed + value);
  pulseIcon();
  sfxManager.playCoinGet();
}

function clearPendingBossCoins(): void {
  for (const coin of pendingBossCoins) {
    coin.el.remove();
  }
  pendingBossCoins.length = 0;
  bossChestErupting = 0;
  bossChestExpectedCount = 0;
  layerEl?.classList.remove('coin-fly-layer--boss-chest');
}

export function initCoinHud(): void {
  iconEl = document.getElementById('hud-coin-icon');
  countEl = document.getElementById('hud-coin-count');
  layerEl = document.getElementById('coin-fly-layer');

  const spriteCss = `url("${coinUrl}")`;
  if (iconEl) {
    iconEl.style.setProperty('--coin-icon-size', `${COIN_CONFIG.iconSizePx}px`);
    iconEl.style.backgroundImage = spriteCss;
  }
  if (layerEl) {
    layerEl.style.setProperty('--coin-fly-size', `${COIN_CONFIG.flySizePx}px`);
  }
  setDisplayed(0);
}

export function resetCoinHud(): void {
  token += 1;
  activeCount = 0;
  clearPendingBossCoins();
  if (layerEl) layerEl.replaceChildren();
  setDisplayed(0);
}

/** 보스 상자 연출 시작 — 코인 레이어를 팝업 위로 올림 */
export function beginBossChestCoinLayer(expectedCoinCount = 0): void {
  bossChestExpectedCount = expectedCoinCount;
  layerEl?.classList.add('coin-fly-layer--boss-chest');
}

/** 상자 열림(14~21프레임) 구간 분출용 청크 목록 */
export function buildBossChestCoinChunks(totalGold: number): number[] {
  const visualCount = visualCoinCountForGold(totalGold);
  return distributeGoldAcrossCoins(totalGold, visualCount);
}

/** 상자 중심에서 포물선으로 분출 → 팝업 안에 크게 안착 후 스핀 유지 */
export function eruptBossChestCoin(
  originX: number,
  originY: number,
  value: number,
  spreadIndex: number,
  totalCount: number,
): void {
  if (value <= 0 || !layerEl) return;

  const myToken = token;
  bossChestErupting += 1;
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
    coinTrailIntervalMs,
    coinLandPopMs,
  } = BOSS_CHEST_CONFIG;

  const eruptStartScale = (coinEruptSizePx * coinEruptStartScale) / coinHoldSizePx;
  const arcEndScaleVal = (coinEruptSizePx * coinArcEndScale) / coinHoldSizePx;

  const el = document.createElement('div');
  applyBossChestCoinVisual(el, coinHoldSizePx);
  el.style.animationDuration = `${COIN_CONFIG.spinDurationMs}ms`;
  el.style.backgroundImage = `url("${coinUrl}")`;
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
  let lastTrailAt = 0;

  const step = (now: number): void => {
    if (myToken !== token || !el.isConnected) {
      el.remove();
      bossChestErupting = Math.max(0, bossChestErupting - 1);
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

      if (t - lastTrailAt >= coinTrailIntervalMs) {
        lastTrailAt = t;
        spawnBossCoinTrail(x, y, coinHoldSizePx * scale, myToken);
      }

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;
      requestAnimationFrame(step);
      return;
    }

    if (t <= coinArcMs + coinLandPopMs) {
      const p = coinLandPopMs > 0 ? Math.min(1, (t - coinArcMs) / coinLandPopMs) : 1;
      const e = easeOutCubic(p);
      x = holdX;
      y = holdY;
      scale = lerp(arcEndScaleVal, coinHoldScale, e);

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;
      requestAnimationFrame(step);
      return;
    }

    x = holdX;
    y = holdY;
    scale = coinHoldScale;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--coin-hold-scale', String(scale));
    el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    el.classList.add('coin-fly--boss-hold');
    bossChestErupting = Math.max(0, bossChestErupting - 1);
    activeCount = Math.max(0, activeCount - 1);
    pendingBossCoins.push({ el, holdX, holdY, holdScale: scale, value });
  };

  el.style.left = `${originX}px`;
  el.style.top = `${originY}px`;
  el.style.transform = `translate(-50%, -50%) scale(${eruptStartScale * 0.85})`;
  requestAnimationFrame(step);
}

/** 팝업 닫을 때 대기 중인 코인을 HUD로 흡수 */
export function releaseBossChestCoinsToHud(): void {
  let waitAttempts = 0;
  const maxWaitAttempts = 50;

  const startRelease = (): void => {
    waitAttempts += 1;
    const stillErupting = bossChestErupting > 0;
    const stillLanding =
      bossChestExpectedCount > 0 && pendingBossCoins.length < bossChestExpectedCount;

    if ((stillErupting || stillLanding) && waitAttempts < maxWaitAttempts) {
      window.setTimeout(startRelease, 40);
      return;
    }

    if (pendingBossCoins.length === 0) {
      layerEl?.classList.remove('coin-fly-layer--boss-chest');
      bossChestExpectedCount = 0;
      return;
    }

    const myToken = token;
    const coins = pendingBossCoins.splice(0, pendingBossCoins.length);
    layerEl?.classList.remove('coin-fly-layer--boss-chest');
    bossChestExpectedCount = 0;

    let skippedGold = 0;
    coins.forEach((coin, i) => {
      if (activeCount >= COIN_CONFIG.maxActiveFly) {
        skippedGold += coin.value;
        coin.el.remove();
        return;
      }

      window.setTimeout(() => {
        suckHeldCoinToHud(coin, myToken);
      }, i * COIN_CONFIG.staggerMs);
    });

    if (skippedGold > 0) {
      setDisplayed(displayed + skippedGold);
    }
  };

  startRelease();
}

function suckHeldCoinToHud(coin: PendingBossCoin, myToken: number): void {
  if (!layerEl || myToken !== token) {
    coin.el.remove();
    return;
  }

  activeCount += 1;
  const el = coin.el;
  el.classList.remove('coin-fly--boss-hold');
  el.style.animation = `coin-spin ${COIN_CONFIG.spinDurationMs}ms steps(9) infinite`;

  const startT = performance.now();
  const { suckMs } = COIN_CONFIG;
  const fx = coin.holdX;
  const fy = coin.holdY;
  const startScale = coin.holdScale;

  const step = (now: number): void => {
    if (myToken !== token || !el.isConnected) {
      el.remove();
      activeCount = Math.max(0, activeCount - 1);
      return;
    }

    const p = suckMs > 0 ? Math.min(1, (now - startT) / suckMs) : 1;
    const e = easeInCubic(p);
    const end = iconEl ? getElementHudCenter(iconEl) : { x: GAME_DESIGN_WIDTH - 140, y: 52 };
    const x = lerp(fx, end.x, e);
    const y = lerp(fy, end.y, e);
    const scale = lerp(startScale, COIN_CONFIG.suckEndScale, e);
    const opacity = p > 0.82 ? Math.max(0, 1 - (p - 0.82) / 0.18) : 1;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    el.style.opacity = String(opacity);

    if (p >= 1) {
      el.remove();
      activeCount = Math.max(0, activeCount - 1);
      onCoinArrivedAtHud(coin.value);
      return;
    }

    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

/** 사망 위치(HUD 좌표)에서 amount개 코인이 튀어나와 UI로 빨려듦 */
export function spawnCoinBurst(startX: number, startY: number, amount: number): void {
  if (amount <= 0) return;
  if (!layerEl) {
    setDisplayed(displayed + amount);
    return;
  }

  const myToken = token;
  for (let i = 0; i < amount; i++) {
    if (activeCount >= COIN_CONFIG.maxActiveFly) {
      setDisplayed(displayed + (amount - i));
      break;
    }
    window.setTimeout(() => spawnOneCoin(startX, startY, myToken, 1), i * COIN_CONFIG.staggerMs);
  }
}

/** @deprecated 보스 상자는 eruptBossChestCoin + releaseBossChestCoinsToHud 사용 */
export function spawnRewardCoinBurst(startX: number, startY: number, totalGold: number): void {
  if (totalGold <= 0) return;
  beginBossChestCoinLayer();
  const chunks = buildBossChestCoinChunks(totalGold);
  const originX = startX;
  const originY = startY;
  chunks.forEach((chunk, i) => {
    window.setTimeout(
      () => eruptBossChestCoin(originX, originY, chunk, i, chunks.length),
      i * COIN_CONFIG.staggerMs,
    );
  });
  window.setTimeout(() => releaseBossChestCoinsToHud(), chunks.length * COIN_CONFIG.staggerMs + 400);
}

function spawnOneCoin(
  startX: number,
  startY: number,
  myToken: number,
  valueOnArrive = 1,
): void {
  if (!layerEl || myToken !== token) return;

  activeCount += 1;

  const el = document.createElement('div');
  el.className = 'coin-fly';
  el.style.animationDuration = `${COIN_CONFIG.spinDurationMs}ms`;
  el.style.backgroundImage = `url("${coinUrl}")`;
  layerEl.appendChild(el);

  const ang = Math.random() * Math.PI * 2;
  const r = Math.random() * COIN_CONFIG.spreadPx;
  const ox = startX + Math.cos(ang) * r;
  const oy = startY + Math.sin(ang) * r;
  const fx = ox + (Math.random() * 2 - 1) * COIN_CONFIG.floatDriftPx * 0.5;
  const fy = oy - COIN_CONFIG.floatDriftPx;

  const startT = performance.now();
  const { popMs, floatMs, suckMs } = COIN_CONFIG;
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
      scale = lerp(0.3, COIN_CONFIG.popScale, easeOutBack(Math.min(1, p)));
    } else if (t <= preMs) {
      const p = floatMs > 0 ? (t - popMs) / floatMs : 1;
      const e = easeInOut(Math.min(1, p));
      x = lerp(ox, fx, e);
      y = lerp(oy, fy, e);
      scale = lerp(COIN_CONFIG.popScale, COIN_CONFIG.floatScale, e);
    } else {
      const p = suckMs > 0 ? Math.min(1, (t - preMs) / suckMs) : 1;
      const e = easeInCubic(p);
      const end = iconEl ? getElementHudCenter(iconEl) : { x: GAME_DESIGN_WIDTH - 140, y: 52 };
      x = lerp(fx, end.x, e);
      y = lerp(fy, end.y, e);
      scale = lerp(COIN_CONFIG.floatScale, COIN_CONFIG.suckEndScale, e);
      opacity = p > 0.82 ? Math.max(0, 1 - (p - 0.82) / 0.18) : 1;

      if (p >= 1) {
        el.remove();
        activeCount = Math.max(0, activeCount - 1);
        onCoinArrivedAtHud(valueOnArrive);
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
