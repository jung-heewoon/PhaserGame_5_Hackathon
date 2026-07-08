import gunFireSheetUrl from '../Image/Effect/Gun_Fire.png?url';
import type { WeaponId } from '../config/WeaponTable.ts';

/** Gun_Fire.png — 4900×100, 가로 49프레임 × 100px */
export const GUN_FIRE_SHEET_URL = gunFireSheetUrl;
export const GUN_FIRE_FRAME_PX = 100;
export const GUN_FIRE_FRAME_COUNT = 49;
export const GUN_FIRE_SHEET_WIDTH = GUN_FIRE_FRAME_PX * GUN_FIRE_FRAME_COUNT;

const MUZZLE_FLASH_WEAPONS = new Set<WeaponId>([
  'DEFAULT_PISTOL',
  'REVOLVER',
  'DUAL_PISTOL',
  'SHOTGUN',
  'MINIGUN',
  'MISSILE_LAUNCHER',
]);

export function hasGunMuzzleFlash(weaponId: WeaponId): boolean {
  return MUZZLE_FLASH_WEAPONS.has(weaponId);
}

/** Vite 번들 URL — CrazyGames에서도 단일 요청으로 로드 */
export function preloadGunFireSheet(): void {
  const img = new Image();
  img.src = GUN_FIRE_SHEET_URL;
}
