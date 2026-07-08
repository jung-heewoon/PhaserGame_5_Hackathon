import { DICE_ASSETS } from '../assets/DiceAssets.ts';
import { GUN_ICON_URL } from '../assets/GunIconAssets.ts';
import heartPickupUrl from '../Image/UI/Heart/heart.png';
import bulletPickupUrl from '../Image/Object/bullet.png';
import { DICE_SPRITE_CONFIG as DSC } from '../config/DiceSpriteConfig.ts';
import { HAND_WEAPON_TABLE } from '../config/WeaponTable.ts';
import { TUTORIAL_CONFIG } from '../config/TutorialConfig.ts';
import { localeManager } from '../locale/LocaleManager.ts';
import type { RunSession } from '../systems/RunSession.ts';
import { tutorialStore } from '../systems/TutorialStore.ts';
import { domUiBridge } from './DomUiBridge.ts';
import { isGameOverModalOpen } from './GameOverModalDom.ts';
import { mobileControls } from './MobileControlsDom.ts';

type TutorialMode = 'intro-first' | 'intro-replay' | 'yatzy-first' | 'yatzy-replay';
type TutorialPageId = 'controls' | 'items' | 'yatzy-flow' | 'yatzy-hands';

interface ActiveSession {
  mode: TutorialMode;
  pageIds: TutorialPageId[];
  pageIndex: number;
  tapReady: boolean;
  tapHintTimer: ReturnType<typeof setTimeout> | null;
  /** 튜토리얼 닫힘 등 후속 처리 */
  onComplete: (() => void) | null;
  /** 최초 인터랙티브 시점(모달 표시 직후) — SDK load/gameplay 시작용 */
  onReady: (() => void) | null;
  frozeForTutorial: boolean;
}

let runSession: RunSession | null = null;
let active: ActiveSession | null = null;
let listenersBound = false;

const TAP_DRAG_THRESHOLD_PX = 12;
let tapTrackPointerId: number | null = null;
let tapStartX = 0;
let tapStartY = 0;
let tapDragged = false;

let scrollDragPointerId: number | null = null;
let scrollDragStartY = 0;
let scrollDragStartScrollTop = 0;
let scrollDragging = false;

const DICE_S = DSC.displayScale;
const DICE_FACE_W = DSC.faceNormal.frameW * DICE_S;
const DICE_FACE_H = DSC.faceNormal.frameH * DICE_S;
const DICE_SHEET_W = DSC.faceNormal.frameW * DSC.faceFrameCount * DICE_S;

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function pageIdsForMode(mode: TutorialMode): TutorialPageId[] {
  if (mode === 'intro-first' || mode === 'intro-replay') {
    return ['controls', 'items'];
  }
  return ['yatzy-flow', 'yatzy-hands'];
}

function currentPageId(session: ActiveSession): TutorialPageId {
  return session.pageIds[session.pageIndex] ?? session.pageIds[0]!;
}

function clearTapHintTimer(): void {
  if (!active?.tapHintTimer) return;
  clearTimeout(active.tapHintTimer);
  active.tapHintTimer = null;
}

function hideTapHint(): void {
  el('tutorial-tap-hint')?.classList.remove('is-visible');
}

function showTapHint(): void {
  if (!active) return;
  const hint = el('tutorial-tap-hint');
  if (!hint) return;
  hint.textContent = mobileControls.enabled
    ? localeManager.t('tutorial.tap_anywhere_mobile')
    : localeManager.t('tutorial.tap_anywhere');
  hint.classList.add('is-visible');
  active.tapReady = true;
}

function scheduleTapHint(): void {
  if (!active) return;
  clearTapHintTimer();
  hideTapHint();
  active.tapReady = false;
  active.tapHintTimer = setTimeout(() => {
    if (active) showTapHint();
  }, TUTORIAL_CONFIG.tapHintDelayMs);
}

function isFirstRunMode(mode: TutorialMode): boolean {
  return mode === 'intro-first' || mode === 'yatzy-first';
}

