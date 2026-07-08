import Phaser from 'phaser';
import { publicUrl } from '../config/PublicUrl.ts';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';

export const ENEMY_SPRITE_COUNT = 15;
export const ENEMY_FRAME_WIDTH = 16;
export const ENEMY_FRAME_HEIGHT = 16;

export function enemyTextureKey(typeId: number): string {
  return `enemy-${typeId}`;
}

export function preloadEnemySprites(scene: Phaser.Scene): void {
  for (let id = 1; id <= ENEMY_SPRITE_COUNT; id++) {
    const key = enemyTextureKey(id);
    if (!scene.textures.exists(key)) {
      scene.load.image(key, publicUrl(`media/enemies/${id}.png`));
    }
  }
}

export type EnemyCatalog = Map<number, ImageInfo>;

export function buildEnemyCatalog(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): EnemyCatalog {
  const catalog: EnemyCatalog = new Map();
  for (let id = 1; id <= ENEMY_SPRITE_COUNT; id++) {
    const tex = scene.textures.get(enemyTextureKey(id));
    const info = tpf.loadImage(tex);
    if (info) catalog.set(id, info);
  }
  return catalog;
}
