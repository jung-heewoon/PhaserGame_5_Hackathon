import type Phaser from 'phaser';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import bulletPickupUrl from '../Image/Object/bullet.png';

export const BULLET_PICKUP_TEXTURE_KEY = 'bullet-pickup';

export function preloadBulletPickup(scene: Phaser.Scene): void {
  scene.load.image(BULLET_PICKUP_TEXTURE_KEY, bulletPickupUrl);
}

export function buildBulletPickupImage(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): ImageInfo | null {
  const tex = scene.textures.get(BULLET_PICKUP_TEXTURE_KEY);
  if (!tex || tex.key === '__MISSING') return null;
  return tpf.loadImage(tex);
}
