import { HEART_HUD_ASSETS } from '../assets/HeartHudAssets.ts';
import {
  HEART_DISPLAY_SIZE_PX,
  HEART_HUD_CONFIG,
  HEART_SHEET_DISPLAY_WIDTH_PX,
} from '../config/HeartHudConfig.ts';

type HeartSlot = {
  root: HTMLElement;
  heartLayer: HTMLImageElement;
  animLayer: HTMLElement;
};

let slots: HeartSlot[] = [];
let lastHealth = -1;
let animating = false;
let pendingHealth: number | null = null;

function frameX(frameIndex: number): number {
  return -frameIndex * HEART_DISPLAY_SIZE_PX;
}

function setSlotFilled(slot: HeartSlot, filled: boolean): void {
  slot.heartLayer.style.visibility = filled ? 'visible' : 'hidden';
  slot.animLayer.style.visibility = 'hidden';
}

function playSlotAnim(slot: HeartSlot, direction: 'empty' | 'fill'): Promise<void> {
  const frames =
    direction === 'empty'
      ? [0, 1, 2, 3, 4]
      : [4, 3, 2, 1, 0];

  slot.heartLayer.style.visibility = 'hidden';
  slot.animLayer.style.visibility = 'visible';

  return new Promise((resolve) => {
    let step = 0;

    const tick = (): void => {
      const frame = frames[step]!;
      slot.animLayer.style.backgroundPosition = `${frameX(frame)}px 0`;
      step += 1;

      if (step < frames.length) {
        window.setTimeout(tick, HEART_HUD_CONFIG.animFrameMs);
        return;
      }

      slot.animLayer.style.visibility = 'hidden';
      slot.heartLayer.style.visibility = direction === 'fill' ? 'visible' : 'hidden';
      resolve();
    };

    tick();
  });
}

function setHeartsInstant(health: number): void {
  const clamped = Math.max(0, Math.min(HEART_HUD_CONFIG.maxHearts, health));
  for (let i = 0; i < slots.length; i++) {
    setSlotFilled(slots[i]!, i < clamped);
  }
  lastHealth = clamped;
  pendingHealth = null;
  animating = false;
}

async function animateToHealth(targetHealth: number): Promise<void> {
  const clamped = Math.max(0, Math.min(HEART_HUD_CONFIG.maxHearts, targetHealth));

  if (clamped === lastHealth) {
    pendingHealth = null;
    animating = false;
    return;
  }

  if (clamped < lastHealth) {
    const slotIndex = clamped;
    const slot = slots[slotIndex];
    if (slot) {
      await playSlotAnim(slot, 'empty');
    }
    lastHealth = clamped;
  } else {
    const slotIndex = clamped - 1;
    const slot = slots[slotIndex];
    if (slot) {
      await playSlotAnim(slot, 'fill');
    }
    lastHealth = clamped;
  }

  if (pendingHealth !== null && pendingHealth !== lastHealth) {
    const next = pendingHealth;
    pendingHealth = null;
    await animateToHealth(next);
    return;
  }

  pendingHealth = null;
  animating = false;
}

function createHeartSlot(): HeartSlot {
  const root = document.createElement('div');
  root.className = 'doom-heart-slot';

  const bg = document.createElement('img');
  bg.className = 'doom-heart__layer doom-heart__bg';
  bg.src = HEART_HUD_ASSETS.background;
  bg.alt = '';
  bg.draggable = false;

  const border = document.createElement('img');
  border.className = 'doom-heart__layer doom-heart__border';
  border.src = HEART_HUD_ASSETS.border;
  border.alt = '';
  border.draggable = false;

  const heartLayer = document.createElement('img');
  heartLayer.className = 'doom-heart__layer doom-heart__heart';
  heartLayer.src = HEART_HUD_ASSETS.heart;
  heartLayer.alt = '';
  heartLayer.draggable = false;

  const animLayer = document.createElement('div');
  animLayer.className = 'doom-heart__layer doom-heart__anim';
  animLayer.style.backgroundImage = `url(${HEART_HUD_ASSETS.animated})`;
  animLayer.style.backgroundSize = `${HEART_SHEET_DISPLAY_WIDTH_PX}px ${HEART_DISPLAY_SIZE_PX}px`;
  animLayer.style.backgroundPosition = `${frameX(0)}px 0`;
  animLayer.setAttribute('aria-hidden', 'true');

  root.append(bg, border, heartLayer, animLayer);
  return { root, heartLayer, animLayer };
}

/** 하트 슬롯 DOM 생성 */
export function initHeartHud(): void {
  const container = document.getElementById('hud-hearts');
  if (!container) return;

  container.replaceChildren();
  slots = [];

  for (let i = 0; i < HEART_HUD_CONFIG.maxHearts; i++) {
    const slot = createHeartSlot();
    slots.push(slot);
    container.appendChild(slot.root);
  }

  setHeartsInstant(HEART_HUD_CONFIG.maxHearts);
}

export function resetHeartHud(): void {
  setHeartsInstant(HEART_HUD_CONFIG.maxHearts);
}

export function updateHeartHud(health: number, maxHealth: number): void {
  const clampedMax = Math.max(1, Math.min(HEART_HUD_CONFIG.maxHearts, maxHealth));
  const clamped = Math.max(0, Math.min(clampedMax, Math.round(health)));

  const container = document.getElementById('hud-hearts');
  if (container) {
    container.setAttribute('aria-valuenow', String(clamped));
    container.setAttribute('aria-valuemax', String(clampedMax));
  }

  if (lastHealth < 0) {
    setHeartsInstant(clamped);
    return;
  }

  if (Math.abs(clamped - lastHealth) > 1) {
    setHeartsInstant(clamped);
    return;
  }

  if (clamped === lastHealth) return;

  if (animating) {
    pendingHealth = clamped;
    return;
  }

  animating = true;
  void animateToHealth(clamped);
}
