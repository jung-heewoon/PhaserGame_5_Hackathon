import coinUrl from '../Image/UI/coin4_16x16.png';
import {redditLifecycle} from '../platform/reddit/RedditLifecycle.ts';
import { formatRunElapsed, highScoreStore } from '../systems/HighScoreStore.ts';
import type { WeeklyDefenseStatus } from '../../../shared/weeklyDefense.ts';
import { domUiBridge } from './DomUiBridge.ts';
import {
  resetGameOverLeaderboard,
  showGameOverLeaderboard,
} from './GameOverLeaderboardDom.ts';
import {
  resetWeeklyDefenseGameOver,
  showWeeklyDefenseOnGameOver,
} from './WeeklyDefenseGameOverDom.ts';
import { showUpgradeModal } from './UpgradeModalDom.ts';

export interface GameOverStats {
  score: number;
  coins: number;
  kills: number;
  elapsedMs: number;
  highScore?: number;
  isNewRecord?: boolean;
  weeklyDefense?: WeeklyDefenseStatus;
}

/** 숫자가 0 → target 으로 카운트업 되는 연출 지속 시간 */
const COUNT_UP_MS = 720;
/** reset/재오픈 시 진행 중인 카운트업 무효화 */
let countToken = 0;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function animateCount(el: HTMLElement | null, target: number, myToken: number): void {
  if (!el) return;
  if (target <= 0) {
    el.textContent = '0';
    return;
  }

  const startT = performance.now();
  const step = (now: number): void => {
    if (myToken !== countToken) return;
    const p = Math.min(1, (now - startT) / COUNT_UP_MS);
    const value = Math.round(target * easeOutCubic(p));
    el.textContent = String(value);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function ensureCoinIcon(): void {
  const iconEl = document.getElementById('gameover-coin-icon');
  if (iconEl && !iconEl.style.backgroundImage) {
    iconEl.style.backgroundImage = `url("${coinUrl}")`;
  }
}

function setGameOverHudActive(active: boolean): void {
  document.getElementById('doom-hud-layer')?.classList.toggle('game-over-active', active);
}

export function isGameOverModalOpen(): boolean {
  const modal = document.getElementById('gameover-modal');
  return Boolean(modal && !modal.classList.contains('hidden'));
}

export function showGameOverModal(stats: GameOverStats, onRetry: () => void): void {
  const modal = document.getElementById('gameover-modal');
  const retryBtn = document.getElementById('gameover-retry-btn');
  const upgradeBtn = document.getElementById('gameover-upgrade-btn');
  if (!modal || !retryBtn) {
    onRetry();
    return;
  }

  ensureCoinIcon();

  const timeEl = document.getElementById('gameover-time');
  if (timeEl) timeEl.textContent = formatRunElapsed(stats.elapsedMs);

  const { highScore, isNewRecord } =
    stats.highScore !== undefined && stats.isNewRecord !== undefined
      ? { highScore: stats.highScore, isNewRecord: stats.isNewRecord }
      : highScoreStore.tryUpdate(stats.score);
  const hiscoreBox = document.getElementById('gameover-hiscore');
  const hiscoreEl = document.getElementById('gameover-high-score');
  const newRecordEl = document.getElementById('gameover-new-record');
  if (hiscoreEl) hiscoreEl.textContent = String(highScore);
  if (hiscoreBox) hiscoreBox.classList.toggle('doom-gameover-hiscore--new', isNewRecord);
  if (newRecordEl) newRecordEl.classList.toggle('hidden', !isNewRecord);
  if (isNewRecord) redditLifecycle.happytime('newHighScore');

  showGameOverLeaderboard(highScore);
  showWeeklyDefenseOnGameOver(stats.weeklyDefense);

  countToken += 1;
  const myToken = countToken;
  animateCount(document.getElementById('gameover-score'), stats.score, myToken);
  animateCount(document.getElementById('gameover-kills'), stats.kills, myToken);
  animateCount(document.getElementById('gameover-coins'), stats.coins, myToken);

  domUiBridge.setLayerInteractive(true);
  setGameOverHudActive(true);
  modal.classList.remove('hidden');

  const onRetryClick = () => {
    countToken += 1;
    retryBtn.removeEventListener('click', onRetryClick);
    upgradeBtn?.removeEventListener('click', onUpgradeClick);
    resetGameOverLeaderboard();
    resetWeeklyDefenseGameOver();
    setGameOverHudActive(false);
    modal.classList.add('hidden');
    domUiBridge.setLayerInteractive(false);
    onRetry();
  };

  const onUpgradeClick = () => {
    setGameOverHudActive(false);
    modal.classList.add('hidden');
    showUpgradeModal(() => {
      modal.classList.remove('hidden');
      setGameOverHudActive(true);
      domUiBridge.setLayerInteractive(true);
    });
  };

  retryBtn.addEventListener('click', onRetryClick);
  upgradeBtn?.addEventListener('click', onUpgradeClick);
}