function applyDiceFaceStyle(node: HTMLElement, pip: number): void {
  node.style.width = `${DICE_FACE_W}px`;
  node.style.height = `${DICE_FACE_H}px`;
  node.style.backgroundImage = `url(${DICE_ASSETS.faceNormal})`;
  node.style.backgroundSize = `${DICE_SHEET_W}px ${DICE_FACE_H}px`;
  node.style.backgroundPosition = `${-pip * DICE_FACE_W}px 0`;
}

function buildHandsGrid(): void {
  const grid = el('tutorial-yatzy-hands-grid');
  if (!grid) return;

  grid.replaceChildren();
  HAND_WEAPON_TABLE.forEach((entry, index) => {
    const card = document.createElement('article');
    card.className = 'tutorial-hand-card';

    const rank = document.createElement('span');
    rank.className = 'tutorial-hand-card__rank';
    rank.textContent = String(index + 1);

    const body = document.createElement('div');
    body.className = 'tutorial-hand-card__body';

    const head = document.createElement('div');
    head.className = 'tutorial-hand-card__head';

    const handName = document.createElement('p');
    handName.className = 'tutorial-hand-card__hand';
    handName.textContent = localeManager.t(`hand.${entry.handId}`);

    const arrow = document.createElement('span');
    arrow.className = 'tutorial-hand-card__arrow';
    arrow.textContent = '→';

    const weaponWrap = document.createElement('div');
    weaponWrap.className = 'tutorial-hand-card__weapon';

    const icon = document.createElement('img');
    icon.className = 'tutorial-hand-card__icon';
    icon.src = GUN_ICON_URL[entry.weaponId];
    icon.alt = '';

    const weaponName = document.createElement('span');
    weaponName.className = 'tutorial-hand-card__weapon-name';
    weaponName.textContent = localeManager.t(`weapon.${entry.weaponId}`);

    weaponWrap.append(icon, weaponName);
    head.append(handName, arrow, weaponWrap);

    const desc = document.createElement('p');
    desc.className = 'tutorial-hand-card__desc';
    desc.textContent = localeManager.t(`tutorial.hand_desc.${entry.handId}`);

    const summary = document.createElement('p');
    summary.className = 'tutorial-hand-card__summary';
    summary.textContent = localeManager.t(`weapon.summary.${entry.weaponId}`);

    body.append(head, desc, summary);
    card.append(rank, body);
    grid.appendChild(card);
  });
}

function setupStaticAssets(): void {
  const pistolIcon = el<HTMLImageElement>('tutorial-pistol-icon');
  if (pistolIcon) pistolIcon.src = GUN_ICON_URL.DEFAULT_PISTOL;

  const heartIcon = el<HTMLImageElement>('tutorial-heart-icon');
  if (heartIcon) heartIcon.src = heartPickupUrl;

  const bulletIcon = el<HTMLImageElement>('tutorial-bullet-icon');
  if (bulletIcon) bulletIcon.src = bulletPickupUrl;

  const mobileFireIcon = el<HTMLImageElement>('tutorial-mobile-fire-icon');
  if (mobileFireIcon) mobileFireIcon.src = bulletPickupUrl;

  const dicePickup = el('tutorial-dice-pickup-icon');
  if (dicePickup) applyDiceFaceStyle(dicePickup, DSC.pickupFaceFrame);

  const yatzyDiceRow = el('tutorial-yatzy-dice-row');
  if (yatzyDiceRow) {
    yatzyDiceRow.replaceChildren();
    const pips = [1, 3, 3, 5, 6];
    for (const pip of pips) {
      const die = document.createElement('div');
      die.className = 'tutorial-yatzy-die';
      applyDiceFaceStyle(die, pip);
      yatzyDiceRow.appendChild(die);
    }
  }

  buildHandsGrid();
}

function isYatzyTutorialPage(pageId: TutorialPageId): boolean {
  return pageId === 'yatzy-flow' || pageId === 'yatzy-hands';
}

function syncBodyScrollMode(pageId: TutorialPageId): void {
  const body = getTutorialBody();
  if (!body) return;
  resetScrollDrag();
  // 첫 실행(탭으로 넘기기): 스크롤 비활성 — Tip 재열람만 스크롤 허용
  const scrollable =
    isYatzyTutorialPage(pageId) && active !== null && !isFirstRunMode(active.mode);
  body.classList.toggle('tutorial-panel__body--scrollable', scrollable);
  body.scrollTop = 0;
}

