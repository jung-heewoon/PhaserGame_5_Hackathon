import type { TombstoneRecord } from '../../../shared/tombstone.ts';
import { tombstoneCoinBonus } from '../../../shared/tombstone.ts';
import { DICE_ASSETS } from '../assets/DiceAssets.ts';
import tombstoneUrl from '../Image/Object/Tombstone.png';
import { DICE_SPRITE_CONFIG as DSC } from '../config/DiceSpriteConfig.ts';
import { TOMBSTONE_CONFIG } from '../config/TombstoneConfig.ts';
import { localeManager } from '../locale/LocaleManager.ts';
import { domUiBridge } from './DomUiBridge.ts';

export interface TombstoneRewardModalResult {
  totalPips: number;
}

type ModalStep = 'info' | 'reward' | 'dice';

interface ActiveSession {
  records: TombstoneRecord[];
  tabIndex: number;
  step: ModalStep;
  resolve: (result: TombstoneRewardModalResult) => void;
  reject: (err: Error) => void;
  diceValues: number[];
  animToken: number;
}

let modalEl: HTMLElement | null = null;
let stepInfoEl: HTMLElement | null = null;
let stepRewardEl: HTMLElement | null = null;
let stepDiceEl: HTMLElement | null = null;
let messageEl: HTMLElement | null = null;
let titleEl: HTMLElement | null = null;
let coinEl: HTMLElement | null = null;
let countEl: HTMLElement | null = null;
let tabPrevBtn: HTMLButtonElement | null = null;
let tabNextBtn: HTMLButtonElement | null = null;
let tabCounterEl: HTMLElement | null = null;
let diceRowEl: HTMLElement | null = null;
let pipsEl: HTMLElement | null = null;
let infoNextBtn: HTMLButtonElement | null = null;
let rewardNextBtn: HTMLButtonElement | null = null;
let continueBtn: HTMLButtonElement | null = null;
let stepDots: HTMLElement[] = [];

let session: ActiveSession | null = null;

const DICE_S = DSC.displayScale;
const DICE_FACE_W = DSC.faceNormal.frameW * DICE_S;
const DICE_FACE_H = DSC.faceNormal.frameH * DICE_S;
const DICE_SHEET_W = DSC.faceNormal.frameW * DSC.faceFrameCount * DICE_S;
const VISIBLE_DICE_MAX = 5;

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function deathReasonText(reasonId: number): string {
  const key = `tombstone.death.${String(reasonId).padStart(2, '0')}`;
  return localeManager.t(key);
}

function formatDeathMessage(record: TombstoneRecord): void {
  if (!messageEl) return;
  const reason = deathReasonText(record.deathReasonId);
  const score = record.score.toLocaleString();
  const locale = localeManager.getLocale();

  messageEl.replaceChildren();

  const userLine = document.createElement('p');
  userLine.className = 'tombstone-reward__message-line tombstone-reward__message-line--user';
  const userStrong = document.createElement('strong');
  userStrong.textContent = record.username;
  userLine.appendChild(userStrong);

  const scoreLine = document.createElement('p');
  scoreLine.className = 'tombstone-reward__message-line tombstone-reward__message-line--score';
  const scoreEm = document.createElement('em');
  scoreEm.textContent = locale === 'ko' ? `${score}점` : `${score} pts`;
  if (locale === 'ko') {
    scoreLine.append(scoreEm, '에서');
  } else {
    scoreLine.append('at ', scoreEm);
  }

  const reasonLine = document.createElement('p');
  reasonLine.className = 'tombstone-reward__message-line tombstone-reward__message-line--reason';
  const reasonSpan = document.createElement('span');
  reasonSpan.className = 'tombstone-reward__reason';
  reasonSpan.textContent = reason;
  reasonLine.appendChild(reasonSpan);
  if (locale === 'ko') {
    reasonLine.append(' 넘어졌습니다');
  } else {
    reasonLine.append(' — fell here');
  }

  messageEl.append(userLine, scoreLine, reasonLine);
}

function totalCoinPreview(records: TombstoneRecord[]): number {
  return records.reduce((sum, r) => sum + tombstoneCoinBonus(r.coinsAtDeath), 0);
}

function feverSecFromPips(totalPips: number): number {
  return Math.max(2, totalPips * TOMBSTONE_CONFIG.feverSecPerPip);
}

