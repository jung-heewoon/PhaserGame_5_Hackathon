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
    const cx = ent.pos.x + ent.size.x / 2;
    const cy = ent.pos.y + ent.size.y / 2;
    const cz = ent.pos.z + TOMBSTONE_CONFIG.labelOffsetZ;
    const hud = projectQuadCenterToHud(
      cx,
      cy,
      cz,
      RUN_GAME_CONFIG.tileSize,
      12,
      camera,
    );
    entry.el.style.left = `${hud.x}px`;
    entry.el.style.top = `${hud.y + TOMBSTONE_CONFIG.labelHudOffsetY}px`;
    entry.el.style.opacity = ent.isOwn ? '0.55' : '1';
  }

  for (const [ent, entry] of labels) {
    if (!active.has(ent)) {
      entry.el.remove();
      labels.delete(ent);
    }
  }
}