function titleForPage(pageId: TutorialPageId): string {
  switch (pageId) {
    case 'controls':
      return localeManager.t('tutorial.controls.title');
    case 'items':
      return localeManager.t('tutorial.items.title');
    case 'yatzy-flow':
      return localeManager.t('tutorial.yatzy.title');
    case 'yatzy-hands':
      return localeManager.t('tutorial.yatzy.hands.title');
  }
}

function setPageVisible(pageId: TutorialPageId): void {
  const isMobile = mobileControls.enabled;

  el('tutorial-page-controls-pc')?.classList.toggle(
    'is-active',
    pageId === 'controls' && !isMobile,
  );
  el('tutorial-page-controls-mobile')?.classList.toggle(
    'is-active',
    pageId === 'controls' && isMobile,
  );
  el('tutorial-page-items')?.classList.toggle('is-active', pageId === 'items');
  el('tutorial-page-yatzy')?.classList.toggle('is-active', pageId === 'yatzy-flow');
  el('tutorial-page-yatzy-hands')?.classList.toggle('is-active', pageId === 'yatzy-hands');

  const title = el('tutorial-title');
  if (title) title.textContent = titleForPage(pageId);

  syncBodyScrollMode(pageId);
}

function updateNav(): void {
  if (!active) return;
  const nav = el('tutorial-nav');
  if (!nav) return;

  const isReplay = !isFirstRunMode(active.mode);
  nav.classList.toggle('hidden', !isReplay);

  if (!isReplay) return;

  const pageIndicator = el('tutorial-page-indicator');
  const prevBtn = el<HTMLButtonElement>('tutorial-prev-btn');
  const nextBtn = el<HTMLButtonElement>('tutorial-next-btn');
  const total = active.pageIds.length;
  const current = active.pageIndex + 1;

  if (pageIndicator) {
    pageIndicator.textContent = localeManager.t('tutorial.nav.page', {
      current: String(current),
      total: String(total),
    });
  }
  if (prevBtn) prevBtn.disabled = active.pageIndex <= 0;
  if (nextBtn) nextBtn.disabled = active.pageIndex >= total - 1;
}

function openModal(session: ActiveSession): void {
  active = session;
  const modal = el('tutorial-modal');
  if (!modal) return;

  setupStaticAssets();
  setPageVisible(currentPageId(session));
  updateNav();

  const tapHint = el('tutorial-tap-hint');
  tapHint?.classList.toggle('hidden', !isFirstRunMode(session.mode));

  if (isFirstRunMode(session.mode)) {
    scheduleTapHint();
  } else {
    hideTapHint();
    session.tapReady = false;
  }

  domUiBridge.setLayerInteractive(true);
  modal.classList.remove('hidden');
  updateYatzyTipVisibility();

  session.onReady?.();
  session.onReady = null;
}

function closeModal(): void {
  clearTapHintTimer();
  hideTapHint();
  el('tutorial-modal')?.classList.add('hidden');

  if (active?.frozeForTutorial && runSession?.freezeReason === 'tutorial') {
    runSession.unfreeze();
  }

  if (!isGameOverModalOpen() && !isTutorialBlockingOtherModals()) {
    domUiBridge.setLayerInteractive(false);
  } else {
    domUiBridge.setLayerInteractive(true);
  }

  active = null;
  updateYatzyTipVisibility();
}

function isTutorialBlockingOtherModals(): boolean {
  const yatzy = document.getElementById('yatzy-modal');
  const settings = document.getElementById('settings-modal');
  const bossChest = document.getElementById('boss-chest-modal');
  const upgrade = document.getElementById('upgrade-modal');
  return Boolean(
    (yatzy && !yatzy.classList.contains('hidden')) ||
      (settings && !settings.classList.contains('hidden')) ||
      (bossChest && !bossChest.classList.contains('hidden')) ||
      (upgrade && !upgrade.classList.contains('hidden')) ||
      isGameOverModalOpen(),
  );
}

