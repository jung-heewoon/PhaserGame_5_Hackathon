import type { WeaponId } from '../config/WeaponTable.ts';

import nuclearIcon from '../Image/UI/GunIcon/Icon_NuclearLauncher.png';
import railIcon from '../Image/UI/GunIcon/Icon_RailGun.png';
import beamIcon from '../Image/UI/GunIcon/Icon_BeamGun.png';
import missileIcon from '../Image/UI/GunIcon/Icon_MissileLauncher.png';
import minigunIcon from '../Image/UI/GunIcon/Icon_Minigun.png';
import shotgunIcon from '../Image/UI/GunIcon/Icon_ShotGun.png';
import dualPistolIcon from '../Image/UI/GunIcon/Icon_DualPistol.png';
import revolverIcon from '../Image/UI/GunIcon/Icon_Revolver.png';
import pistolIcon from '../Image/UI/GunIcon/Icon_Pistol.png';

/** 무기 → 아이콘 URL. 원본 크기가 제각각이라 표시는 고정 박스 + contain으로 통일. */
export const GUN_ICON_URL: Record<WeaponId, string> = {
  NUCLEAR_LAUNCHER: nuclearIcon,
  RAILGUN: railIcon,
  BEAM_GUN: beamIcon,
  MISSILE_LAUNCHER: missileIcon,
  MINIGUN: minigunIcon,
  SHOTGUN: shotgunIcon,
  DUAL_PISTOL: dualPistolIcon,
  REVOLVER: revolverIcon,
  DEFAULT_PISTOL: pistolIcon,
};
