import '@game/style.css'
import '@game/ui/boot-curtain.css'
import '@game/ui/doom-ui.css'
import '@game/ui/gun-view.css'
import '@game/ui/boss-warning.css'
import '@game/ui/boss-chest-modal.css'
import '@game/ui/coin-hud.css'
import '@game/ui/pickup-fly.css'
import '@game/ui/upgrade-modal.css'
import '@game/ui/yatzy-modal.css'
import '@game/ui/mobile-controls.css'
import '@game/ui/tutorial-modal.css'
import '@game/ui/tombstone-reward.css'
import '@game/ui/weekly-defense.css'
import {
  applyViewportLayout,
  bindViewportLayout,
} from '@game/core/applyViewportLayout.ts'
import {bootstrapGame} from '@game/core/bootstrapGame.ts'
import {patchPhaserScaleForCssRotate} from '@game/core/patchPhaserScaleForCssRotate.ts'
import {applyLocaleDom} from '@game/locale/applyLocaleDom.ts'
import {localeManager} from '@game/locale/LocaleManager.ts'
import {
  installBrowserGuards,
  setBrowserGuardGame,
} from '@game/platform/reddit/browserGuards.ts'
import {redditLifecycle} from '@game/platform/reddit/RedditLifecycle.ts'
import {gamePersistence} from '@game/platform/reddit/RedditPersistence.ts'
import {weeklyDefenseClient} from '@game/platform/reddit/WeeklyDefenseClient.ts'
import {weeklyDefenseBootState} from '@game/systems/WeeklyDefenseBootState.ts'
import {bgmManager} from '@game/systems/BgmManager.ts'
import {highScoreStore} from '@game/systems/HighScoreStore.ts'
import {sfxManager} from '@game/systems/SfxManager.ts'
import {upgradeStore} from '@game/systems/UpgradeStore.ts'
import {initBossChestModal} from '@game/ui/BossChestModalDom.ts'
import {initBossWarning} from '@game/ui/BossWarningDom.ts'
import {initCoinHud} from '@game/ui/CoinHudDom.ts'
import {domUiBridge} from '@game/ui/DomUiBridge.ts'
import {initHeartHud} from '@game/ui/HeartHudDom.ts'
import {bindHudViewportSync} from '@game/ui/HudViewportSync.ts'
import {mobileControls} from '@game/ui/MobileControlsDom.ts'
import {initPickupFly} from '@game/ui/PickupFlyDom.ts'
import {initPlayerDamageFlash} from '@game/ui/PlayerDamageFlashDom.ts'
import {initDiceHud} from '@game/ui/RunHudDom.ts'
import {initTombstoneRewardModal} from '@game/ui/TombstoneRewardModalDom.ts'
import {initUpgradeModal} from '@game/ui/UpgradeModalDom.ts'
import {initWeeklyDefenseGameOver} from '@game/ui/WeeklyDefenseGameOverDom.ts'

async function main(): Promise<void> {
  installBrowserGuards()
  applyViewportLayout()
  bindViewportLayout()
  await gamePersistence.hydrate()
  try {
    const status = await weeklyDefenseClient.fetchStatus()
    weeklyDefenseBootState.set(status)
  } catch (err) {
    console.warn('weekly-defense status fetch failed', err)
  }
  redditLifecycle.loadingStart()

  upgradeStore.hydrate()
  highScoreStore.hydrate()
  bgmManager.hydrate()
  sfxManager.hydrate()

  await localeManager.loadFromUrl()
  localeManager.applyHydratedLocale()
  applyLocaleDom()

  initHeartHud()
  initDiceHud()
  initPlayerDamageFlash()
  initBossWarning()
  initBossChestModal()
  initCoinHud()
  initPickupFly()
  initUpgradeModal()
  initTombstoneRewardModal()
  initWeeklyDefenseGameOver()
  mobileControls.init()
  domUiBridge.init()

  const mount = document.querySelector<HTMLDivElement>('#app')
  if (!mount) {
    throw new Error('#app container not found')
  }

  const game = bootstrapGame(mount)
  setBrowserGuardGame(game)
  // CSS rotate AABB가 Scale.FIT을 축소하지 않도록 parent 측정 패치
  patchPhaserScaleForCssRotate(game)
  bindHudViewportSync(game)
}

void main()
