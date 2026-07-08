import { CHEST_SPRITE_URL } from '../assets/ChestAssets.ts';
import {
  BOSS_CHEST_CONFIG,
  buildBossChestDiceChunks,
  chestRowOffsetY,
  getBossChestTierDef,
  rollBossChestReward,
  rollBossChestTier,
  type BossChestRewardKind,
  type BossChestTier,
} from '../config/BossChestConfig.ts';
import { localeManager } from '../locale/LocaleManager.ts';
import { GAME_DESIGN_HEIGHT, GAME_DESIGN_WIDTH } from '../config/GameDisplayConfig.ts';
import {
  beginBossChestCoinLayer,
  buildBossChestCoinChunks,
  eruptBossChestCoin,
} from './CoinHudDom.ts';
import {
  beginBossChestDiceLayer,
  eruptBossChestDice,
} from './PickupFlyDom.ts';
import { domUiBridge } from './DomUiBridge.ts';

export interface BossChestModalResult {
  tier: BossChestTier;
  rewardKind: BossChestRewardKind;
  amount: number;
}

export interface BossChestModalParams {
  onClose: (result: BossChestModalResult) => void;
}

interface ActiveSession {
  params: BossChestModalParams;
  tier: BossChestTier;
  rewardKind: BossChestRewardKind;
  amount: number;
  coinChunks: number[];
  diceVisualCount: number;
  coinsErupted: number;
  diceErupted: number;
  timers: ReturnType<typeof setTimeout>[];
  animToken: number;
}

let modalEl: HTMLElement | null = null;
let panelEl: HTMLElement | null = null;
let actorEl: HTMLElement | null = null;
let chestEl: HTMLElement | null = null;
let flashEl: HTMLElement | null = null;
let vfxEl: HTMLElement | null = null;
let tierLabelEl: HTMLElement | null = null;
let goldEl: HTMLElement | null = null;
let diceEl: HTMLElement | null = null;
let rewardEl: HTMLElement | null = null;
let closeBtn: HTMLButtonElement | null = null;

let session: ActiveSession | null = null;
let sessionToken = 0;

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function clearSessionTimers(): void {
  if (!session) return;
  for (const t of session.timers) clearTimeout(t);
  session.timers = [];
}

function schedule(ms: number, fn: () => void): void {
  if (!session) return;
  const id = window.setTimeout(fn, ms);
  session.timers.push(id);
}

function tierLocaleKey(tier: BossChestTier): string {
  return `bossChest.${tier}`;
}

/** 상자 입구 근처 — #doom-hud-layer 디자인 좌표 */
function getChestHudOrigin(): { x: number; y: number } {
  const hudLayer = document.getElementById('doom-hud-layer');
  const target = chestEl ?? actorEl;
  if (!hudLayer || !target) {
    return { x: GAME_DESIGN_WIDTH / 2, y: GAME_DESIGN_HEIGHT / 2 };
  }

  const hudRect = hudLayer.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  const scale = hudRect.width > 0 ? hudRect.width / GAME_DESIGN_WIDTH : 1;

  return {
    x: (rect.left + rect.width / 2 - hudRect.left) / scale,
    y: (rect.top + rect.height / 2 - hudRect.top) / scale,
  };
}

function eruptDiceForFrame(frame: number): void {
  if (!session) return;
  const { coinEruptFrameStart, coinEruptFrameEnd } = BOSS_CHEST_CONFIG;
  if (frame < coinEruptFrameStart || frame > coinEruptFrameEnd) return;

  const frameIdx = frame - coinEruptFrameStart;
  const frameCount = coinEruptFrameEnd - coinEruptFrameStart + 1;
  const total = session.diceVisualCount;
  if (total <= 0) return;

  const perFrame = Math.ceil(total / frameCount);
  const start = frameIdx * perFrame;
  const end = Math.min(start + perFrame, total);
  if (start >= total) return;

  const origin = getChestHudOrigin();
  for (let i = start; i < end; i++) {
    eruptBossChestDice(origin.x, origin.y, i, total);
    session.diceErupted += 1;
  }
}

