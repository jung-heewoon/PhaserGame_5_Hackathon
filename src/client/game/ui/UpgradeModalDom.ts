import coinUrl from '../Image/UI/coin4_16x16.png';
import { GUN_ICON_URL } from '../assets/GunIconAssets.ts';
import { HAND_WEAPON_TABLE, type WeaponId } from '../config/WeaponTable.ts';
import { localeManager } from '../locale/LocaleManager.ts';
import { upgradeStore } from '../systems/UpgradeStore.ts';
import { domUiBridge } from './DomUiBridge.ts';

interface RowRefs {
  root: HTMLElement;
  icon: HTMLElement;
  level: HTMLElement;
  name: HTMLElement;
  hand: HTMLElement;
  dmgLabel: HTMLElement;
  dmgValue: HTMLElement;
  mult: HTMLElement;
  cost: HTMLElement;
  btn: HTMLButtonElement;
}

let bound = false;
let built = false;
let onBack: (() => void) | null = null;
const rows = new Map<WeaponId, RowRefs>();

function fmtMult(value: number): string {
  return `x${value.toFixed(2)}`;
}

function buildRows(listEl: HTMLElement): void {
  if (built) return;
  listEl.replaceChildren();
  rows.clear();

  // 테이블은 상위 족보(핵미사일)부터라, 리스트는 역순으로 쌓아 핵미사일을 맨 아래로
  for (const entry of [...HAND_WEAPON_TABLE].reverse()) {
    const root = document.createElement('div');
    root.className = 'doom-up-row';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'doom-up-row__icon-wrap';
    const icon = document.createElement('span');
    icon.className = 'doom-up-row__icon';
    icon.style.backgroundImage = `url("${GUN_ICON_URL[entry.weaponId]}")`;
    const level = document.createElement('span');
    level.className = 'doom-up-row__level';
    iconWrap.append(icon, level);

    const info = document.createElement('div');
    info.className = 'doom-up-row__info';
    const nameLine = document.createElement('div');
    nameLine.className = 'doom-up-row__name';
    const name = document.createElement('span');
    const hand = document.createElement('span');
    hand.className = 'doom-up-row__hand';
    nameLine.append(name, hand);

    const dmgLine = document.createElement('div');
    dmgLine.className = 'doom-up-row__dmg';
    const dmgLabel = document.createElement('span');
    dmgLabel.className = 'doom-up-row__dmg-label';
    const dmgValue = document.createElement('span');
    dmgValue.className = 'doom-up-row__dmg-value';
    const mult = document.createElement('span');
    mult.className = 'doom-up-row__mult';
    dmgLine.append(dmgLabel, dmgValue, mult);

    info.append(nameLine, dmgLine);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'doom-up-row__btn';
    const btnCoin = document.createElement('span');
    btnCoin.className = 'doom-up-row__btn-coin';
    btnCoin.style.backgroundImage = `url("${coinUrl}")`;
    const cost = document.createElement('span');
    cost.className = 'doom-up-row__cost';
    btn.append(btnCoin, cost);
    btn.addEventListener('click', () => onUpgradeClick(entry.weaponId));

    root.append(iconWrap, info, btn);
    listEl.appendChild(root);

    rows.set(entry.weaponId, {
      root,
      icon,
      level,
      name,
      hand,
      dmgLabel,
      dmgValue,
      mult,
      cost,
      btn,
    });
  }

  built = true;
}

function renderRow(weaponId: WeaponId): void {
  const refs = rows.get(weaponId);
  if (!refs) return;
  const entry = HAND_WEAPON_TABLE.find((e) => e.weaponId === weaponId);
  if (!entry) return;

  const level = upgradeStore.getLevel(weaponId);
  refs.level.textContent = `+${level}`;
  refs.level.classList.toggle('is-hidden', level <= 0);

  refs.name.textContent = localeManager.getWeaponLabel(weaponId);
  refs.hand.textContent = `(${localeManager.getHandLabel(entry.handId)})`;

  refs.dmgLabel.textContent = localeManager.t('upgrade.damage');
  refs.dmgValue.textContent = String(upgradeStore.getEffectiveDamage(entry.damage, weaponId));
  refs.mult.textContent = fmtMult(upgradeStore.getMultiplier(weaponId));

  refs.cost.textContent = String(upgradeStore.getUpgradeCost(weaponId));
  const affordable = upgradeStore.canUpgrade(weaponId);
  refs.btn.classList.toggle('doom-up-row__btn--locked', !affordable);
  refs.btn.title = localeManager.t('upgrade.button');
}

