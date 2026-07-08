export type HandId =
  | 'YATZY'
  | 'LARGE_STRAIGHT'
  | 'SMALL_STRAIGHT'
  | 'FULL_HOUSE'
  | 'FOUR_OF_A_KIND'
  | 'THREE_OF_A_KIND'
  | 'TWO_PAIR'
  | 'ONE_PAIR'
  | 'NONE';

export type WeaponId =
  | 'NUCLEAR_LAUNCHER'
  | 'RAILGUN'
  | 'BEAM_GUN'
  | 'MISSILE_LAUNCHER'
  | 'MINIGUN'
  | 'SHOTGUN'
  | 'DUAL_PISTOL'
  | 'REVOLVER'
  | 'DEFAULT_PISTOL';

export interface HandWeaponEntry {
  handId: HandId;
  weaponId: WeaponId;
  maxAmmo: number | null;
  fireRateMs: number;
  damage: number;
  hudClass: string;
}

/** 족보 우선순위: 상위부터 판정 */
export const HAND_WEAPON_TABLE: HandWeaponEntry[] = [
  {
    handId: 'YATZY',
    weaponId: 'NUCLEAR_LAUNCHER',
    maxAmmo: 2,
    fireRateMs: 800,
    damage: 999,
    hudClass: 'weapon-nuclear-launcher',
  },
  {
    handId: 'LARGE_STRAIGHT',
    weaponId: 'RAILGUN',
    maxAmmo: 3,
    fireRateMs: 620,
    damage: 105,
    hudClass: 'weapon-railgun',
  },
  {
    handId: 'SMALL_STRAIGHT',
    weaponId: 'BEAM_GUN',
    maxAmmo: 55,
    fireRateMs: 80,
    damage: 10,
    hudClass: 'weapon-beam-gun',
  },
  {
    handId: 'FULL_HOUSE',
    weaponId: 'MISSILE_LAUNCHER',
    maxAmmo: 7,
    fireRateMs: 400,
    damage: 54,
    hudClass: 'weapon-missile-launcher',
  },
  {
    handId: 'FOUR_OF_A_KIND',
    weaponId: 'MINIGUN',
    maxAmmo: 140,
    fireRateMs: 55,
    damage: 5,
    hudClass: 'weapon-minigun',
  },
  {
    handId: 'THREE_OF_A_KIND',
    weaponId: 'SHOTGUN',
    maxAmmo: 5,
    fireRateMs: 500,
    damage: 34,
    hudClass: 'weapon-shotgun',
  },
  {
    handId: 'TWO_PAIR',
    weaponId: 'DUAL_PISTOL',
    maxAmmo: 36,
    fireRateMs: 100,
    damage: 12,
    hudClass: 'weapon-dual-pistol',
  },
  {
    handId: 'ONE_PAIR',
    weaponId: 'REVOLVER',
    maxAmmo: 5,
    fireRateMs: 300,
    damage: 38,
    hudClass: 'weapon-revolver',
  },
  {
    handId: 'NONE',
    weaponId: 'DEFAULT_PISTOL',
    maxAmmo: null,
    fireRateMs: 250,
    damage: 14,
    hudClass: 'weapon-default-pistol',
  },
];

export function getEntryByHand(handId: HandId): HandWeaponEntry {
  const found = HAND_WEAPON_TABLE.find((e) => e.handId === handId);
  return found ?? HAND_WEAPON_TABLE[HAND_WEAPON_TABLE.length - 1]!;
}

export function getEntryByWeapon(weaponId: WeaponId): HandWeaponEntry {
  const found = HAND_WEAPON_TABLE.find((e) => e.weaponId === weaponId);
  return found ?? HAND_WEAPON_TABLE[HAND_WEAPON_TABLE.length - 1]!;
}
