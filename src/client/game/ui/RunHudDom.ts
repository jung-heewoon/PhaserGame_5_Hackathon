import { getEntryByWeapon } from '../config/WeaponTable.ts';
import { localeManager } from '../locale/LocaleManager.ts';
import type { GameRunSnapshot } from '../systems/GameRunState.ts';
import type { WeaponId } from '../config/WeaponTable.ts';
import { DICE_ASSETS } from '../assets/DiceAssets.ts';
import { GUN_ICON_URL } from '../assets/GunIconAssets.ts';
import { gunViewDom } from './GunViewDom.ts';
import { updateHeartHud, resetHeartHud } from './HeartHudDom.ts';

export interface StatusHudSnapshot {
  score: number;
  health: number;
  maxHealth: number;
}

let lastEquippedWeapon: WeaponId | null = null;
let lastStatusScore = -1;

/** 보유 주사위 HUD 아이콘(야찌 주사위 시트 5눈금 프레임) 배경 주입 — 최초 1회 */
export function initDiceHud(): void {
  const iconEl = document.getElementById('hud-dice-icon');
  if (iconEl) iconEl.style.backgroundImage = `url("${DICE_ASSETS.faceDragging}")`;
}

export function resetGunHudTracking(): void {
  lastEquippedWeapon = null;
  lastStatusScore = -1;
  resetHeartHud();
}

export function updateRunHud(snapshot: GameRunSnapshot): void {
  const diceEl = document.getElementById('hud-dice-count');
  const weaponEl = document.getElementById('hud-weapon-name');
  const ammoEl = document.getElementById('hud-ammo');

  if (diceEl) diceEl.textContent = String(snapshot.currentDiceCount);
  if (weaponEl) {
    weaponEl.textContent = localeManager.getWeaponLabel(snapshot.currentWeapon);
  }

  if (ammoEl) {
    ammoEl.textContent = snapshot.isInfiniteAmmo
      ? '∞'
      : `${snapshot.currentAmmo} / ${getEntryByWeapon(snapshot.currentWeapon).maxAmmo ?? 0}`;
  }

  if (snapshot.currentWeapon !== lastEquippedWeapon) {
    lastEquippedWeapon = snapshot.currentWeapon;
    const iconEl = document.getElementById('hud-weapon-icon');
    if (iconEl) {
      iconEl.style.backgroundImage = `url("${GUN_ICON_URL[snapshot.currentWeapon]}")`;
    }
    void gunViewDom.equipWeapon(snapshot.currentWeapon);
  }
}

export function updateStatusHud(snapshot: StatusHudSnapshot): void {
  if (snapshot.score !== lastStatusScore) {
    lastStatusScore = snapshot.score;
    const scoreEl = document.getElementById('hud-score');
    if (scoreEl) scoreEl.textContent = String(snapshot.score);
  }
  updateHeartHud(snapshot.health, snapshot.maxHealth);
}

export function pulseScoreHud(): void {
  const scoreEl = document.getElementById('hud-score');
  if (!scoreEl) return;
  scoreEl.classList.remove('doom-value--pulse');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('doom-value--pulse');
  window.setTimeout(() => scoreEl.classList.remove('doom-value--pulse'), 420);
}