function renderWallet(): void {
  const countEl = document.getElementById('upgrade-wallet-count');
  if (countEl) countEl.textContent = String(upgradeStore.getCoins());
}

function renderAll(): void {
  renderWallet();
  for (const entry of HAND_WEAPON_TABLE) renderRow(entry.weaponId);
}

function onUpgradeClick(weaponId: WeaponId): void {
  if (!upgradeStore.canUpgrade(weaponId)) {
    domUiBridge.showToast(localeManager.t('upgrade.insufficient'));
    return;
  }
  if (!upgradeStore.upgrade(weaponId)) return;

  const refs = rows.get(weaponId);
  if (refs) {
    refs.level.classList.remove('doom-up-row__level--pulse');
    void refs.level.offsetWidth;
    refs.level.classList.add('doom-up-row__level--pulse');
  }
}

/** 리스트 영역을 위/아래로 드래그(마우스·펜)해서 스크롤. 터치는 pan-y 네이티브 스크롤. */
function enableDragScroll(list: HTMLElement): void {
  const THRESHOLD = 6;
  let pointerId: number | null = null;
  let startY = 0;
  let startScroll = 0;
  let dragging = false;
  let moved = false;

  list.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return; // 터치는 네이티브 스크롤에 위임
    if (e.button !== 0) return;
    pointerId = e.pointerId;
    startY = e.clientY;
    startScroll = list.scrollTop;
    dragging = false;
    moved = false;
  });

  list.addEventListener('pointermove', (e) => {
    if (pointerId === null || e.pointerId !== pointerId) return;
    const dy = e.clientY - startY;
    if (!dragging) {
      if (Math.abs(dy) < THRESHOLD) return;
      dragging = true;
      list.classList.add('is-dragging');
      try {
        list.setPointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    }
    moved = true;
    list.scrollTop = startScroll - dy;
    e.preventDefault();
  });

  const end = (e: PointerEvent): void => {
    if (pointerId === null || e.pointerId !== pointerId) return;
    if (dragging) {
      try {
        list.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
      list.classList.remove('is-dragging');
    }
    pointerId = null;
    dragging = false;
  };
  list.addEventListener('pointerup', end);
  list.addEventListener('pointercancel', end);

  // 드래그 직후 발생하는 클릭(강화 오작동) 차단
  list.addEventListener(
    'click',
    (e) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    },
    true,
  );
}

function closeModal(): void {
  const modal = document.getElementById('upgrade-modal');
  modal?.classList.add('hidden');
  const back = onBack;
  onBack = null;
  back?.();
}

/** 앱 시작 시 1회 — 닫기 버튼/로케일 리스너 바인딩, 지갑 아이콘 세팅 */
export function initUpgradeModal(): void {
  const walletIcon = document.getElementById('upgrade-wallet-icon');
  if (walletIcon && !walletIcon.style.backgroundImage) {
    walletIcon.style.backgroundImage = `url("${coinUrl}")`;
  }

  if (bound) return;
  const closeBtn = document.getElementById('upgrade-close-btn');
  const modal = document.getElementById('upgrade-modal');
  if (!closeBtn || !modal) return;
  bound = true;

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  const listEl = document.getElementById('upgrade-list');
  if (listEl) enableDragScroll(listEl);

  localeManager.onChange(() => {
    if (!modal.classList.contains('hidden')) renderAll();
  });

  upgradeStore.onChange(() => {
    if (!modal.classList.contains('hidden')) renderAll();
  });
}

/** 강화 팝업 열기. onClose 는 닫힐 때 호출(예: 게임오버 화면 복귀). */
export function showUpgradeModal(onClose: () => void): void {
  const modal = document.getElementById('upgrade-modal');
  const listEl = document.getElementById('upgrade-list');
  if (!modal || !listEl) {
    onClose();
    return;
  }

  onBack = onClose;
  buildRows(listEl);
  renderAll();
  modal.classList.remove('hidden');
  domUiBridge.setLayerInteractive(true);
}
