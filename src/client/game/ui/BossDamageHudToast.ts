import { DAMAGE_NUMBER_CONFIG } from '../config/DamageNumberConfig.ts';
import type BossEntity from '../entities/BossEntity.ts';
import { spawnDamageToast } from './DamageToastDom.ts';
import { projectQuadCenterToHud } from './WorldUiProjection.ts';

const LABEL_HALF_H = 14;

/** 보스 피격 — TPF depth 대신 HUD DOM 토스트 (원거리·대형 스프라이트용) */
export function spawnBossDamageHudToast(boss: BossEntity, amount: number): void {
  if (amount <= 0) return;

  const camera = boss.context.camera;
  if (!camera) return;

  const collisionMap = boss.context.collisionMap;
  const tileSize = collisionMap && 'tilesize' in collisionMap ? collisionMap.tilesize : 64;
  const anchor = boss.getDamageNumberAnchor();

  const hud = projectQuadCenterToHud(
    anchor.x,
    anchor.y,
    anchor.z,
    tileSize,
    LABEL_HALF_H * DAMAGE_NUMBER_CONFIG.bossDisplayScale,
    camera,
  );

  spawnDamageToast(amount, { hudX: hud.x, hudY: hud.y }, 'damage-toast damage-toast--boss');
}