function applyDiceFaceStyle(node: HTMLElement, pip: number): void {
  node.style.width = `${DICE_FACE_W}px`;
  node.style.height = `${DICE_FACE_H}px`;
  node.style.backgroundImage = `url(${DICE_ASSETS.faceNormal})`;
  node.style.backgroundSize = `${DICE_SHEET_W}px ${DICE_FACE_H}px`;
  node.style.backgroundPosition = `${-pip * DICE_FACE_W}px 0`;
}

function createDiceDie(value: number): HTMLElement {
  const die = document.createElement('div');
  die.className = 'tombstone-reward__die';
  const face = document.createElement('div');
  face.className = 'tombstone-reward__die-face';
  applyDiceFaceStyle(face, value);
  die.appendChild(face);
  return die;
}

function setStep(step: ModalStep): void {
  if (!session) return;
  session.step = step;
  stepInfoEl?.classList.toggle('hidden', step !== 'info');
  stepRewardEl?.classList.toggle('hidden', step !== 'reward');
  stepDiceEl?.classList.toggle('hidden', step !== 'dice');

  for (const dot of stepDots) {
    const dotStep = dot.dataset.step as ModalStep | undefined;
    dot.classList.toggle('is-active', dotStep === step);
    dot.classList.toggle('is-done', isStepBefore(dotStep, step));
  }
}

function isStepBefore(candidate: ModalStep | undefined, current: ModalStep): boolean {
  const order: ModalStep[] = ['info', 'reward', 'dice'];
  if (!candidate) return false;
  return order.indexOf(candidate) < order.indexOf(current);
}

function renderTab(): void {
  if (!session || !messageEl || !tabCounterEl) return;
  const record = session.records[session.tabIndex];
  if (!record) return;
  if (titleEl) {
    titleEl.textContent = localeManager.t('tombstone.step.infoTitle', {
      user: record.username,
    });
  }
  formatDeathMessage(record);
  tabCounterEl.textContent = localeManager.t('tombstone.tab', {
    current: String(session.tabIndex + 1),
    total: String(session.records.length),
  });
  if (tabPrevBtn) tabPrevBtn.disabled = session.tabIndex <= 0;
  if (tabNextBtn) tabNextBtn.disabled = session.tabIndex >= session.records.length - 1;
}

function renderRewardStep(): void {
  if (!session || !coinEl) return;
  if (countEl) {
    countEl.textContent = localeManager.t('tombstone.step.rewardCount', {
      count: String(session.records.length),
    });
  }
  coinEl.textContent = localeManager.t('tombstone.coins', {
    amount: String(totalCoinPreview(session.records)),
  });
}

function createDiceExtraBadge(extraCount: number): HTMLElement {
  const badge = document.createElement('div');
  badge.className = 'tombstone-reward__dice-extra';
  badge.textContent = localeManager.t('tombstone.step.diceExtra', {
    extra: String(extraCount),
  });
  return badge;
}

function renderDiceRow(): void {
  if (!session || !diceRowEl) return;
  diceRowEl.replaceChildren();
  const total = session.diceValues.length;
  const visibleCount = Math.min(VISIBLE_DICE_MAX, total);
  for (let i = 0; i < visibleCount; i++) {
    diceRowEl.appendChild(createDiceDie(1));
  }
  if (total > VISIBLE_DICE_MAX) {
    diceRowEl.appendChild(createDiceExtraBadge(total - VISIBLE_DICE_MAX));
  }
}

function renderPipsSummary(totalPips: number): void {
  const sec = feverSecFromPips(totalPips);
  if (pipsEl) {
    pipsEl.textContent = localeManager.t('tombstone.step.pips', {
      total: String(totalPips),
      sec: String(sec),
    });
  }
}

