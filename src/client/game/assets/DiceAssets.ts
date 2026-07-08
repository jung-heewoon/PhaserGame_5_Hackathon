import type Phaser from 'phaser';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import faceDraggingUrl from '../Image/UI/Dice/dice_full_dragging.png';
import faceNormalUrl from '../Image/UI/Dice/dice_full_normal.png';
import overlayDraggingUrl from '../Image/UI/Dice/highlight_overlay_dragging.png';
import overlayNormalUrl from '../Image/UI/Dice/highlight_overlay_normal.png';
import cursorUrl from '../Image/UI/Dice/selection_cursor.png';

/** 야찌 모달 주사위 스프라이트 URL */
export const DICE_ASSETS = {
  faceDragging: faceDraggingUrl,
  faceNormal: faceNormalUrl,
  overlayDragging: overlayDraggingUrl,
  overlayNormal: overlayNormalUrl,
  cursor: cursorUrl,
} as const;

/** 필드 주사위 픽업이 쓰는 면 시트(dice_full_dragging.png) Phaser 텍스처 키 */
export const DICE_PICKUP_TEXTURE_KEY = 'dice-pickup-face';

export function preloadDicePickup(scene: Phaser.Scene): void {
  scene.load.image(DICE_PICKUP_TEXTURE_KEY, faceDraggingUrl);
}

export function buildDicePickupImage(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): ImageInfo | null {
  const tex = scene.textures.get(DICE_PICKUP_TEXTURE_KEY);
  if (!tex || tex.key === '__MISSING') return null;
  return tpf.loadImage(tex);
}
