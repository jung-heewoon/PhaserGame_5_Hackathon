import type Phaser from 'phaser';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import { HEART_HUD_CONFIG } from '../config/HeartHudConfig.ts';
import heartPickupUrl from '../Image/UI/Heart/heart.png';
import { canvasWithWhiteOutline } from './SpriteOutlineCanvas.ts';

export const HEART_PICKUP_TEXTURE_KEY = 'heart-pickup';
const HEART_PICKUP_SOURCE_KEY = 'heart-pickup-source';
/** 필드 하트 픽업 흰색 외곽선 두께(px) */
export const HEART_PICKUP_OUTLINE_PX = 1;

export function preloadHeartPickup(scene: Phaser.Scene): void {
  scene.load.image(HEART_PICKUP_SOURCE_KEY, heartPickupUrl);
}

export function buildHeartPickupImage(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): ImageInfo | null {
  const sourceTex = scene.textures.get(HEART_PICKUP_SOURCE_KEY);
  if (!sourceTex || sourceTex.key === '__MISSING') return null;

  if (!scene.textures.exists(HEART_PICKUP_TEXTURE_KEY)) {
    const source = sourceTex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    if (!source || !(source instanceof HTMLImageElement || source instanceof HTMLCanvasElement)) {
      return null;
    }
    const outlined = canvasWithWhiteOutline(source, HEART_PICKUP_OUTLINE_PX);
    scene.textures.addCanvas(HEART_PICKUP_TEXTURE_KEY, outlined);
  }

  const tex = scene.textures.get(HEART_PICKUP_TEXTURE_KEY);
  if (!tex || tex.key === '__MISSING') return null;
  return tpf.loadImage(tex);
}

export const HEART_PICKUP_FRAME_PX = HEART_HUD_CONFIG.sheetFrameWidthPx;