function eruptCoinsForFrame(frame: number): void {
  if (!session) return;
  const { coinEruptFrameStart, coinEruptFrameEnd } = BOSS_CHEST_CONFIG;
  if (frame < coinEruptFrameStart || frame > coinEruptFrameEnd) return;

  const frameIdx = frame - coinEruptFrameStart;
  const frameCount = coinEruptFrameEnd - coinEruptFrameStart + 1;
  const chunks = session.coinChunks;
  if (chunks.length === 0) return;

  const perFrame = Math.ceil(chunks.length / frameCount);
  const start = frameIdx * perFrame;
  const end = Math.min(start + perFrame, chunks.length);
  if (start >= chunks.length) return;

  const origin = getChestHudOrigin();
  for (let i = start; i < end; i++) {
    const chunk = chunks[i] ?? 0;
    if (chunk <= 0) continue;
    eruptBossChestCoin(origin.x, origin.y, chunk, i, chunks.length);
    session.coinsErupted += 1;
  }
}

function applyChestFrame(frameIndex: number, row: number, scale: number): void {
  if (!chestEl || !actorEl) return;
  const { frameWidthPx, topRowHeightPx, stageAnchorOffsetY } = BOSS_CHEST_CONFIG.sprite;
  const w = frameWidthPx * scale;
  const h = topRowHeightPx * scale;
  const sheetW = BOSS_CHEST_CONFIG.sprite.sheetWidthPx * scale;
  const sheetH = BOSS_CHEST_CONFIG.sprite.sheetHeightPx * scale;

  chestEl.style.width = `${w}px`;
  chestEl.style.height = `${h}px`;
  chestEl.style.backgroundImage = `url("${CHEST_SPRITE_URL}")`;
  chestEl.style.backgroundSize = `${sheetW}px ${sheetH}px`;
  chestEl.style.backgroundPosition = `${-frameIndex * w}px ${-chestRowOffsetY(row) * scale}px`;
  chestEl.style.marginTop = '0';

  actorEl.style.width = `${w}px`;
  actorEl.style.height = `${h}px`;
  actorEl.style.marginTop = `${stageAnchorOffsetY * scale}px`;
}

function clearPanelVfxClasses(): void {
  panelEl?.classList.remove(
    'boss-chest-modal__panel--glow',
    'boss-chest-modal__panel--rays',
    'boss-chest-modal__panel--particles',
  );
}

function clearActorShakeClasses(): void {
  actorEl?.classList.remove(
    'boss-chest-modal__actor--shake-mild',
    'boss-chest-modal__actor--shake-strong',
  );
}

function setupVfx(tier: BossChestTier): void {
  if (!panelEl || !actorEl || !vfxEl || !flashEl) return;
  const def = getBossChestTierDef(tier);
  const { vfx } = def;

  clearPanelVfxClasses();
  clearActorShakeClasses();

  if (vfx.glow) panelEl.classList.add('boss-chest-modal__panel--glow');
  if (vfx.rays) panelEl.classList.add('boss-chest-modal__panel--rays');
  if (vfx.particles > 0) panelEl.classList.add('boss-chest-modal__panel--particles');
  if (vfx.shake === 'mild') actorEl.classList.add('boss-chest-modal__actor--shake-mild');
  if (vfx.shake === 'strong') actorEl.classList.add('boss-chest-modal__actor--shake-strong');

  flashEl.style.setProperty('--flash-strength', String(vfx.flashBoost));

  vfxEl.replaceChildren();
  const glow = document.createElement('div');
  glow.className = 'boss-chest-modal__glow';
  vfxEl.appendChild(glow);

  if (vfx.rays) {
    const rays = document.createElement('div');
    rays.className = 'boss-chest-modal__rays';
    vfxEl.appendChild(rays);
  }

  const particleSpread = vfx.shake === 'strong' ? 72 : 56;
  for (let i = 0; i < vfx.particles; i++) {
    const p = document.createElement('div');
    p.className = 'boss-chest-modal__particle';
    const ang = (i / vfx.particles) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 14 + Math.random() * particleSpread;
    p.style.setProperty('--px', `${Math.cos(ang) * dist}px`);
    p.style.setProperty('--py', `${Math.sin(ang) * dist * 0.75 - 8}px`);
    p.style.background = `hsl(${40 + Math.random() * 40}, 90%, ${55 + Math.random() * 20}%)`;
    p.style.animationDelay = `${Math.random() * 0.4}s`;
    vfxEl.appendChild(p);
  }
}

