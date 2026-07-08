import { RUN_GAME_CONFIG } from './RunGameConfig.ts';
import type { WeaponId } from './WeaponTable.ts';

export type FireDelivery =
  | 'projectile'
  | 'projectile_dual'
  | 'projectile_multi'
  | 'projectile_spread'
  | 'projectile_scatter'
  | 'projectile_aoe'
  | 'projectile_homing'
  | 'instant_beam'
  | 'instant_rail'
  | 'instant_field';

export type ProjectileVariant = 'pistol' | 'revolver' | 'shotgun' | 'minigun' | 'missile';

export interface WeaponFireProfile {
  delivery: FireDelivery;
  speed?: number;
  variant?: ProjectileVariant;
  pelletCount?: number;
  spreadRad?: number;
  dualOffsetX?: number;
  spawnJitterPx?: number;
  angleJitterRad?: number;
  /** 고정 총구 오프셋 (플레이어 중심 기준, aim 정렬: x=우측, y=전방에 더함) */
  muzzleOffsets?: readonly { x: number; y: number }[];
  /** aim 전방 총구 오프셋(px) — 미지정 시 GunViewConfig 기본값 */
  muzzleForwardPx?: number;
  aoeRadius?: number;
  beamWidth?: number;
  beamRange?: number;
  railHalfWidth?: number;
  railRange?: number;
}

export const WEAPON_FIRE_PROFILES: Record<WeaponId, WeaponFireProfile> = {
  DEFAULT_PISTOL: {
    delivery: 'projectile',
    speed: RUN_GAME_CONFIG.projectileSpeedPistol,
    variant: 'pistol',
  },
  REVOLVER: {
    delivery: 'projectile',
    speed: RUN_GAME_CONFIG.projectileSpeedRevolver,
    variant: 'revolver',
  },
  DUAL_PISTOL: {
    delivery: 'projectile_dual',
    speed: RUN_GAME_CONFIG.projectileSpeedDual,
    variant: 'pistol',
    dualOffsetX: RUN_GAME_CONFIG.dualPistolOffsetX,
  },
  SHOTGUN: {
    delivery: 'projectile_spread',
    speed: RUN_GAME_CONFIG.projectileSpeedShotgun,
    variant: 'shotgun',
    pelletCount: RUN_GAME_CONFIG.shotgunPelletCount,
    spreadRad: RUN_GAME_CONFIG.shotgunSpreadRad,
  },
  MINIGUN: {
    delivery: 'projectile_multi',
    speed: RUN_GAME_CONFIG.projectileSpeedMinigun,
    variant: 'minigun',
    muzzleOffsets: RUN_GAME_CONFIG.minigunMuzzleOffsets,
    spawnJitterPx: RUN_GAME_CONFIG.minigunSpawnJitterPx,
    angleJitterRad: RUN_GAME_CONFIG.minigunAngleJitterRad,
  },
  MISSILE_LAUNCHER: {
    delivery: 'projectile_homing',
    variant: 'missile',
    aoeRadius: RUN_GAME_CONFIG.missileAoeRadius,
  },
  BEAM_GUN: {
    delivery: 'instant_beam',
    beamWidth: RUN_GAME_CONFIG.beamWidth,
    beamRange: RUN_GAME_CONFIG.hitScanRange,
  },
  RAILGUN: {
    delivery: 'instant_rail',
    railHalfWidth: RUN_GAME_CONFIG.railHalfWidth,
    railRange: RUN_GAME_CONFIG.hitScanRange,
  },
  NUCLEAR_LAUNCHER: {
    delivery: 'instant_field',
  },
};

export function getFireProfile(weaponId: WeaponId): WeaponFireProfile {
  return WEAPON_FIRE_PROFILES[weaponId];
}
