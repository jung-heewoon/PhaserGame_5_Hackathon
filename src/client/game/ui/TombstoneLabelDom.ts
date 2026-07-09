import type TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import type { Camera } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import TombstonePickupEntity from '../entities/TombstonePickupEntity.ts';
import { TOMBSTONE_CONFIG } from '../config/TombstoneConfig.ts';
import { projectSpriteTopToHud } from './WorldUiProjection.ts';

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

/** 스프라이트 상단(TPF quad와 동일)에 라벨 붙임 */
function projectTombstoneLabelHud(
  ent: TombstonePickupEntity,
  camera: Camera,
): { x: number; y: number; fontSize: number } {
  const spriteH = ent.getSpriteDisplayHeight();
  const tileSize = ent.getTileSize();
  const renderZ = ent.getRenderPosZ();

  const topHud = projectSpriteTopToHud({
    worldCenterX: ent.getWorldCenterX(),
    worldCenterY: ent.getWorldCenterY(),
    posZ: renderZ,
    spriteDisplayHeight: spriteH,
    tileSize,
    camera,
  });

  const baseHud = projectSpriteTopToHud({
    worldCenterX: ent.getWorldCenterX(),
    worldCenterY: ent.getWorldCenterY(),
    posZ: renderZ,
    spriteDisplayHeight: spriteH * 0.35,
    tileSize,
    camera,
  });

  const projectedSpriteH = Math.abs(baseHud.y - topHud.y);
  const fontSize = Math.round(Math.max(11, Math.min(15, projectedSpriteH * 0.34)));

  return {
    x: topHud.x,
    y: topHud.y - TOMBSTONE_CONFIG.labelGapPx,
    fontSize,
  };
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
