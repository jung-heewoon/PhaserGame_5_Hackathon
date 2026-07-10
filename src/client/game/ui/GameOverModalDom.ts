import coinUrl from '../Image/UI/coin4_16x16.png';
import {redditLifecycle} from '../platform/reddit/RedditLifecycle.ts';
import {tombstoneClient} from '../platform/reddit/TombstoneClient.ts';
import { formatRunElapsed, highScoreStore } from '../systems/HighScoreStore.ts';
import type { UpsertTombstoneReq } from '../../../shared/api.ts';
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
import { localeManager } from '../locale/LocaleManager.ts';

export interface GameOverStats {
  score: number;
  coins: number;
  kills: number;
  elapsedMs: number;
  highScore?: number;
  isNewRecord?: boolean;
  weeklyDefense?: WeeklyDefenseStatus;
  /** 이번 런 비석·전사 보고서용 */
  runReport?: UpsertTombstoneReq;
}

/** 숫자가 0 → target 으로 카운트업 되는 연출 지속 시간 */
const COUNT_UP_MS = 720;
/** reset/재오픈 시 진행 중인 카운트업 무효화 */
let countToken = 0;

type DeathReportButtonState = 'idle' | 'sending' | 'sent' | 'failed' | 'cooldown';

let deathReportLocaleState: {
  visible: boolean;
  isNewRecord: boolean;
  buttonState: DeathReportButtonState;
  cooldownMinutes?: string;
} | null = null;

function applyDeathReportLocale(): void {
  if (!deathReportLocaleState?.visible) return;

  const deathReportBtn = document.getElementById('gameover-death-report-btn');
  const deathReportDisclaimer = document.getElementById('gameover-death-report-disclaimer');
  const { isNewRecord, buttonState, cooldownMinutes } = deathReportLocaleState;

  if (deathReportDisclaimer) {
    deathReportDisclaimer.textContent = localeManager.t(
      isNewRecord ? 'gameover.deathReport.disclaimerNewRecord' : 'gameover.deathReport.disclaimer',
    );
  }

  if (!deathReportBtn) return;

  switch (buttonState) {
    case 'sending':
      deathReportBtn.textContent = localeManager.t('gameover.deathReport.sending');
      break;
    case 'sent':
      deathReportBtn.textContent = localeManager.t('gameover.deathReport.sent');
      break;
    case 'failed':
      deathReportBtn.textContent = localeManager.t('gameover.deathReport.failed');
      break;
    case 'cooldown':
      deathReportBtn.textContent = localeManager.t('gameover.deathReport.cooldown', {
        minutes: cooldownMinutes ?? '1',
      });
      break;
    default:
      deathReportBtn.textContent = localeManager.t(
        isNewRecord ? 'gameover.deathReport.submitNewRecord' : 'gameover.deathReport.submit',
      );
      break;
  }
}

function setDeathReportButtonState(
  state: DeathReportButtonState,
  cooldownMinutes?: string,
): void {
  if (!deathReportLocaleState) return;
  deathReportLocaleState.buttonState = state;
  deathReportLocaleState.cooldownMinutes = cooldownMinutes;
  applyDeathReportLocale();
}

export function refreshGameOverDeathReportLocale(): void {
  applyDeathReportLocale();
}

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

function formatCooldownMinutes(ms: number): string {
  return String(Math.max(1, Math.ceil(ms / 60_000)));
}

export function isGameOverModalOpen(): boolean {
  const modal = document.getElementById('gameover-modal');
  return Boolean(modal && !modal.classList.contains('hidden'));
}

export function showGameOverModal(stats: GameOverStats, onRetry: () => void): void {
  const modal = document.getElementById('gameover-modal');
  const retryBtn = document.getElementById('gameover-retry-btn');
  const upgradeBtn = document.getElementById('gameover-upgrade-btn');
  const deathReportSection = document.getElementById('gameover-death-report');
  const deathReportBtn = document.getElementById('gameover-death-report-btn');
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

  const showDeathReport = Boolean(stats.runReport && deathReportSection && deathReportBtn);
  if (deathReportSection) {
    deathReportSection.classList.toggle('hidden', !showDeathReport);
  }
  deathReportLocaleState = showDeathReport
    ? { visible: true, isNewRecord, buttonState: 'idle' }
    : null;
  if (deathReportBtn) {
    deathReportBtn.disabled = false;
    deathReportBtn.dataset.state = 'idle';
  }
  applyDeathReportLocale();

  showGameOverLeaderboard(highScore, isNewRecord);
  showWeeklyDefenseOnGameOver(stats.weeklyDefense);

  countToken += 1;
  const myToken = countToken;
  animateCount(document.getElementById('gameover-score'), stats.score, myToken);
  animateCount(document.getElementById('gameover-kills'), stats.kills, myToken);
  animateCount(document.getElementById('gameover-coins'), stats.coins, myToken);

  domUiBridge.setLayerInteractive(true);
  setGameOverHudActive(true);
  modal.classList.remove('hidden');

  if (showDeathReport && stats.runReport) {
    void tombstoneClient.upsertOnDeath(stats.runReport).catch((err) => {
      console.warn('tombstone upsert failed', err);
    });
  }

  const onDeathReportClick = () => {
    if (!deathReportBtn || !stats.runReport) return;
    if (deathReportBtn.dataset.state === 'sending' || deathReportBtn.dataset.state === 'sent') {
      return;
    }

    deathReportBtn.dataset.state = 'sending';
    deathReportBtn.disabled = true;
    setDeathReportButtonState('sending');

    void tombstoneClient
      .submitDeathReportComment({
        score: stats.runReport.score,
        triggerMs: stats.runReport.triggerMs,
        deathReasonId: stats.runReport.deathReasonId,
        monsterKills: stats.runReport.monsterKills,
        bossKills: stats.runReport.bossKills,
        isNewRecord,
      })
      .then((rsp) => {
        if (rsp.submitted) {
          deathReportBtn.dataset.state = 'sent';
          setDeathReportButtonState('sent');
          return;
        }
        deathReportBtn.dataset.state = 'idle';
        deathReportBtn.disabled = false;
        if (rsp.cooldownRemainingMs) {
          deathReportBtn.dataset.state = 'cooldown';
          setDeathReportButtonState(
            'cooldown',
            formatCooldownMinutes(rsp.cooldownRemainingMs),
          );
          return;
        }
        setDeathReportButtonState('failed');
      })
      .catch((err) => {
        console.warn('death report comment failed', err);
        deathReportBtn.dataset.state = 'idle';
        deathReportBtn.disabled = false;
        setDeathReportButtonState('failed');
      });
  };

  const onRetryClick = () => {
    countToken += 1;
    deathReportLocaleState = null;
    retryBtn.removeEventListener('click', onRetryClick);
    upgradeBtn?.removeEventListener('click', onUpgradeClick);
    deathReportBtn?.removeEventListener('click', onDeathReportClick);
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
  if (showDeathReport) {
    deathReportBtn?.addEventListener('click', onDeathReportClick);
  }
}
