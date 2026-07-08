import type Phaser from 'phaser';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import guardianSkillUrl from '../Image/Effect/Boss_Effect/Guardian_Skill.png';
import bringerSkillUrl from '../Image/Effect/Boss_Effect/Bringer_Skill.png';
import { canvasWithWhiteOutline } from './SpriteOutlineCanvas.ts';
import { BRINGER_PATTERN_CONFIG } from '../config/BossPatternConfig.ts';

export const GUARDIAN_SKILL_TEXTURE_KEY = 'boss-effect-guardian-skill';
export const BRINGER_SKILL_TEXTURE_KEY = 'boss-effect-bringer-skill';
export const BRINGER_SKILL_OUTLINE_TEXTURE_KEY = 'boss-effect-bringer-skill-outline';

export interface BossEffectImages {
  guardianSkill: ImageInfo;
  bringerSkill: ImageInfo;
}

export function preloadBossEffects(scene: Phaser.Scene): void {
  if (!scene.textures.exists(GUARDIAN_SKILL_TEXTURE_KEY)) {
    scene.load.image(GUARDIAN_SKILL_TEXTURE_KEY, guardianSkillUrl);
  }
  if (!scene.textures.exists(BRINGER_SKILL_TEXTURE_KEY)) {
    scene.load.image(BRINGER_SKILL_TEXTURE_KEY, bringerSkillUrl);
  }
}

export function buildBossEffectImages(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): BossEffectImages | null {
  const guardianSkill = tpf.loadImage(scene.textures.get(GUARDIAN_SKILL_TEXTURE_KEY));
  const bringerSkill = loadBringerSkillWithOutline(tpf, scene);
  if (!guardianSkill || !bringerSkill) return null;
  return { guardianSkill, bringerSkill };
}

function loadBringerSkillWithOutline(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): ImageInfo | null {
  const sourceTex = scene.textures.get(BRINGER_SKILL_TEXTURE_KEY);
  const source = sourceTex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  if (!source || !(source instanceof HTMLImageElement || source instanceof HTMLCanvasElement)) {
    return null;
  }

  if (!scene.textures.exists(BRINGER_SKILL_OUTLINE_TEXTURE_KEY)) {
    const outlined = canvasWithWhiteOutline(source, BRINGER_PATTERN_CONFIG.skillOutlinePx);
    scene.textures.addCanvas(BRINGER_SKILL_OUTLINE_TEXTURE_KEY, outlined);
  }

  return tpf.loadImage(scene.textures.get(BRINGER_SKILL_OUTLINE_TEXTURE_KEY));
}
