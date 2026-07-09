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

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
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
      ? localeManager.t('weeklyDefense.rewardCurrentActiveBadge')
      : localeManager.t('weeklyDefense.rewardCurrentInactiveBadge');
  }
  if (amountEl) amountEl.textContent = String(amount);
  if (labelEl) {
    labelEl.textContent = status.buffActive
      ? localeManager.t('weeklyDefense.rewardCurrentActive', { amount: String(amount) })
      : localeManager.t('weeklyDefense.rewardCurrentInactive', { amount: String(amount) });
  }
  if (descEl) {
    descEl.textContent = status.buffActive
      ? localeManager.t('weeklyDefense.rewardCurrentActiveDesc', { amount: String(amount) })
      : localeManager.t('weeklyDefense.rewardCurrentInactiveDesc', { amount: String(amount) });
  }
}

function bindMyContribution(status: WeeklyDefenseStatus): void {
  const killsEl = document.getElementById('weekly-defense-detail-my-kills');
  const percentEl = document.getElementById('weekly-defense-detail-my-percent');
  if (killsEl) killsEl.textContent = status.myKills.toLocaleString();
  if (percentEl) {
    percentEl.textContent = localeManager.t('weeklyDefense.myContributionShare', {
      percent: status.myPercent.toFixed(1),
    });
  }
}

function bindCardTotals(status: WeeklyDefenseStatus): void {
  const killsEl = document.getElementById('weekly-defense-card-kills');
  const targetEl = document.getElementById('weekly-defense-card-target');
  if (killsEl) killsEl.textContent = formatCompactCount(status.kills);
  if (targetEl) targetEl.textContent = formatCompactCount(status.target);
}

function bindDetail(status: WeeklyDefenseStatus): void {
  const killsEl = document.getElementById('weekly-defense-detail-kills');
  const targetEl = document.getElementById('weekly-defense-detail-target');
  const percentEl = document.getElementById('weekly-defense-detail-percent');
  const fillEl = document.getElementById('weekly-defense-detail-gauge-fill');

  if (killsEl) killsEl.textContent = status.kills.toLocaleString();
  if (targetEl) targetEl.textContent = status.target.toLocaleString();
  if (percentEl) percentEl.textContent = `${Math.min(100, status.percent).toFixed(1)}%`;
  if (fillEl) fillEl.style.width = `${Math.min(100, status.percent)}%`;
  bindReward(status);
  bindMyContribution(status);
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
  card.classList.toggle('weekly-defense-card--buff', cachedStatus.buffActive);

  countToken += 1;
  const token = countToken;
  const display = cachedStatus;
  animatePercent(document.getElementById('weekly-defense-percent'), display.percent, token);
  animateVerticalGaugeFill(
    document.getElementById('weekly-defense-gauge-fill'),
    display.percent,
    token,
  );
  bindCardTotals(display);

  const label = localeManager.t('weeklyDefense.clearProgress');
  card.setAttribute(
    'aria-label',
    `${label}: ${display.percent.toFixed(1)}%, ${formatKillsTarget(display)}`,
  );
}

export function refreshWeeklyDefenseLocale(): void {
  if (!cachedStatus) return;
  bindCardTotals(cachedStatus);
  if (detailOpen) bindDetail(cachedStatus);
}
