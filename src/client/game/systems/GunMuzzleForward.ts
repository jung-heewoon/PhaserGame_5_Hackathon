import type { WeaponFireProfile } from '../config/WeaponFireConfig.ts';
import { GUN_VIEW_CONFIG } from '../config/GunViewConfig.ts';

export function gunMuzzleForwardPx(profile: WeaponFireProfile): number {
  if (profile.muzzleForwardPx != null) return profile.muzzleForwardPx;
  switch (profile.delivery) {
    case 'projectile_dual':
      return GUN_VIEW_CONFIG.muzzleWorldForwardPxDual;
    case 'projectile_multi':
      return GUN_VIEW_CONFIG.muzzleWorldForwardPxMinigun;
    case 'instant_beam':
      return GUN_VIEW_CONFIG.muzzleWorldForwardPxBeam;
    case 'instant_rail':
      return GUN_VIEW_CONFIG.muzzleWorldForwardPxRail;
    default:
      return GUN_VIEW_CONFIG.muzzleWorldForwardPx;
  }
}
