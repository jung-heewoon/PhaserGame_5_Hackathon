import type Phaser from 'phaser';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import { DAMAGE_NUMBER_CONFIG } from '../config/DamageNumberConfig.ts';

const PADDING_X = 8;
const PADDING_Y = 6;

export function damageNumberTextureKey(poolIndex: number): string {
  return `${DAMAGE_NUMBER_CONFIG.textureKeyPrefix}${poolIndex}`;
}

export function rasterizeDamageNumberTexture(
  scene: Phaser.Scene,
  textureKey: string,
  amount: number,
): { width: number; height: number } | null {
  const label = `-${Math.round(amount)}`;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.font = DAMAGE_NUMBER_CONFIG.font;
  const metrics = ctx.measureText(label);
  const textW = Math.ceil(metrics.width);
  const textH = 22;

  canvas.width = textW + PADDING_X * 2;
  canvas.height = textH + PADDING_Y * 2;

  ctx.font = DAMAGE_NUMBER_CONFIG.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.shadowColor = 'rgba(255, 34, 0, 0.9)';
  ctx.shadowBlur = 6;
  ctx.strokeStyle = '#660000';
  ctx.lineWidth = 3;
  ctx.strokeText(label, cx, cy);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, cx, cy);

  if (scene.textures.exists(textureKey)) {
    scene.textures.remove(textureKey);
  }
  scene.textures.addCanvas(textureKey, canvas);

  return { width: canvas.width, height: canvas.height };
}

export function loadDamageNumberImage(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
  textureKey: string,
): ImageInfo | null {
  const tex = scene.textures.get(textureKey);
  if (!tex || tex.key === '__MISSING') return null;
  return tpf.loadImage(tex);
}
