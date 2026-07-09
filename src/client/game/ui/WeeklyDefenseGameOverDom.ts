import { DICE_ASSETS } from '../assets/DiceAssets.ts';
import { localeManager } from '../locale/LocaleManager.ts';
import {
  WEEKLY_DEFENSE_CONFIG,
  type WeeklyDefenseStatus,
} from '../../../shared/weeklyDefense.ts';

const COUNT_UP_MS = 720;
let countToken = 0;
let cachedStatus: WeeklyDefenseStatus | null = null;
let detailOpen = false;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function animatePercent(el: HTMLElement | null, target: number, token: number): void {
  if (!el) return;
  const display = Math.min(100, Math.max(0, target));
  if (display <= 0) {
    el.textContent = '0%';
    return;
  }
  const startT = performance.now();
  const step = (now: number): void => {
    if (token !== countToken) return;
    const p = Math.min(1, (now - startT) / COUNT_UP_MS);
    const value = display * easeOutCubic(p);
    el.textContent = `${value.toFixed(1)}%`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function animateVerticalGaugeFill(
  el: HTMLElement | null,
  percent: number,
  token: number,
): void {
  if (!el) return;
  const display = Math.min(100, Math.max(0, percent));
  el.style.height = '0%';
  const startT = performance.now();
  const step = (now: number): void => {
    if (token !== countToken) return;
    const p = Math.min(1, (now - startT) / COUNT_UP_MS);
    el.style.height = `${display * easeOutCubic(p)}%`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function formatKillsTarget(status: WeeklyDefenseStatus): string {
  return `${status.kills.toLocaleString()} / ${status.target.toLocaleString()}`;
}

function ensureDiceIcon(): void {
  const iconEl = document.getElementById('weekly-defense-detail-dice-icon');
  if (iconEl && !iconEl.style.backgroundImage) {
    iconEl.style.backgroundImage = `url("${DICE_ASSETS.faceDragging}")`;
  }
}

function bindReward(status: WeeklyDefenseStatus): void {
  const amount = WEEKLY_DEFENSE_CONFIG.buffBonusDice;
  const rewardSection = document.getElementById('weekly-defense-detail-reward');
  const badgeEl = document.getElementById('weekly-defense-detail-reward-badge');
  const amountEl = document.getElementById('weekly-defense-detail-reward-amount');
  const labelEl = document.getElementById('weekly-defense-detail-reward-label');
  const descEl = document.getElementById('weekly-defense-detail-reward-desc');

  ensureDiceIcon();
  rewardSection?.classList.toggle('weekly-defense-detail__reward--active', status.buffActive);
  rewardSection?.classList.toggle('weekly-defense-detail__reward--pending', !status.buffActive);

  if (badgeEl) {
    badgeEl.textContent = status.buffActive
      ? localeManager.t('weeklyDefense.rewardActiveBadge')
      : localeManager.t('weeklyDefense.rewardPendingBadge');
  }
  if (amountEl) amountEl.textContent = String(amount);
  if (labelEl) {
    labelEl.textContent = status.buffActive
      ? localeManager.t('weeklyDefense.rewardActive', { amount: String(amount) })
      : localeManager.t('weeklyDefense.rewardPending', { amount: String(amount) });
  }
  if (descEl) {
    const remaining = Math.max(0, status.target - status.kills);
    descEl.textContent = status.buffActive
      ? localeManager.t('weeklyDefense.rewardActiveDesc', { amount: String(amount) })
      : localeManager.t('weeklyDefense.rewardPendingDesc', {
          remaining: remaining.toLocaleString(),
          amount: String(amount),
        });
  }
}

function bindDetail(status: WeeklyDefenseStatus): void {
  const killsEl = document.getElementById('weekly-defense-detail-kills');
  const targetEl = document.getElementById('weekly-defense-detail-target');
  const buffEl = document.getElementById('weekly-defense-detail-buff');
  const percentEl = document.getElementById('weekly-defense-detail-percent');
  const fillEl = document.getElementById('weekly-defense-detail-gauge-fill');

  if (killsEl) killsEl.textContent = status.kills.toLocaleString();
  if (targetEl) targetEl.textContent = status.target.toLocaleString();
  if (buffEl) {
    buffEl.textContent = status.buffActive
      ? localeManager.t('weeklyDefense.buffActive')
      : localeManager.t('weeklyDefense.buffInactive');
    buffEl.classList.toggle('weekly-defense-detail__buff--active', status.buffActive);
  }
  if (percentEl) percentEl.textContent = `${Math.min(100, status.percent).toFixed(1)}%`;
  if (fillEl) fillEl.style.width = `${Math.min(100, status.percent)}%`;
  bindReward(status);
}

function openDetailModal(): void {
  if (!cachedStatus) return;
  const modal = document.getElementById('weekly-defense-detail-modal');
  if (!modal) return;
  bindDetail(cachedStatus);
  modal.classList.remove('hidden');
  detailOpen = true;
}

function closeDetailModal(): void {
  const modal = document.getElementById('weekly-defense-detail-modal');
  modal?.classList.add('hidden');
  detailOpen = false;
}

function onCardActivate(): void {
  openDetailModal();
}

export function initWeeklyDefenseGameOver(): void {
  ensureDiceIcon();

  const card = document.getElementById('gameover-weekly-defense');
  card?.addEventListener('click', onCardActivate);
  card?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCardActivate();
    }
  });

  const closeBtn = document.getElementById('weekly-defense-detail-close');
  closeBtn?.addEventListener('click', closeDetailModal);

  const detailModal = document.getElementById('weekly-defense-detail-modal');
  detailModal?.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailOpen) closeDetailModal();
  });
}

export function resetWeeklyDefenseGameOver(): void {
  countToken += 1;
  closeDetailModal();
  const card = document.getElementById('gameover-weekly-defense');
  card?.classList.add('hidden');
  card?.classList.remove('weekly-defense-card--loading');
}

export function showWeeklyDefenseOnGameOver(status: WeeklyDefenseStatus | null | undefined): void {
  const card = document.getElementById('gameover-weekly-defense');
  if (!card) return;

  if (!status) {
    card.classList.add('weekly-defense-card--loading');
    card.classList.remove('hidden');
    return;
  }

  cachedStatus = status;
  card.classList.remove('weekly-defense-card--loading', 'hidden');

  countToken += 1;
  const token = countToken;
  animatePercent(document.getElementById('weekly-defense-percent'), status.percent, token);
  animateVerticalGaugeFill(
    document.getElementById('weekly-defense-gauge-fill'),
    status.percent,
    token,
  );

  const label = localeManager.t('weeklyDefense.clearProgress');
  card.setAttribute(
    'aria-label',
    `${label}: ${status.percent.toFixed(1)}%, ${formatKillsTarget(status)}`,
  );
}

export function refreshWeeklyDefenseLocale(): void {
  if (cachedStatus) {
    if (detailOpen) bindDetail(cachedStatus);
  }
}
