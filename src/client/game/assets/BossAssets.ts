import type Phaser from 'phaser';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import type { BossType } from '../config/BossConfig.ts';
import bringerIdleUrl from '../Image/Boss/Bringer_Idle.png';
import bringerWalkUrl from '../Image/Boss/Bringer_Walk.png';
import bringerCastUrl from '../Image/Boss/Bringer_Cast.png';
import bringerDeathUrl from '../Image/Boss/Bringer_Death.png';
import demonIdleUrl from '../Image/Boss/Demon_Idle.png';
import demonWalkUrl from '../Image/Boss/Demon_Walk.png';
import demonCastUrl from '../Image/Boss/Demon_Cast.png';
import demonDeathUrl from '../Image/Boss/Demon_Death.png';
import guardianIdleUrl from '../Image/Boss/Guardian_Idle.png';
import guardianWalkUrl from '../Image/Boss/Guardian_Walk.png';
import guardianCastUrl from '../Image/Boss/Guardian_Cast.png';
import guardianDeathUrl from '../Image/Boss/Guardian_Death.png';

export interface BossSpriteSet {
  idle: ImageInfo;
  walk: ImageInfo;
  cast: ImageInfo;
  death: ImageInfo;
}

export type BossCatalog = Map<BossType, BossSpriteSet>;

type BossSheet = 'idle' | 'walk' | 'cast' | 'death';

const TEXTURE_KEYS: Record<BossType, Record<BossSheet, string>> = {
  bringer: {
    idle: 'boss-bringer-idle',
    walk: 'boss-bringer-walk',
    cast: 'boss-bringer-cast',
    death: 'boss-bringer-death',
  },
  demon: {
    idle: 'boss-demon-idle',
    walk: 'boss-demon-walk',
    cast: 'boss-demon-cast',
    death: 'boss-demon-death',
  },
  guardian: {
    idle: 'boss-guardian-idle',
    walk: 'boss-guardian-walk',
    cast: 'boss-guardian-cast',
    death: 'boss-guardian-death',
  },
};

const TEXTURE_URLS: Record<BossType, Record<BossSheet, string>> = {
  bringer: {
    idle: bringerIdleUrl,
    walk: bringerWalkUrl,
    cast: bringerCastUrl,
    death: bringerDeathUrl,
  },
  demon: {
    idle: demonIdleUrl,
    walk: demonWalkUrl,
    cast: demonCastUrl,
    death: demonDeathUrl,
  },
  guardian: {
    idle: guardianIdleUrl,
    walk: guardianWalkUrl,
    cast: guardianCastUrl,
    death: guardianDeathUrl,
  },
};

export function bossTextureKey(bossType: BossType, sheet: BossSheet): string {
  return TEXTURE_KEYS[bossType][sheet];
}

export function preloadBossSprites(scene: Phaser.Scene): void {
  for (const bossType of Object.keys(TEXTURE_KEYS) as BossType[]) {
    const keys = TEXTURE_KEYS[bossType];
    const urls = TEXTURE_URLS[bossType];
    for (const sheet of Object.keys(keys) as BossSheet[]) {
      if (!scene.textures.exists(keys[sheet])) {
        scene.load.image(keys[sheet], urls[sheet]);
      }
    }
  }
}

export function buildBossCatalog(
  tpf: TwoPointFiveScenePlugin,
  scene: Phaser.Scene,
): BossCatalog {
  const catalog: BossCatalog = new Map();
  for (const bossType of Object.keys(TEXTURE_KEYS) as BossType[]) {
    const keys = TEXTURE_KEYS[bossType];
    const idle = tpf.loadImage(scene.textures.get(keys.idle));
    const walk = tpf.loadImage(scene.textures.get(keys.walk));
    const cast = tpf.loadImage(scene.textures.get(keys.cast));
    const death = tpf.loadImage(scene.textures.get(keys.death));
    if (idle && walk && cast && death) {
      catalog.set(bossType, { idle, walk, cast, death });
    }
  }
  return catalog;
}
