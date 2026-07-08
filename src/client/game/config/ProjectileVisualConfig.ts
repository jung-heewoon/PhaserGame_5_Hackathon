import type { ProjectileVariant } from './WeaponFireConfig.ts';

export type ProjectileTrailTexture = 'pistol' | 'revolver' | 'minigun' | 'shotgun' | 'missile';

export interface ProjectileTrailProfile {
  enabled: boolean;
  maxSegments: number;
  spawnStepPx: number;
  durationMs: number;
  size: number;
  texture: ProjectileTrailTexture;
  color: { r: number; g: number; b: number };
  backOffsetPx: number;
}

export interface ProjectileVariantVisual {
  texW: number;
  texH: number;
  scale: number;
  /** ProjectileEntity 중심 히트 반경 (px) */
  hitRadius: number;
  color: { r: number; g: number; b: number };
  trail: ProjectileTrailProfile;
}

/** 무기 variant별 투사체 크기·틴트·트레일 */
export const PROJECTILE_VARIANT_VISUAL: Record<ProjectileVariant, ProjectileVariantVisual> = {
  pistol: {
    texW: 8,
    texH: 8,
    scale: 1.45,
    hitRadius: 7,
    color: { r: 1.18, g: 1.12, b: 0.92 },
    trail: {
      enabled: true,
      maxSegments: 5,
      spawnStepPx: 12,
      durationMs: 110,
      size: 6,
      texture: 'pistol',
      color: { r: 1.12, g: 1.06, b: 0.8 },
      backOffsetPx: 4,
    },
  },
  revolver: {
    texW: 10,
    texH: 10,
    scale: 1.5,
    hitRadius: 8,
    color: { r: 1.22, g: 1.05, b: 0.78 },
    trail: {
      enabled: true,
      maxSegments: 6,
      spawnStepPx: 14,
      durationMs: 150,
      size: 8,
      texture: 'revolver',
      color: { r: 1.2, g: 0.95, b: 0.68 },
      backOffsetPx: 6,
    },
  },
  shotgun: {
    texW: 7,
    texH: 7,
    scale: 1.35,
    hitRadius: 6,
    color: { r: 1.25, g: 1.02, b: 0.72 },
    trail: {
      enabled: true,
      maxSegments: 4,
      spawnStepPx: 9,
      durationMs: 90,
      size: 7,
      texture: 'shotgun',
      color: { r: 1.14, g: 0.86, b: 0.58 },
      backOffsetPx: 3,
    },
  },
  minigun: {
    texW: 7,
    texH: 7,
    scale: 1.35,
    hitRadius: 6.5,
    color: { r: 1.28, g: 1.15, b: 0.62 },
    trail: {
      enabled: true,
      maxSegments: 4,
      spawnStepPx: 6,
      durationMs: 55,
      size: 5,
      texture: 'minigun',
      color: { r: 1.3, g: 1.08, b: 0.52 },
      backOffsetPx: 3,
    },
  },
  missile: {
    texW: 12,
    texH: 12,
    scale: 1.35,
    hitRadius: 4,
    color: { r: 1.18, g: 0.92, b: 0.82 },
    trail: {
      enabled: false,
      maxSegments: 0,
      spawnStepPx: 0,
      durationMs: 0,
      size: 0,
      texture: 'missile',
      color: { r: 1, g: 1, b: 1 },
      backOffsetPx: 0,
    },
  },
};