function rollDiceAnimation(): Promise<void> {
  return new Promise((resolve) => {
    if (!session || !diceRowEl) {
      resolve();
      return;
    }
    const token = session.animToken;
    const diceEls = [...diceRowEl.querySelectorAll<HTMLElement>('.tombstone-reward__die-face')];
    const visibleCount = Math.min(VISIBLE_DICE_MAX, session.diceValues.length);
    let step = 0;
    const maxSteps = 16;
    const tick = (): void => {
      if (!session || session.animToken !== token) return;
      for (let i = 0; i < session.diceValues.length; i++) {
        const val = 1 + Math.floor(Math.random() * 6);
        session.diceValues[i] = val;
        if (i < visibleCount) {
          const face = diceEls[i];
          if (face) applyDiceFaceStyle(face, val);
          face?.parentElement?.classList.add('tombstone-reward__die--roll');
        }
      }
      step += 1;
      if (step >= maxSteps) {
        for (let i = 0; i < session.diceValues.length; i++) {
          if (i < visibleCount) {
            const face = diceEls[i];
            if (face) applyDiceFaceStyle(face, session.diceValues[i] ?? 1);
            face?.parentElement?.classList.remove('tombstone-reward__die--roll');
            face?.parentElement?.classList.add('tombstone-reward__die--land');
          }
        }
        const totalPips = session.diceValues.reduce((a, b) => a + b, 0);
        renderPipsSummary(totalPips);
        if (continueBtn) continueBtn.disabled = false;
        resolve();
        return;
      }
      setTimeout(tick, 60 + step * 6);
    };
    tick();
  });
}

function beginDiceStep(): void {
  if (!session) return;
  setStep('dice');
  if (continueBtn) continueBtn.disabled = true;
  renderDiceRow();
  if (pipsEl) pipsEl.textContent = '';
  void rollDiceAnimation();
}

function finishModal(): void {
  if (!session || !continueBtn) return;
  const totalPips = session.diceValues.reduce((a, b) => a + b, 0);
  const result = { totalPips };
  const resolve = session.resolve;
  session = null;
  modalEl?.classList.add('hidden');
  domUiBridge.setLayerInteractive(false);
  resolve(result);
}

function bindControls(): void {
  tabPrevBtn?.addEventListener('click', () => {
    if (!session) return;
    session.tabIndex = Math.max(0, session.tabIndex - 1);
    renderTab();
  });
  tabNextBtn?.addEventListener('click', () => {
    if (!session) return;
    session.tabIndex = Math.min(session.records.length - 1, session.tabIndex + 1);
    renderTab();
  });
  infoNextBtn?.addEventListener('click', () => {
    if (!session) return;
    renderRewardStep();
    setStep('reward');
  });
  rewardNextBtn?.addEventListener('click', () => {
    beginDiceStep();
  });
  continueBtn?.addEventListener('click', () => {
    finishModal();
  });
}

export function initTombstoneRewardModal(): void {
  modalEl = el('tombstone-reward-modal');
  stepInfoEl = el('tombstone-step-info');
  stepRewardEl = el('tombstone-step-reward');
  stepDiceEl = el('tombstone-step-dice');
  titleEl = el('tombstone-reward-title');
  messageEl = el('tombstone-reward-message');
  coinEl = el('tombstone-reward-coins');
  countEl = el('tombstone-reward-count');
  tabPrevBtn = el<HTMLButtonElement>('tombstone-reward-tab-prev');
  tabNextBtn = el<HTMLButtonElement>('tombstone-reward-tab-next');
  tabCounterEl = el('tombstone-reward-tab-counter');
  diceRowEl = el('tombstone-reward-dice-row');
  pipsEl = el('tombstone-reward-pips');
  infoNextBtn = el<HTMLButtonElement>('tombstone-step-info-next');
  rewardNextBtn = el<HTMLButtonElement>('tombstone-step-reward-next');
  continueBtn = el<HTMLButtonElement>('tombstone-reward-continue-btn');
  stepDots = [...document.querySelectorAll<HTMLElement>('.tombstone-reward__step-dot')];

  const iconEl = el('tombstone-reward-icon');
  if (iconEl) {
    iconEl.style.backgroundImage = `url(${tombstoneUrl})`;
  }

  bindControls();
}

export function showTombstoneRewardModal(
  records: TombstoneRecord[],
): Promise<TombstoneRewardModalResult> {
  if (!modalEl || !continueBtn || records.length === 0) {
    const totalPips = records.length > 0 ? records.length * 3 : 3;
    return Promise.resolve({ totalPips });
  }

  return new Promise((resolve, reject) => {
    session = {
      records,
      tabIndex: 0,
      step: 'info',
      resolve,
      reject,
      diceValues: records.map(() => 1 + Math.floor(Math.random() * 6)),
      animToken: Date.now(),
    };

    renderTab();
    renderRewardStep();
    setStep('info');
    if (continueBtn) continueBtn.disabled = true;
    domUiBridge.setLayerInteractive(true);
    modalEl!.classList.remove('hidden');
  });
}