function finishIntroFirst(): void {
  if (!active) return;
  tutorialStore.markIntroSeen();
  const onComplete = active.onComplete;
  closeModal();
  onComplete?.();
}

function finishYatzyFirst(): void {
  if (!active) return;
  tutorialStore.markYatzySeen();
  const onComplete = active.onComplete;
  closeModal();
  onComplete?.();
}

function onOverlayTap(): void {
  if (!active || !isFirstRunMode(active.mode) || !active.tapReady) return;

  if (active.mode === 'intro-first') {
    if (active.pageIndex < active.pageIds.length - 1) {
      active.pageIndex += 1;
      setPageVisible(currentPageId(active));
      scheduleTapHint();
      return;
    }
    finishIntroFirst();
    return;
  }

  if (active.mode === 'yatzy-first') {
    if (active.pageIndex < active.pageIds.length - 1) {
      active.pageIndex += 1;
      setPageVisible(currentPageId(active));
      scheduleTapHint();
      return;
    }
    finishYatzyFirst();
  }
}

function resetTapTrack(): void {
  tapTrackPointerId = null;
  tapDragged = false;
}

function getTutorialBody(): HTMLElement | null {
  return el('tutorial-panel')?.querySelector('.tutorial-panel__body') as HTMLElement | null;
}

function resetScrollDrag(): void {
  const body = getTutorialBody();
  if (body && scrollDragPointerId !== null && body.hasPointerCapture(scrollDragPointerId)) {
    body.releasePointerCapture(scrollDragPointerId);
  }
  body?.classList.remove('tutorial-panel__body--dragging');
  scrollDragPointerId = null;
  scrollDragging = false;
}

function isTutorialBodyScrollable(): boolean {
  return getTutorialBody()?.classList.contains('tutorial-panel__body--scrollable') ?? false;
}

function bindTutorialScrollAndTap(modal: HTMLElement): void {
  const body = getTutorialBody();

  body?.addEventListener(
    'wheel',
    (event) => {
      if (!isTutorialBodyScrollable()) return;
      event.stopPropagation();
    },
    { passive: true },
  );

  body?.addEventListener('pointerdown', (event) => {
    if (!isTutorialBodyScrollable() || event.pointerType !== 'mouse' || event.button !== 0) return;

    scrollDragPointerId = event.pointerId;
    scrollDragStartY = event.clientY;
    scrollDragStartScrollTop = body!.scrollTop;
    scrollDragging = false;
    body!.setPointerCapture(event.pointerId);
  });

  body?.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerId !== scrollDragPointerId || event.pointerType !== 'mouse') return;
      if (!isTutorialBodyScrollable()) return;

      const dy = event.clientY - scrollDragStartY;
      if (!scrollDragging && Math.abs(dy) > TAP_DRAG_THRESHOLD_PX) {
        scrollDragging = true;
        body!.classList.add('tutorial-panel__body--dragging');
        tapDragged = true;
      }
      if (!scrollDragging) return;

      body!.scrollTop = scrollDragStartScrollTop - dy;
      event.preventDefault();
    },
    { passive: false },
  );

  const onScrollDragEnd = (event: PointerEvent): void => {
    if (event.pointerId !== scrollDragPointerId) return;
    resetScrollDrag();
  };

  body?.addEventListener('pointerup', onScrollDragEnd);
  body?.addEventListener('pointercancel', onScrollDragEnd);

  modal.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    tapTrackPointerId = event.pointerId;
    tapStartX = event.clientX;
    tapStartY = event.clientY;
    tapDragged = false;
  });

  modal.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerId !== tapTrackPointerId || !isTutorialBodyScrollable()) return;
      const dx = event.clientX - tapStartX;
      const dy = event.clientY - tapStartY;
      if (dx * dx + dy * dy > TAP_DRAG_THRESHOLD_PX * TAP_DRAG_THRESHOLD_PX) {
        tapDragged = true;
      }
    },
    { passive: true },
  );

  const onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== tapTrackPointerId) return;
    if (!active || !isFirstRunMode(active.mode) || !active.tapReady) {
      resetTapTrack();
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      resetTapTrack();
      return;
    }
    if (tapDragged && isTutorialBodyScrollable()) {
      resetTapTrack();
      return;
    }
    resetTapTrack();
    onOverlayTap();
  };

  modal.addEventListener('pointerup', onPointerEnd);
  modal.addEventListener('pointercancel', resetTapTrack);
}

