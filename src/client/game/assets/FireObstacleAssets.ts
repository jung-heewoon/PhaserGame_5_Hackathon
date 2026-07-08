import type Phaser from 'phaser';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import fireUrl from '../Image/Object/Fire_1.png';

export const FIRE_OBSTACLE_TEXTURE_KEY = 'fire-obstacle-1';

export function preloadFireObstacle(scene: Phaser.Scene): void {
  if (!scene.textures.exists(FIRE_OBSTACLE_TEXTURE_KEY)) {
    scene.load.image(FIRE_OBSTACLE_TEXTURE_KEY, fireUrl);
  }
}

export function buildFireObstacleImage(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): ImageInfo | null {
  const tex = scene.textures.get(FIRE_OBSTACLE_TEXTURE_KEY);
  if (!tex || tex.key === '__MISSING') return null;
  return tpf.loadImage(tex);
}
