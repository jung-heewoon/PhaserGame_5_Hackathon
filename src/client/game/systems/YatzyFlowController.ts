import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import { isBossChestModalOpen } from '../ui/BossChestModalDom.ts';
import { showYatzyModal } from '../ui/YatzyModalDom.ts';
import { showYatzyTutorial } from '../ui/TutorialModalDom.ts';
import type { HandId } from '../config/WeaponTable.ts';
import type { GameRunState } from './GameRunState.ts';
import { rollFiveDice } from './YatzyHandEvaluator.ts';
import type { RunSession } from './RunSession.ts';
import { tutorialStore } from './TutorialStore.ts';

export class YatzyFlowController {
  private readonly state: GameRunState;
  private readonly session: RunSession;
  private readonly onAfterResume?: () => void;

  constructor(state: GameRunState, session: RunSession, onAfterResume?: () => void) {
    this.state = state;
    this.session = session;
    this.onAfterResume = onAfterResume;
  }

  /** 탄약 고갈 시: 주사위 5+ → 야찌, 미만 → 기본 권총 */
  onAmmoDepleted(): void {
    if (this.isYatzyBlocked()) return;
    if (this.session.ammoDepletionHandled) return;

    if (this.state.snapshot.currentDiceCount >= RUN_GAME_CONFIG.yatzyDiceCost) {
      this.startYatzyRoll();
      return;
    }

    this.state.equipDefaultPistol();
    this.checkDefaultPistolYatzy();
  }

  /** 기본 권총 + 주사위 5개 이상이면 즉시 야찌 */
  checkDefaultPistolYatzy(): void {
    if (this.isYatzyBlocked()) return;
    if (this.session.ammoDepletionHandled) return;
    if (!this.state.isDefaultPistol()) return;
    if (this.state.snapshot.currentDiceCount < RUN_GAME_CONFIG.yatzyDiceCost) return;

    this.startYatzyRoll();
  }

  private isYatzyBlocked(): boolean {
    if (this.session.playerDead) return true;
    if (this.session.isGameplayFrozen) return true;
    if (this.session.pendingBossReward) return true;
    if (isBossChestModalOpen()) return true;
    return false;
  }

  private startYatzyRoll(): void {
    if (this.isYatzyBlocked()) return;
    if (this.session.ammoDepletionHandled) return;

    this.session.ammoDepletionHandled = true;
    this.session.freeze('yatzy');

    this.state.spendDice(RUN_GAME_CONFIG.yatzyDiceCost);
    const rolls = rollFiveDice();

    const modalParams = {
      initialRolls: rolls,
      getDiceBalance: () => this.state.snapshot.currentDiceCount,
      spendDice: (n: number) => this.state.spendDice(n),
      onEquip: (selectedHandId: HandId) => {
        this.state.equipFromHand(selectedHandId);
        this.finishResume();
      },
    };

    if (!tutorialStore.isYatzySeen()) {
      showYatzyTutorial({
        onComplete: () => {
          showYatzyModal(modalParams);
        },
      });
      return;
    }

    showYatzyModal(modalParams);
  }

  private finishResume(): void {
    this.session.unfreeze();
    this.session.ammoDepletionHandled = false;
    this.onAfterResume?.();
  }
}