function bindListeners(): void {
  if (listenersBound) return;
  listenersBound = true;

  const modal = el('tutorial-modal');
  const settingsTipBtn = el('settings-tutorial-tip-btn');
  const yatzyTipBtn = el('yatzy-tutorial-tip-btn');
  const prevBtn = el('tutorial-prev-btn');
  const nextBtn = el('tutorial-next-btn');
  const closeBtn = el('tutorial-close-btn');

  if (!modal) return;

  bindTutorialScrollAndTap(modal);

  settingsTipBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isTutorialModalOpen()) return;
    openTutorialReplay('intro', 1);
  });

  yatzyTipBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isTutorialModalOpen()) return;
    openTutorialReplay('yatzy', 1);
  });

  prevBtn?.addEventListener('click', () => {
    if (!active || active.pageIndex <= 0) return;
    active.pageIndex -= 1;
    setPageVisible(currentPageId(active));
    updateNav();
  });

  nextBtn?.addEventListener('click', () => {
    if (!active || active.pageIndex >= active.pageIds.length - 1) return;
    active.pageIndex += 1;
    setPageVisible(currentPageId(active));
    updateNav();
  });

  closeBtn?.addEventListener('click', () => {
    if (!active || isFirstRunMode(active.mode)) return;
    closeModal();
  });
}

export function initTutorialModal(session: RunSession): void {
  runSession = session;
  setupStaticAssets();
  bindListeners();
}

export function tryStartIntroTutorial(onReady: () => void): void {
  if (tutorialStore.isIntroSeen()) {
    onReady();
    return;
  }

  runSession?.freeze('tutorial');

  openModal({
    mode: 'intro-first',
    pageIds: pageIdsForMode('intro-first'),
    pageIndex: 0,
    tapReady: false,
    tapHintTimer: null,
    onComplete: null,
    onReady,
    frozeForTutorial: true,
  });
}

export function showYatzyTutorial(params: { onComplete: () => void }): void {
  openModal({
    mode: 'yatzy-first',
    pageIds: pageIdsForMode('yatzy-replay'),
    pageIndex: 0,
    tapReady: false,
    tapHintTimer: null,
    onComplete: params.onComplete,
    onReady: null,
    frozeForTutorial: false,
  });
}

export function openTutorialReplay(mode: 'intro' | 'yatzy', startPage: 1 | 2 = 1): void {
  if (isTutorialModalOpen()) return;

  const tutorialMode = mode === 'intro' ? 'intro-replay' : 'yatzy-replay';
  const pageIds = pageIdsForMode(tutorialMode);

  openModal({
    mode: tutorialMode,
    pageIds,
    pageIndex: Math.max(0, Math.min(pageIds.length - 1, startPage - 1)),
    tapReady: false,
    tapHintTimer: null,
    onComplete: null,
    onReady: null,
    frozeForTutorial: false,
  });
}

export function forceHideTutorialModal(): void {
  if (!active) return;
  active.onComplete = null;
  closeModal();
}

export function isTutorialModalOpen(): boolean {
  const modal = el('tutorial-modal');
  return Boolean(modal && !modal.classList.contains('hidden'));
}

export function refreshTutorialLocale(): void {
  setupStaticAssets();
  if (active) {
    setPageVisible(currentPageId(active));
    updateNav();
    if (active.tapReady) showTapHint();
  }
}

export function updateYatzyTipVisibility(): void {
  const btn = el('yatzy-tutorial-tip-btn');
  const yatzyModal = el('yatzy-modal');
  if (!btn || !yatzyModal) return;
  const yatzyOpen = !yatzyModal.classList.contains('hidden');
  btn.classList.toggle('hidden', !yatzyOpen || isTutorialModalOpen());
}