function playChestAnimation(tier: BossChestTier, myToken: number): void {
  const def = getBossChestTierDef(tier);
  const frameMs = 1000 / def.animFps;
  const { frameCount } = BOSS_CHEST_CONFIG.sprite;
  let frame = 0;

  applyChestFrame(0, def.spriteRow, def.displayScale);
  chestEl?.classList.remove('boss-chest-modal__chest--shake');

  const step = (): void => {
    if (!session || sessionToken !== myToken) return;

    if (frame === 1 && flashEl && def.vfx.flashBoost > 0) {
      flashEl.classList.remove('is-active');
      void flashEl.offsetWidth;
      flashEl.classList.add('is-active');
    }

    if (frame >= 2 && frame <= 10) {
      chestEl?.classList.add('boss-chest-modal__chest--shake');
    } else {
      chestEl?.classList.remove('boss-chest-modal__chest--shake');
    }

    applyChestFrame(frame, def.spriteRow, def.displayScale);

    if (frame >= BOSS_CHEST_CONFIG.coinEruptFrameStart) {
      if (session.rewardKind === 'gold') {
        eruptCoinsForFrame(frame);
      } else {
        eruptDiceForFrame(frame);
      }
    }

    if (frame < frameCount - 1) {
      frame += 1;
      schedule(frameMs, step);
    } else {
      clearPanelVfxClasses();
      clearActorShakeClasses();
      chestEl?.classList.remove('boss-chest-modal__chest--shake');
      revealReward(tier, session.rewardKind, session.amount, myToken);
    }
  };

  schedule(def.idleHoldMs, () => {
    if (!session || sessionToken !== myToken) return;
    step();
  });
}

function revealReward(
  tier: BossChestTier,
  rewardKind: BossChestRewardKind,
  amount: number,
  myToken: number,
): void {
  if (!tierLabelEl || !goldEl || !diceEl || !rewardEl || !closeBtn) return;

  const goldTextEl = goldEl;
  const diceTextEl = diceEl;
  const closeButton = closeBtn;
  const isGold = rewardKind === 'gold';

  tierLabelEl.textContent = localeManager.t(tierLocaleKey(tier));
  tierLabelEl.className = `boss-chest-modal__tier-label boss-chest-modal__tier-label--${tier}`;

  goldTextEl.hidden = !isGold;
  diceTextEl.hidden = isGold;
  goldTextEl.textContent = isGold ? `+0 ${localeManager.t('bossChest.currency')}` : '';
  diceTextEl.textContent = isGold ? '' : `+0 ${localeManager.t('bossChest.dice')}`;

  rewardEl.classList.add('is-visible');

  const startT = performance.now();
  const duration = BOSS_CHEST_CONFIG.rewardCountUpMs;
  const label = localeManager.t(isGold ? 'bossChest.currency' : 'bossChest.dice');
  const targetEl = isGold ? goldTextEl : diceTextEl;

  const tick = (now: number): void => {
    if (sessionToken !== myToken) return;
    const p = Math.min(1, (now - startT) / duration);
    const value = Math.round(amount * easeOutCubic(p));
    targetEl.textContent = `+${value} ${label}`;
    if (p < 1) {
      requestAnimationFrame(tick);
    } else {
      closeButton.classList.add('is-ready');
    }
  };
  requestAnimationFrame(tick);
}

