import type { WeaponId } from '../config/WeaponTable.ts';
import { publicUrl } from '../config/PublicUrl.ts';

const gun = (file: string): string => publicUrl(`media/guns/${file}`);

export const GUN_IMAGE_URLS = {
  pistol: gun('Pistol.png'),
  revolver: gun('Revolver.png'),
  dualPistolL: gun('Dual Pistol_L.png'),
  dualPistolR: gun('Dual Pistol_R.png'),
  shotgun: gun('ShotGun.png'),
  minigun: gun('Minigun.png'),
  missileLauncher: gun('MissileLauncher.png'),
  beamGun: gun('BeamGun.png'),
  railGun: gun('RailGun.png'),
  nuclearIdle: gun('NuclearLauncher.png'),
  nuclearHand: gun('NuclearLauncher_hand.png'),
  nuclearMissile: gun('NuclearLauncher_Missial.png'),
} as const;

const SINGLE_WEAPON_URL: Record<WeaponId, string> = {
  DEFAULT_PISTOL: GUN_IMAGE_URLS.pistol,
  REVOLVER: GUN_IMAGE_URLS.revolver,
  DUAL_PISTOL: '',
  SHOTGUN: GUN_IMAGE_URLS.shotgun,
  MINIGUN: GUN_IMAGE_URLS.minigun,
  MISSILE_LAUNCHER: GUN_IMAGE_URLS.missileLauncher,
  BEAM_GUN: GUN_IMAGE_URLS.beamGun,
  RAILGUN: GUN_IMAGE_URLS.railGun,
  NUCLEAR_LAUNCHER: GUN_IMAGE_URLS.nuclearIdle,
};

export function getGunImageUrl(weaponId: WeaponId): string {
  return SINGLE_WEAPON_URL[weaponId];
}

export function isDualPistol(weaponId: WeaponId): boolean {
  return weaponId === 'DUAL_PISTOL';
}

export function isNuclearLauncher(weaponId: WeaponId): boolean {
  return weaponId === 'NUCLEAR_LAUNCHER';
}
