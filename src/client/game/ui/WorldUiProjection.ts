import { mat4, vec4 } from 'gl-matrix';
import type PerspectiveCamera from 'twopointfive-phaser-3/src/twopointfive/renderer/perspective-camera.ts';
import { GAME_DESIGN_HEIGHT, GAME_DESIGN_WIDTH } from '../config/GameDisplayConfig.ts';

export interface SpriteProjectionInput {
  worldCenterX: number;
  worldCenterY: number;
  posZ: number;
  spriteDisplayHeight: number;
  tileSize: number;
  camera: PerspectiveCamera;
}

function worldToHud(
  glX: number,
  glY: number,
  glZ: number,
  camera: PerspectiveCamera,
): { x: number; y: number } {
  const view = camera.view();
  const projection = camera.projection();
  const vp = mat4.create();
  mat4.multiply(vp, projection, view);

  const clip = vec4.create();
  vec4.set(clip, glX, glY, glZ, 1);
  vec4.transformMat4(clip, clip, vp);

  if (clip[3] <= 0.001) {
    return { x: GAME_DESIGN_WIDTH / 2, y: GAME_DESIGN_HEIGHT / 2 };
  }

  const ndcX = clip[0] / clip[3];
  const ndcY = clip[1] / clip[3];

  return {
    x: ((ndcX + 1) * 0.5) * GAME_DESIGN_WIDTH,
    y: ((1 - ndcY) * 0.5) * GAME_DESIGN_HEIGHT,
  };
}

/**
 * TPF entity updateQuad와 동일한 3D 앵커(스프라이트 상단) → design HUD 좌표.
 * quad: pos[0]=worldX, pos[2]=worldY, pos[1]=pos.z - tileSize/2 + spriteH/2
 */
export function projectSpriteTopToHud(input: SpriteProjectionInput): { x: number; y: number } {
  const glX = input.worldCenterX;
  const glZ = input.worldCenterY;
  const glY = input.posZ - input.tileSize / 2 + input.spriteDisplayHeight;
  return worldToHud(glX, glY, glZ, input.camera);
}

/** DamageNumberEntity.updateQuad와 동일 — 월드 앵커(라벨 중심) → design HUD */
export function projectQuadCenterToHud(
  worldCenterX: number,
  worldCenterY: number,
  worldZ: number,
  tileSize: number,
  verticalHalfExtent: number,
  camera: PerspectiveCamera,
): { x: number; y: number } {
  const glX = worldCenterX;
  const glZ = worldCenterY;
  const glY = worldZ - tileSize / 2 + verticalHalfExtent;
  return worldToHud(glX, glY, glZ, camera);
}
