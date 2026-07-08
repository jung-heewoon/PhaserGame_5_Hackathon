import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type Phaser from 'phaser';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import { PROCEDURAL_TEXTURE_KEYS } from './ProceduralTextures.ts';
import type { ProjectileVariant } from '../config/WeaponFireConfig.ts';
import type { ProjectileTrailTexture } from '../config/ProjectileVisualConfig.ts';

export interface ProjectileCatalog {
  get(variant: ProjectileVariant): ImageInfo | null;
  getMissileTrail(): ImageInfo | null;
  getTrail(texture: ProjectileTrailTexture): ImageInfo | null;
}

export function buildProjectileCatalog(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): ProjectileCatalog | null {
  const pistol = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.bulletPistol));
  const revolver = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.bulletRevolver));
  const shotgun = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.bulletShotgun));
  const minigun = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.bulletMinigun));
  const missile = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.bulletMissile));
  const missileTrail = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.missileTrail));
  const trailPistol = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.trailPistol));
  const trailRevolver = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.trailRevolver));
  const trailMinigun = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.trailMinigun));
  const trailShotgun = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.trailShotgun));

  if (
    !pistol ||
    !revolver ||
    !shotgun ||
    !minigun ||
    !missile ||
    !missileTrail ||
    !trailPistol ||
    !trailRevolver ||
    !trailMinigun ||
    !trailShotgun
  ) {
    return null;
  }

  const map: Record<ProjectileVariant, ImageInfo> = {
    pistol,
    revolver,
    shotgun,
    minigun,
    missile,
  };

  const trailMap: Record<ProjectileTrailTexture, ImageInfo> = {
    pistol: trailPistol,
    revolver: trailRevolver,
    minigun: trailMinigun,
    shotgun: trailShotgun,
    missile: missileTrail,
  };

  return {
    get(variant: ProjectileVariant) {
      return map[variant] ?? null;
    },
    getMissileTrail() {
      return missileTrail;
    },
    getTrail(texture: ProjectileTrailTexture) {
      return trailMap[texture] ?? null;
    },
  };
}

export type BeamFlashVariant = 'beam' | 'rail' | 'explosion';

export interface BeamFlashCatalog {
  get(variant: BeamFlashVariant): ImageInfo | null;
  getBeamSegment(): ImageInfo | null;
  getBeamCore(): ImageInfo | null;
  getBeamSpark(): ImageInfo | null;
  getRailCore(): ImageInfo | null;
}

export function buildBeamFlashCatalog(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): BeamFlashCatalog | null {
  const beam = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.beamFlash));
  const beamSegment = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.beamSegment));
  const beamCore = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.beamCore));
  const beamSpark = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.beamSpark));
  const rail = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.railFlash));
  const railCore = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.railCore));
  const explosion = tpf.loadImage(scene.textures.get(PROCEDURAL_TEXTURE_KEYS.explosion));

  if (!beam || !beamSegment || !beamCore || !beamSpark || !rail || !railCore || !explosion) return null;

  const map: Record<BeamFlashVariant, ImageInfo> = { beam, rail, explosion };

  return {
    get(variant: BeamFlashVariant) {
      return map[variant] ?? null;
    },
    getBeamSegment() {
      return beamSegment;
    },
    getBeamCore() {
      return beamCore;
    },
    getBeamSpark() {
      return beamSpark;
    },
    getRailCore() {
      return railCore;
    },
  };
}
