import Phaser from 'phaser';
import { publicUrl } from '../config/PublicUrl.ts';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';

export type WeaponExplosionVariant = 'missile' | 'nuclear';

export interface WeaponExplosionVariantMeta {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameMs: number;
  displayScale: number;
}

export const WEAPON_EXPLOSION_VARIANTS: Record<
  WeaponExplosionVariant,
  WeaponExplosionVariantMeta & { textureKey: string; path: string }
> = {
  missile: {
    textureKey: 'weapon-fx-missile-explosion',
    path: publicUrl('media/effects/Missile_Launcher.png'),
    frameWidth: 96,
    frameHeight: 96,
    frameCount: 15,
    frameMs: 45,
    displayScale: 1.05,
  },
  nuclear: {
    textureKey: 'weapon-fx-nuclear-explosion',
    path: publicUrl('media/effects/Nuclear_Missile.png'),
    frameWidth: 128,
    frameHeight: 128,
    frameCount: 13,
    frameMs: 55,
    displayScale: 1.85,
  },
};

export interface WeaponExplosionCatalog {
  getImage(variant: WeaponExplosionVariant): ImageInfo | null;
  getMeta(variant: WeaponExplosionVariant): WeaponExplosionVariantMeta;
}

export function preloadWeaponExplosions(scene: Phaser.Scene): void {
  for (const variant of Object.keys(WEAPON_EXPLOSION_VARIANTS) as WeaponExplosionVariant[]) {
    const { textureKey, path } = WEAPON_EXPLOSION_VARIANTS[variant];
    if (!scene.textures.exists(textureKey)) {
      scene.load.image(textureKey, path);
    }
  }
}

export function buildWeaponExplosionCatalog(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): WeaponExplosionCatalog | null {
  const images: Partial<Record<WeaponExplosionVariant, ImageInfo>> = {};

  for (const variant of Object.keys(WEAPON_EXPLOSION_VARIANTS) as WeaponExplosionVariant[]) {
    const { textureKey } = WEAPON_EXPLOSION_VARIANTS[variant];
    const image = tpf.loadImage(scene.textures.get(textureKey));
    if (!image) return null;
    images[variant] = image;
  }

  return {
    getImage(variant: WeaponExplosionVariant) {
      return images[variant] ?? null;
    },
    getMeta(variant: WeaponExplosionVariant) {
      const { frameWidth, frameHeight, frameCount, frameMs, displayScale } =
        WEAPON_EXPLOSION_VARIANTS[variant];
      return { frameWidth, frameHeight, frameCount, frameMs, displayScale };
    },
  };
}
