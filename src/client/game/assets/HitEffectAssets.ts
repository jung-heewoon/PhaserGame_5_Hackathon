import Phaser from 'phaser';
import { publicUrl } from '../config/PublicUrl.ts';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';

export const HIT_EFFECT_TEXTURE_KEYS = {
  attack1: 'hit-fx-attack-1',
  attack2: 'hit-fx-attack-2',
} as const;

export const HIT_EFFECT_FRAME_WIDTH = 48;
export const HIT_EFFECT_FRAME_HEIGHT = 48;
export const HIT_EFFECT_FRAME_COUNT = 7;

export interface HitEffectCatalog {
  attack1: ImageInfo;
  attack2: ImageInfo;
}

export function preloadHitEffects(scene: Phaser.Scene): void {
  const paths = [
    [HIT_EFFECT_TEXTURE_KEYS.attack1, publicUrl('media/effects/Attack_1.png')],
    [HIT_EFFECT_TEXTURE_KEYS.attack2, publicUrl('media/effects/Attack_2.png')],
  ] as const;

  for (const [key, url] of paths) {
    if (!scene.textures.exists(key)) {
      scene.load.image(key, url);
    }
  }
}

export function buildHitEffectCatalog(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): HitEffectCatalog | null {
  const attack1 = tpf.loadImage(scene.textures.get(HIT_EFFECT_TEXTURE_KEYS.attack1));
  const attack2 = tpf.loadImage(scene.textures.get(HIT_EFFECT_TEXTURE_KEYS.attack2));
  if (!attack1 || !attack2) return null;
  return { attack1, attack2 };
}