function hideModal(): void {
  sessionToken += 1;
  clearSessionTimers();
  modalEl?.classList.add('hidden');
  clearPanelVfxClasses();
  clearActorShakeClasses();
  rewardEl?.classList.remove('is-visible');
  closeBtn?.classList.remove('is-ready');
  chestEl?.classList.remove('boss-chest-modal__chest--shake');
  session = null;
}

export function initBossChestModal(): void {
  modalEl = el('boss-chest-modal');
  panelEl = el('boss-chest-panel');
  actorEl = el('boss-chest-actor');
  chestEl = el('boss-chest-sprite');
  flashEl = el('boss-chest-flash');
  vfxEl = el('boss-chest-vfx');
  tierLabelEl = el('boss-chest-tier');
  goldEl = el('boss-chest-gold');
  diceEl = el('boss-chest-dice');
  rewardEl = el('boss-chest-reward');
  closeBtn = el<HTMLButtonElement>('boss-chest-close-btn');

  closeBtn?.addEventListener('click', () => {
    if (!session || !closeBtn?.classList.contains('is-ready')) return;
    const result: BossChestModalResult = {
      tier: session.tier,
      rewardKind: session.rewardKind,
      amount: session.amount,
    };
    const cb = session.params.onClose;
    hideModal();
    domUiBridge.setLayerInteractive(false);
    cb(result);
  });
}

export function showBossChestModal(params: BossChestModalParams): void {
  if (!modalEl || !panelEl || !chestEl) {
    const tier = rollBossChestTier();
    const reward = rollBossChestReward(tier);
    params.onClose({ tier, rewardKind: reward.kind, amount: reward.amount });
    return;
  }

  hideModal();
  sessionToken += 1;
  const myToken = sessionToken;

  const tier = rollBossChestTier();
  const reward = rollBossChestReward(tier);

  session = {
    params,
    tier,
    rewardKind: reward.kind,
    amount: reward.amount,
    coinChunks: reward.kind === 'gold' ? buildBossChestCoinChunks(reward.amount) : [],
    diceVisualCount:
      reward.kind === 'dice' ? buildBossChestDiceChunks(reward.amount).length : 0,
    coinsErupted: 0,
    diceErupted: 0,
    timers: [],
    animToken: myToken,
  };

  if (reward.kind === 'gold') {
    beginBossChestCoinLayer(session.coinChunks.length);
  } else {
    beginBossChestDiceLayer(session.diceVisualCount);
  }
  domUiBridge.setLayerInteractive(true);
  modalEl.classList.remove('hidden');

  if (tierLabelEl) tierLabelEl.textContent = '';
  if (goldEl) {
    goldEl.textContent = '';
    goldEl.hidden = true;
  }
  if (diceEl) {
    diceEl.textContent = '';
    diceEl.hidden = true;
  }
  rewardEl?.classList.remove('is-visible');
  closeBtn?.classList.remove('is-ready');

  setupVfx(tier);
  playChestAnimation(tier, myToken);
}

export function isBossChestModalOpen(): boolean {
  return Boolean(modalEl && !modalEl.classList.contains('hidden'));
}

export function forceHideBossChestModal(): void {
  hideModal();
}

export function refreshBossChestModalLocale(): void {
  if (!session || !tierLabelEl || !goldEl || !diceEl) return;
  tierLabelEl.textContent = localeManager.t(tierLocaleKey(session.tier));
  const label = localeManager.t(
    session.rewardKind === 'gold' ? 'bossChest.currency' : 'bossChest.dice',
  );
  goldEl.hidden = session.rewardKind !== 'gold';
  diceEl.hidden = session.rewardKind !== 'dice';
  if (session.rewardKind === 'gold') {
    goldEl.textContent = `+${session.amount} ${label}`;
  } else {
    diceEl.textContent = `+${session.amount} ${label}`;
  }
}
