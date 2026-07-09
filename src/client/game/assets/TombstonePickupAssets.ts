import type Phaser from 'phaser';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import tombstoneUrl from '../Image/Object/Tombstone.png';
import { TOMBSTONE_CONFIG } from '../config/TombstoneConfig.ts';

export const TOMBSTONE_TEXTURE_KEY = 'tombstone-pickup';

export function preloadTombstonePickup(scene: Phaser.Scene): void {
  scene.load.image(TOMBSTONE_TEXTURE_KEY, tombstoneUrl);
}

export function buildTombstonePickupImage(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): ImageInfo | null {
  const tex = scene.textures.get(TOMBSTONE_TEXTURE_KEY);
  if (!tex || tex.key === '__MISSING') return null;
  return tpf.loadImage(tex);
}

export const TOMBSTONE_FRAME_PX = TOMBSTONE_CONFIG.visualHeightPx;
