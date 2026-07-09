import type { TombstoneRecord } from '../../../shared/tombstone.ts';
import { localeManager } from '../locale/LocaleManager.ts';
import { domUiBridge } from './DomUiBridge.ts';

export interface TombstoneRewardModalResult {
  totalPips: number;
}

interface ActiveSession {
  records: TombstoneRecord[];
  tabIndex: number;
  resolve: (result: TombstoneRewardModalResult) => void;
  reject: (err: Error) => void;
  diceValues: number[];
  animToken: number;
}

let modalEl: HTMLElement | null = null;
let messageEl: HTMLElement | null = null;
let coinEl: HTMLElement | null = null;
let tabPrevBtn: HTMLButtonElement | null = null;
let tabNextBtn: HTMLButtonElement | null = null;
let tabCounterEl: HTMLElement | null = null;
let diceRowEl: HTMLElement | null = null;
let continueBtn: HTMLButtonElement | null = null;

let session: ActiveSession | null = null;

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function deathReasonText(reasonId: number): string {
  const key = `tombstone.death.${String(reasonId).padStart(2, '0')}`;
  return localeManager.t(key);
}

function formatDeathMessage(record: TombstoneRecord): string {
  const reason = deathReasonText(record.deathReasonId);
  return localeManager.t('tombstone.message', {
    user: record.username,
    score: record.score.toLocaleString(),
    reason,
  });
}

function totalCoinPreview(records: TombstoneRecord[]): number {
  return records.reduce((sum, r) => sum + Math.floor(r.coinsAtDeath * 0.1), 0);
}

function renderTab(): void {
  if (!session || !messageEl || !tabCounterEl) return;
  const record = session.records[session.tabIndex];
  if (!record) return;
  messageEl.textContent = formatDeathMessage(record);
  tabCounterEl.textContent = localeManager.t('tombstone.tab', {
    current: String(session.tabIndex + 1),
    total: String(session.records.length),
  });
  if (tabPrevBtn) tabPrevBtn.disabled = session.tabIndex <= 0;
  if (tabNextBtn) tabNextBtn.disabled = session.tabIndex >= session.records.length - 1;
}

function renderDice(): void {
  if (!session || !diceRowEl) return;
  diceRowEl.innerHTML = '';
  for (let i = 0; i < session.diceValues.length; i++) {
    const die = document.createElement('div');
    die.className = 'tombstone-reward__die';
    die.dataset.value = String(session.diceValues[i] ?? 1);
    die.textContent = '?';
    diceRowEl.appendChild(die);
  }
}

function rollDiceAnimation(): Promise<void> {
  return new Promise((resolve) => {
    if (!session || !diceRowEl) {
      resolve();
      return;
    }
    const token = session.animToken;
    const diceEls = [...diceRowEl.querySelectorAll<HTMLElement>('.tombstone-reward__die')];
    let step = 0;
    const maxSteps = 14;
    const tick = (): void => {
      if (!session || session.animToken !== token) return;
      for (let i = 0; i < session.diceValues.length; i++) {
        const val = 1 + Math.floor(Math.random() * 6);
        session.diceValues[i] = val;
        const el = diceEls[i];
        if (el) el.textContent = String(val);
      }
      step += 1;
      if (step >= maxSteps) {
        for (let i = 0; i < session.diceValues.length; i++) {
          const el = diceEls[i];
          if (el) el.textContent = String(session.diceValues[i] ?? 1);
        }
        resolve();
        return;
      }
      setTimeout(tick, 70 + step * 8);
    };
    tick();
  });
}

function bindControls(): void {
  if (!tabPrevBtn || !tabNextBtn || !continueBtn) return;

  tabPrevBtn.onclick = () => {
    if (!session) return;
    session.tabIndex = Math.max(0, session.tabIndex - 1);
    renderTab();
  };
  tabNextBtn.onclick = () => {
    if (!session) return;
    session.tabIndex = Math.min(session.records.length - 1, session.tabIndex + 1);
    renderTab();
  };
  continueBtn.onclick = async () => {
    if (!session) return;
    continueBtn!.disabled = true;
    await rollDiceAnimation();
    const totalPips = session.diceValues.reduce((a, b) => a + b, 0);
    const result = { totalPips };
    const resolve = session.resolve;
    session = null;
    modalEl?.classList.add('hidden');
    domUiBridge.setLayerInteractive(false);
    resolve(result);
  };
}

export function initTombstoneRewardModal(): void {
  modalEl = el('tombstone-reward-modal');
  messageEl = el('tombstone-reward-message');
  coinEl = el('tombstone-reward-coins');
  tabPrevBtn = el<HTMLButtonElement>('tombstone-reward-tab-prev');
  tabNextBtn = el<HTMLButtonElement>('tombstone-reward-tab-next');
  tabCounterEl = el('tombstone-reward-tab-counter');
  diceRowEl = el('tombstone-reward-dice-row');
  continueBtn = el<HTMLButtonElement>('tombstone-reward-continue-btn');
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
      resolve,
      reject,
      diceValues: records.map(() => 1 + Math.floor(Math.random() * 6)),
      animToken: Date.now(),
    };

    if (coinEl) {
      coinEl.textContent = localeManager.t('tombstone.coins', {
        amount: String(totalCoinPreview(records)),
      });
    }

    renderTab();
    renderDice();
    continueBtn!.disabled = false;
    domUiBridge.setLayerInteractive(true);
    modalEl!.classList.remove('hidden');
  });
}
