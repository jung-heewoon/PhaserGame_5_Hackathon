import type TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import type { Camera } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import TombstonePickupEntity from '../entities/TombstonePickupEntity.ts';
import { TOMBSTONE_CONFIG } from '../config/TombstoneConfig.ts';
import { projectQuadCenterToHud } from './WorldUiProjection.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';

type LabelEntry = {
  ent: TombstonePickupEntity;
  el: HTMLElement;
};

const labels = new Map<TombstonePickupEntity, LabelEntry>();
let layerEl: HTMLElement | null = null;

function ensureLayer(): HTMLElement | null {
  if (layerEl) return layerEl;
  layerEl = document.getElementById('tombstone-label-layer');
  return layerEl;
}

function tileSizeFromEntity(ent: TombstonePickupEntity): number {
  const map = ent.context.collisionMap;
  if (map && 'tilesize' in map) return map.tilesize as number;
  return RUN_GAME_CONFIG.tileSize;
}

/** BossDamageHudToast·DamageNumberEntity와 동일 투영 + 스프라이트 화면 높이에 비례 폰트 */
function projectTombstoneLabelHud(
  ent: TombstonePickupEntity,
  camera: Camera,
): { x: number; y: number; fontSize: number } {
  const tileSize = tileSizeFromEntity(ent);
  const anchor = ent.getLabelAnchor();
  const spriteH = ent.getSpriteDisplayHeight();
  const centerY = ent.pos.y + ent.size.y / 2;

  const labelHud = projectQuadCenterToHud(
    anchor.x,
    anchor.y,
    anchor.z,
    tileSize,
    TOMBSTONE_CONFIG.labelHalfExtentPx,
    camera,
  );

  const baseHud = projectQuadCenterToHud(
    anchor.x,
    centerY + spriteH * 0.5,
    ent.pos.z,
    tileSize,
    spriteH * 0.5,
    camera,
  );

  const projectedSpriteH = Math.abs(baseHud.y - labelHud.y);
  const fontSize = Math.round(Math.max(12, Math.min(17, projectedSpriteH * 0.3)));

  return { x: labelHud.x, y: labelHud.y, fontSize };
}

export function registerTombstoneLabel(ent: TombstonePickupEntity, username: string): void {
  const layer = ensureLayer();
  if (!layer || labels.has(ent)) return;

  const el = document.createElement('div');
  el.className = 'tombstone-label';
  el.textContent = username;
  layer.appendChild(el);
  labels.set(ent, { ent, el });
}

export function unregisterTombstoneLabel(ent: TombstonePickupEntity): void {
  const entry = labels.get(ent);
  if (!entry) return;
  entry.el.remove();
  labels.delete(ent);
}

export function clearTombstoneLabels(): void {
  for (const entry of labels.values()) {
    entry.el.remove();
  }
  labels.clear();
}

export function syncTombstoneLabels(camera: Camera | null, entities: readonly TPFEntity[]): void {
  const layer = ensureLayer();
  if (!layer || !camera) return;

  const active = new Set<TombstonePickupEntity>();
  for (const ent of entities) {
    if (!(ent instanceof TombstonePickupEntity) || ent._killed || !ent.record) continue;
    active.add(ent);
    registerTombstoneLabel(ent, ent.record.username);

    const entry = labels.get(ent)!;
    const hud = projectTombstoneLabelHud(ent, camera);
    entry.el.style.left = `${hud.x}px`;
    entry.el.style.top = `${hud.y}px`;
    entry.el.style.fontSize = `${hud.fontSize}px`;
    entry.el.style.opacity = ent.isOwn ? '0.55' : '1';
  }

  for (const [ent, entry] of labels) {
    if (!active.has(ent)) {
      entry.el.remove();
      labels.delete(ent);
    }
  }
}
