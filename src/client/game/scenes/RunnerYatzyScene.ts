/**
 * Yatzy Runner — 2.5D 질주 + 주사위 파밍 코어 루프 씬.
 */
import Phaser from 'phaser';
import EntityVoid from 'twopointfive-phaser-3/src/game/tpf/entity-void.ts';
import {
  TwoPointFivePlugin,
  type TwoPointFiveScenePlugin,
} from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import type TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import type { EntityContext, ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import { buildEnemyCatalog, preloadEnemySprites, type EnemyCatalog } from '../assets/EnemyAssets.ts';
import { buildBossCatalog, preloadBossSprites } from '../assets/BossAssets.ts';
import {
  buildBossEffectImages,
  preloadBossEffects,
} from '../assets/BossEffectAssets.ts';
import { buildFireObstacleImage, preloadFireObstacle } from '../assets/FireObstacleAssets.ts';
import {
  buildBulletPickupImage,
  preloadBulletPickup,
} from '../assets/BulletPickupAssets.ts';
import {
  buildHeartPickupImage,
  preloadHeartPickup,
} from '../assets/HeartPickupAssets.ts';
import {
  buildTombstonePickupImage,
  preloadTombstonePickup,
} from '../assets/TombstonePickupAssets.ts';
import { buildHitEffectCatalog, preloadHitEffects } from '../assets/HitEffectAssets.ts';
import {
  buildWeaponExplosionCatalog,
  preloadWeaponExplosions,
} from '../assets/WeaponExplosionAssets.ts';
import { buildBeamFlashCatalog, buildProjectileCatalog } from '../assets/ProjectileAssets.ts';
import { preloadGameSounds } from '../assets/SoundAssets.ts';
import { buildRunnerCorridorLevel } from '../assets/buildRunnerCorridorLevel.ts';
import { registerProceduralTextures } from '../assets/ProceduralTextures.ts';
import {
  buildDicePickupImage,
  DICE_PICKUP_TEXTURE_KEY,
  preloadDicePickup,
} from '../assets/DiceAssets.ts';
import { DICE_SPRITE_CONFIG } from '../config/DiceSpriteConfig.ts';
import { WORLD_LIGHTS } from '../config/WorldTileConfig.ts';
import { raiseCorridorCeiling, refreshWorldSectorMeshes } from '../systems/CorridorCeilingRaise.ts';
import { DomeLightAnimator } from '../systems/DomeLightAnimator.ts';
import BeamFlashEntity from '../entities/BeamFlashEntity.ts';
import DicePickupEntity from '../entities/DicePickupEntity.ts';
import HeartPickupEntity from '../entities/HeartPickupEntity.ts';
import BulletPickupEntity from '../entities/BulletPickupEntity.ts';
import TombstonePickupEntity from '../entities/TombstonePickupEntity.ts';
import EnemyEntity from '../entities/EnemyEntity.ts';
import BossEntity from '../entities/BossEntity.ts';
import FireObstacleEntity from '../entities/FireObstacleEntity.ts';
import GuardianSpikeEntity from '../entities/GuardianSpikeEntity.ts';
import GuardianVolleyEntity from '../entities/GuardianVolleyEntity.ts';
import BringerBeamSlotEntity from '../entities/BringerBeamSlotEntity.ts';
import HitEffectEntity from '../entities/HitEffectEntity.ts';
import DamageNumberEntity from '../entities/DamageNumberEntity.ts';
import ProjectileEntity from '../entities/ProjectileEntity.ts';
import HomingMissileEntity from '../entities/HomingMissileEntity.ts';
import WeaponExplosionEntity from '../entities/WeaponExplosionEntity.ts';
import RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import { applyRunnerFog } from '../systems/LayeredFog.ts';
import { CombatSystem } from '../systems/CombatSystem.ts';
import { ComboScoreSystem } from '../systems/ComboScoreSystem.ts';
import { BeamFlashPool } from '../systems/BeamFlashPool.ts';
import { EntityPool } from '../systems/EntityPool.ts';
import { GameRunState } from '../systems/GameRunState.ts';
import { InstantWeaponHandler } from '../systems/InstantWeaponHandler.ts';
import { ProjectilePool } from '../systems/ProjectilePool.ts';
import { HomingMissilePool } from '../systems/HomingMissilePool.ts';
import { RunSession } from '../systems/RunSession.ts';
import { SpawnDirector } from '../systems/SpawnDirector.ts';
import { BossDirector } from '../systems/BossDirector.ts';
import { HitEffectVfx } from '../systems/HitEffectVfx.ts';
import { DamageNumberVfx } from '../systems/DamageNumberVfx.ts';
import { WeaponExplosionVfx } from '../systems/WeaponExplosionVfx.ts';
import { WeaponFireSystem } from '../systems/WeaponFireSystem.ts';
import { NuclearLaunchSequence } from '../systems/NuclearLaunchSequence.ts';
import { WorldScroller } from '../systems/WorldScroller.ts';
import { TombstoneDirector } from '../systems/TombstoneDirector.ts';
import { TombstonePickupFlow, pickDeathReasonForRun } from '../systems/TombstonePickupFlow.ts';
import { feverTimeSystem } from '../systems/FeverTimeSystem.ts';
import { highScoreStore } from '../systems/HighScoreStore.ts';
import { tombstoneClient } from '../platform/reddit/TombstoneClient.ts';
import { clearTombstoneLabels, syncTombstoneLabels } from '../ui/TombstoneLabelDom.ts';
import { YatzyFlowController } from '../systems/YatzyFlowController.ts';
import { domUiBridge } from '../ui/DomUiBridge.ts';
import { updateStatusHud } from '../ui/RunHudDom.ts';
import { gunViewDom } from '../ui/GunViewDom.ts';
import { mobileControls } from '../ui/MobileControlsDom.ts';
import { initSettingsModal, forceHideSettingsModal } from '../ui/SettingsModalDom.ts';
import {
  forceHideTutorialModal,
  initTutorialModal,
  tryStartIntroTutorial,
} from '../ui/TutorialModalDom.ts';
import { initComboHud, playComboSettlement, resetComboHud } from '../ui/ComboHudDom.ts';
import { showGameOverModal } from '../ui/GameOverModalDom.ts';
import { clearDamageToasts, initDamageToastLayer } from '../ui/DamageToastDom.ts';
import { CoinSystem } from '../systems/CoinSystem.ts';
import { upgradeStore } from '../systems/UpgradeStore.ts';
import { initCoinHud, resetCoinHud, spawnCoinBurst, releaseBossChestCoinsToHud } from '../ui/CoinHudDom.ts';
import { forceHideBossChestModal, isBossChestModalOpen, showBossChestModal } from '../ui/BossChestModalDom.ts';
import { dismissYatzyModal, isYatzyModalOpen } from '../ui/YatzyModalDom.ts';
import {
  initPickupFly,
  releaseBossChestDiceToHud,
  resetPickupFly,
  setDiceSprite,
  spawnPickupFly,
} from '../ui/PickupFlyDom.ts';
import type { PickupKind } from '../config/PickupFlyConfig.ts';
import { projectQuadCenterToHud } from '../ui/WorldUiProjection.ts';
import { initFrozenOverlay, hideFrozenOverlay } from '../ui/FrozenStatusDom.ts';
import { GAME_DESIGN_HEIGHT, GAME_DESIGN_WIDTH } from '../config/GameDisplayConfig.ts';
import { publicUrl } from '../config/PublicUrl.ts';
import { sfxManager } from '../systems/SfxManager.ts';
import { bgmManager } from '../systems/BgmManager.ts';
import {redditLifecycle} from '../platform/reddit/RedditLifecycle.ts';
import { dismissBootCurtain } from '../ui/BootCurtainDom.ts';

export const twoPointFiveGlobalPlugin = TwoPointFivePlugin;

export class RunnerYatzyScene extends Phaser.Scene {
  declare tpf: TwoPointFiveScenePlugin;

  private readonly runState = new GameRunState();
  private readonly session = new RunSession();
  private readonly entityPool = new EntityPool();
  private readonly comboScore = new ComboScoreSystem(this.session);
  private readonly coinSystem = new CoinSystem();
  private player: RunnerPlayerEntity | null = null;
  private spawnDirector: SpawnDirector | null = null;
  private bossDirector: BossDirector | null = null;
  private worldScroller: WorldScroller | null = null;
  private tombstoneDirector: TombstoneDirector | null = null;
  private tombstonePickupFlow: TombstonePickupFlow | null = null;
  private combat: CombatSystem | null = null;
  private yatzyFlow: YatzyFlowController | null = null;
  private diceImage: ImageInfo | null = null;
  private heartImage: ImageInfo | null = null;
  private bulletImage: ImageInfo | null = null;
  private tombstoneImage: ImageInfo | null = null;
  private enemyCatalog: EnemyCatalog | null = null;
  private hitEffectVfx = new HitEffectVfx();
  private damageNumberVfx = new DamageNumberVfx();
  private weaponExplosionVfx = new WeaponExplosionVfx();
  private projectilePool = new ProjectilePool();
  private homingMissilePool = new HomingMissilePool();
  private beamFlashPool = new BeamFlashPool();
  private instantWeaponHandler: InstantWeaponHandler | null = null;
  private weaponFireSystem: WeaponFireSystem | null = null;
  private nuclearLaunchSequence = new NuclearLaunchSequence();
  private readonly domeLightAnimator = new DomeLightAnimator();

  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private contextSyncAccumulatorMs = 0;

  constructor() {
    super({ key: 'RunnerYatzyScene' });
  }

  preload(): void {
    this.load.image('tpf-tiles', publicUrl('media/tiles/basic-tiles-64.png'));
    this.load.image('tpf-lights', publicUrl('media/tiles/lights-64.png'));
    preloadEnemySprites(this);
    preloadBossSprites(this);
    preloadBossEffects(this);
    preloadFireObstacle(this);
    preloadDicePickup(this);
    preloadHeartPickup(this);
    preloadBulletPickup(this);
    preloadTombstonePickup(this);
    preloadHitEffects(this);
    preloadWeaponExplosions(this);
    preloadGameSounds(this);
  }

  create(): void {
    redditLifecycle.clearGameContext();
    this.contextSyncAccumulatorMs = 0;
    sfxManager.init(this);
    bgmManager.init(this);
    this.runState.reset();
    this.session.reset();
    this.entityPool.dispose();
    this.hitEffectVfx.dispose();
    this.damageNumberVfx.dispose();
    this.weaponExplosionVfx.dispose();
    this.domeLightAnimator.dispose();
    this.projectilePool.dispose();
    this.homingMissilePool.dispose();
    this.beamFlashPool.dispose();
    resetComboHud();
    this.comboScore.reset();
    this.coinSystem.reset();
    feverTimeSystem.reset();
    this.runState.setFeverInfiniteAmmo(false);
    clearTombstoneLabels();
    gunViewDom.init();

    initComboHud();
    initCoinHud();
    resetCoinHud();
    forceHideBossChestModal();
    initPickupFly();
    resetPickupFly();
    initSettingsModal(this.session);
    initTutorialModal(this.session);
    initDamageToastLayer();
    initFrozenOverlay();
    clearDamageToasts();
    hideFrozenOverlay();

    this.comboScore.onSettle = (amount) => {
      if (amount <= 0) {
        this.comboScore.onSettlementComplete();
        return;
      }
      playComboSettlement(amount, () => {
        this.session.addScore(amount);
        if (this.player) {
          updateStatusHud({
            score: this.session.survivalScore,
            health: this.player.health,
            maxHealth: RUN_GAME_CONFIG.playerMaxHealth,
          });
        }
        this.comboScore.onSettlementComplete();
      });
    };

    const tpf = this.tpf;
    if (!tpf.getRenderer()) {
      this.time.delayedCall(100, () => this.scene.restart());
      return;
    }

    registerProceduralTextures(this);

    const tilesetKey = 'media/tiles/basic-tiles-64.png';
    const lightsKey = 'media/tiles/lights-64.png';
    tpf.setTileset(tilesetKey, this.textures.get('tpf-tiles'));
    tpf.setTileset(lightsKey, this.textures.get('tpf-lights'));

    const lightsTexture = this.textures.get('tpf-lights');
    const lightsSource = lightsTexture.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null;
    if (lightsSource) {
      const canvas = document.createElement('canvas');
      canvas.width = lightsSource.width;
      canvas.height = lightsSource.height;
      const ctx2d = canvas.getContext('2d');
      if (ctx2d) {
        ctx2d.drawImage(lightsSource, 0, 0);
        tpf.setLightMapPixels(lightsKey, ctx2d.getImageData(0, 0, canvas.width, canvas.height));
      }
    }

    this.diceImage = buildDicePickupImage(tpf, this);
    this.registerDiceFlySprite();
    this.heartImage = buildHeartPickupImage(tpf, this);
    this.bulletImage = buildBulletPickupImage(tpf, this);
    this.tombstoneImage = buildTombstonePickupImage(tpf, this);
    this.enemyCatalog = buildEnemyCatalog(tpf, this);
    const bossCatalog = buildBossCatalog(tpf, this);
    const bossEffectImages = buildBossEffectImages(tpf, this);
    const fireImage = buildFireObstacleImage(tpf, this);

    const entityCtx = (Cls: new (...args: never[]) => TPFEntity) =>
      Cls as unknown as new (
        x: number,
        y: number,
        settings: Record<string, unknown>,
        context: EntityContext,
      ) => TPFEntity;

    tpf.registerEntityClass('EntityVoid', entityCtx(EntityVoid));
    tpf.registerEntityClass('RunnerPlayer', entityCtx(RunnerPlayerEntity));
    tpf.registerEntityClass('DicePickup', entityCtx(DicePickupEntity));
    tpf.registerEntityClass('HeartPickup', entityCtx(HeartPickupEntity));
    tpf.registerEntityClass('BulletPickup', entityCtx(BulletPickupEntity));
    tpf.registerEntityClass('TombstonePickup', entityCtx(TombstonePickupEntity));
    tpf.registerEntityClass('Enemy', entityCtx(EnemyEntity));
    tpf.registerEntityClass('Boss', entityCtx(BossEntity));
    tpf.registerEntityClass('FireObstacle', entityCtx(FireObstacleEntity));
    tpf.registerEntityClass('GuardianSpike', entityCtx(GuardianSpikeEntity));
    tpf.registerEntityClass('GuardianVolley', entityCtx(GuardianVolleyEntity));
    tpf.registerEntityClass('BringerBeam', entityCtx(BringerBeamSlotEntity));
    tpf.registerEntityClass('HitEffect', entityCtx(HitEffectEntity));
    tpf.registerEntityClass('DamageNumber', entityCtx(DamageNumberEntity));
    tpf.registerEntityClass('Projectile', entityCtx(ProjectileEntity));
    tpf.registerEntityClass('HomingMissile', entityCtx(HomingMissileEntity));
    tpf.registerEntityClass('WeaponExplosion', entityCtx(WeaponExplosionEntity));
    tpf.registerEntityClass('BeamFlash', entityCtx(BeamFlashEntity));

    const levelData = buildRunnerCorridorLevel();
    const info = levelData.entities?.find((e) => e.settings?.name === 'info');
    if (info?.settings?.sectorSize != null) {
      tpf.sectorSize = info.settings.sectorSize as number;
    }

    const playerEntry = levelData.entities?.find((e) => e.type === 'RunnerPlayer');
    if (playerEntry) {
      playerEntry.settings = { ...playerEntry.settings, session: this.session };
    }

    tpf.loadLevel(levelData);
    raiseCorridorCeiling(tpf.getGameState());

    const lightLayer = levelData.layer?.find((l) => l.name === 'light');
    const lightPixels = tpf.lightMapPixels[WORLD_LIGHTS.path];
    if (lightLayer?.data && lightPixels) {
      this.domeLightAnimator.bindLightLayer(
        lightLayer.data,
        lightPixels,
        WORLD_LIGHTS.tilePx,
      );
      const gsAfterLight = tpf.getGameState();
      if (gsAfterLight) {
        this.domeLightAnimator.applyInitialTheme(gsAfterLight);
        refreshWorldSectorMeshes(gsAfterLight);
      }
    }

    applyRunnerFog(tpf);

    const gs = tpf.getGameState();
    if (gs && this.enemyCatalog) {
      const hitEffectCatalog = buildHitEffectCatalog(tpf, this);
      const weaponExplosionCatalog = buildWeaponExplosionCatalog(tpf, this);
      const projectileCatalog = buildProjectileCatalog(tpf, this);
      const beamFlashCatalog = buildBeamFlashCatalog(tpf, this);

      if (hitEffectCatalog) {
        this.hitEffectVfx.warmUp(gs, hitEffectCatalog);
      }

      this.damageNumberVfx.warmUp(gs, tpf, this, this.session);

      if (weaponExplosionCatalog) {
        this.weaponExplosionVfx.warmUp(gs, weaponExplosionCatalog);
      }

      this.instantWeaponHandler = new InstantWeaponHandler(
        this,
        this.beamFlashPool,
        this.weaponExplosionVfx,
      );

      if (beamFlashCatalog) {
        this.beamFlashPool.warmUp(gs, beamFlashCatalog);
      }

      if (projectileCatalog && this.instantWeaponHandler) {
        this.projectilePool.setOnDualFire((side) => gunViewDom.flashDualSide(side));
        this.projectilePool.warmUp(
          gs,
          projectileCatalog,
          this.session,
          this.instantWeaponHandler,
          () => this.getCombatTargets(),
        );
        this.homingMissilePool.warmUp(
          gs,
          projectileCatalog,
          this.session,
          this.instantWeaponHandler,
          () => this.getCombatTargets(),
        );
      }

      this.entityPool.setProjectilePools(
        this.projectilePool,
        this.homingMissilePool,
        this.beamFlashPool,
      );

      this.entityPool.warmUp(
        gs,
        this.session,
        this.runState,
        this.diceImage,
        this.heartImage,
        this.bulletImage,
        this.enemyCatalog,
        this.damageNumberVfx,
        this.hitEffectVfx,
        this.weaponExplosionVfx,
        bossCatalog,
        fireImage,
        bossEffectImages,
        this.tombstoneImage,
      );
      this.entityPool.setOnEnemyKill((x, y, z) => {
        sfxManager.playMonsterDie();
        this.session.addKill();
        this.comboScore.onEnemyKill();
        this.awardCoinsForKill(x, y, z);
      });
      this.entityPool.setOnPickup((kind) => {
        this.flyPickupToHud(kind);
      });
    }

    this.player =
      (gs?.entities.find((e) => e instanceof RunnerPlayerEntity) as RunnerPlayerEntity | undefined) ?? null;

    const kb = this.input.keyboard;
    if (kb) {
      this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyLeft = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.keyRight = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    }

    domUiBridge.bindState(this.runState);
    this.yatzyFlow = new YatzyFlowController(this.runState, this.session, () => {
      this.tryOpenPendingBossReward();
    });
    this.runState.onChange(() => {
      if (this.session.playerDead) return;
      this.yatzyFlow?.checkDefaultPistolYatzy();
    });

    this.bossDirector = new BossDirector(
      () => this.player,
      this.session,
      this.entityPool,
      () => {
        const gs = this.tpf.getGameState();
        const player = this.player;
        if (gs && player) {
          this.domeLightAnimator.rerollTheme(gs, player.pos.y);
        }
        this.spawnDirector?.onBossClear();
      },
      (bossType) => {
        bgmManager.startBoss(bossType);
      },
      () => {
        sfxManager.playBossDie();
      },
      () => {
        bgmManager.playBossOutro(() => this.onBossReward());
      },
    );

    this.spawnDirector = new SpawnDirector(
      () => this.player,
      this.session,
      this.runState,
      this.entityPool,
      () => this.bossDirector?.enemySpawnBlocked ?? false,
    );

    this.worldScroller = new WorldScroller(
      () => tpf.getGameState(),
      () => this.player,
      this.session,
      this.entityPool,
    );

    this.tombstoneDirector = new TombstoneDirector(
      () => this.player,
      () => tpf.getGameState(),
      this.session,
      this.entityPool,
    );
    void this.tombstoneDirector.hydrate();

    this.tombstonePickupFlow = new TombstonePickupFlow(
      this.session,
      this.tombstoneDirector,
      this.coinSystem,
      this.runState,
    );
    this.entityPool.setOnTombstonePickup((ent) => {
      void this.tombstonePickupFlow?.onPickup(ent);
    });

    feverTimeSystem.setOnChange((active, warn, blinkOn) => {
      gunViewDom.setFeverVisual(active, warn, blinkOn);
      if (!active) {
        this.runState.setFeverInfiniteAmmo(false);
      }
    });

    this.weaponFireSystem = new WeaponFireSystem(
      this.projectilePool,
      this.homingMissilePool,
      this.instantWeaponHandler ??
        new InstantWeaponHandler(this, this.beamFlashPool, this.weaponExplosionVfx),
      this.nuclearLaunchSequence,
      gunViewDom,
    );

    this.nuclearLaunchSequence.setOnComplete(() => {
      this.combat?.onNuclearSequenceComplete();
    });

    this.combat = new CombatSystem(
      this,
      this.runState,
      this.yatzyFlow,
      this.session,
      this.weaponFireSystem,
      gunViewDom,
      () => this.player,
      () => this.getCombatTargets(),
    );

    this.session.onPlayerDeath = () => {
      dismissYatzyModal();
      forceHideBossChestModal();
      forceHideSettingsModal();
      forceHideTutorialModal();
      sfxManager.stopBossSuccess();
      redditLifecycle.clearGameContext();
      bgmManager.enterGameOverSting();
      sfxManager.playGameOver(() => {
        if (this.session.freezeReason === 'dead') {
          bgmManager.startPostGameOverLoop();
        }
      });
      this.comboScore.flushOnDeath();
      const { highScore, isNewRecord } = highScoreStore.tryUpdate(this.session.survivalScore);
      if (isNewRecord) {
        void tombstoneClient
          .upsertOnDeath({
            score: this.session.survivalScore,
            triggerMs: this.session.runElapsedMs,
            coinsAtDeath: this.coinSystem.coins,
            deathReasonId: pickDeathReasonForRun(),
          })
          .catch((err) => console.warn('tombstone upsert failed', err));
      }
      if (this.player) {
        updateStatusHud({
          score: this.session.survivalScore,
          health: this.player.health,
          maxHealth: RUN_GAME_CONFIG.playerMaxHealth,
        });
      }
      // 이번 런에서 모은 코인을 영속 지갑에 합산 (사망당 1회)
      upgradeStore.addCoins(this.coinSystem.coins);
      showGameOverModal(
        {
          score: this.session.survivalScore,
          coins: this.coinSystem.coins,
          kills: this.session.enemyKills,
          elapsedMs: this.session.runElapsedMs,
          highScore,
          isNewRecord,
        },
        () => {
          this.scene.restart();
        },
      );
    };

    tpf.createExtern(() => {
      const renderer = tpf.getRenderer();
      const hudCamera = tpf.getHudCamera();
      if (!renderer || !hudCamera) return;
      renderer.setCamera(hudCamera);
    });

    tryStartIntroTutorial(() => {
      dismissBootCurtain();
      redditLifecycle.notifyLoadingComplete();
      redditLifecycle.notifyRunStart();
    });
  }

  /** 처치 보상: 코인 총량 선반영 + 사망 위치 → HUD로 빨려드는 연출 */
  private awardCoinsForKill(cx: number, cy: number, cz: number): void {
    const amount = this.coinSystem.rollDropAmount(this.session.runElapsedMs);
    if (amount <= 0) return;

    const camera = this.tpf.getCamera();
    if (!camera) {
      spawnCoinBurst(GAME_DESIGN_WIDTH / 2, GAME_DESIGN_HEIGHT / 2, amount);
      return;
    }

    const hud = projectQuadCenterToHud(cx, cy, cz + 24, RUN_GAME_CONFIG.tileSize, 12, camera);
    spawnCoinBurst(hud.x, hud.y, amount);
  }

  /** 보스 클리어 상자 보상 팝업 — 야찌 팝업과 겹치면 지연 */
  private onBossReward(): void {
    if (this.session.playerDead) return;
    if (isYatzyModalOpen() || this.session.freezeReason === 'yatzy') {
      this.session.pendingBossReward = true;
      return;
    }
    this.openBossChestReward();
  }

  private tryOpenPendingBossReward(): void {
    if (this.session.playerDead) return;
    if (!this.session.pendingBossReward) return;
    if (isYatzyModalOpen()) return;
    if (this.session.isGameplayFrozen) return;
    this.session.pendingBossReward = false;
    this.openBossChestReward();
  }

  private openBossChestReward(): void {
    if (this.session.playerDead) return;
    if (isBossChestModalOpen()) return;
    this.session.freeze('bossReward');
    redditLifecycle.happytime('bossClear');
    sfxManager.playBossSuccess();
    showBossChestModal({
      onClose: (result) => {
        sfxManager.stopBossSuccess();
        if (result.rewardKind === 'gold') {
          this.coinSystem.addAmount(result.amount);
          releaseBossChestCoinsToHud();
        } else {
          this.runState.addDice(result.amount);
          releaseBossChestDiceToHud();
        }
        bgmManager.resumeCombatLoop();
        this.session.unfreeze();
        this.bossDirector?.completeBossReward();
        if (this.runState.isAmmoDepleted()) {
          this.yatzyFlow?.onAmmoDepleted();
        }
      },
    });
  }

  /** 야찌 주사위 면 시트의 5눈금 프레임을 잘라 DOM fly용 dataURL 로 주입 */
  private registerDiceFlySprite(): void {
    const tex = this.textures.get(DICE_PICKUP_TEXTURE_KEY);
    if (!tex || tex.key === '__MISSING') return;
    const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null;
    if (!src) return;
    const fw = DICE_SPRITE_CONFIG.faceDragging.frameW;
    const fh = DICE_SPRITE_CONFIG.faceDragging.frameH;
    const frame = DICE_SPRITE_CONFIG.pickupFaceFrame;
    const canvas = document.createElement('canvas');
    canvas.width = fw;
    canvas.height = fh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, frame * fw, 0, fw, fh, 0, 0, fw, fh);
    setDiceSprite(canvas.toDataURL());
  }

  /** 픽업 획득 → 화면 중앙에서 생성되어 종류별 HUD 로 날아가는 연출 */
  private flyPickupToHud(kind: PickupKind): void {
    spawnPickupFly(kind, GAME_DESIGN_WIDTH / 2, GAME_DESIGN_HEIGHT / 2);
  }

  private getCombatTargets(): EnemyEntity[] {
    const gs = this.tpf.getGameState();
    if (!gs) return [];
    return gs.entities.filter(
      (e): e is EnemyEntity =>
        (e instanceof EnemyEntity || e instanceof BossEntity) && !e._killed,
    );
  }

  update(_time: number, delta: number): void {
    const dt = this.session.clampFrameDeltaMs(delta);
    this.session.beginFrame();

    const playerAlive = Boolean(this.player && !this.player.isDead);

    mobileControls.setVisible(!this.session.isGameplayFrozen && playerAlive);

    if (this.player && !this.session.isGameplayFrozen) {
      const frozen = this.player.isFrozen;
      const left =
        !frozen &&
        (this.keyA?.isDown || this.keyLeft?.isDown || mobileControls.left || false);
      const right =
        !frozen &&
        (this.keyD?.isDown || this.keyRight?.isDown || mobileControls.right || false);
      this.player.setStrafe(left, right);
      this.session.runDistance += RUN_GAME_CONFIG.forwardSpeed * (dt / 1000);

      let strafeDir: -1 | 0 | 1 = 0;
      if (!frozen) {
        if (left && !right) strafeDir = -1;
        else if (right && !left) strafeDir = 1;
      }

      gunViewDom.updateMotion(dt, {
        strafeDir,
        walking: playerAlive,
      });
    } else {
      gunViewDom.updateMotion(dt, { strafeDir: 0, walking: false });
    }

    this.session.tickRunProgress(dt, playerAlive);

    bgmManager.syncDuck(this.session.freezeReason);

    if (this.session.isGameplayFrozen) {
      sfxManager.stopMinigunLoop();
    }

    this.comboScore.tick(dt, this.session.isGameplayFrozen);

    feverTimeSystem.tick(dt);

    if (this.player) {
      updateStatusHud({
        score: this.session.survivalScore,
        health: this.player.health,
        maxHealth: RUN_GAME_CONFIG.playerMaxHealth,
      });
    }

    if (!this.session.isGameplayFrozen) {
      this.worldScroller?.update();
      this.bossDirector?.tick(dt);
      this.spawnDirector?.update(dt);
      this.tombstoneDirector?.update();
      this.tombstonePickupFlow?.tryPending(this.player?.pos.y ?? 0);
      this.combat?.update(dt);
    } else if (this.session.freezeReason === 'dead') {
      this.syncDeadCamera();
    }

    this.domeLightAnimator.update(this.tpf, this.player?.pos.y ?? 0, this.session);

    this.syncGameContext(dt);

    gunViewDom.flushMotionDom();

    // 야찌 UI freeze 중에도 VFX(뉴클리어 폭발 등)는 tpf.update로 재생
    this.tpf.update(dt);

    const cam = this.tpf.getCamera();
    const gs = this.tpf.getGameState();
    if (cam && gs) {
      syncTombstoneLabels(cam, gs.entities);
    }
  }

  private syncDeadCamera(): void {
    if (!this.player) return;
    const cam = this.tpf.getCamera();
    if (!cam) return;
    cam.setPosition(this.player.pos.x + this.player.size.x / 2, this.player.pos.y + this.player.size.y / 2, 0);
    cam.setRotation(0, 0, this.player.fixedAngle);
    const gs = this.tpf.getGameState();
    if (gs) syncTombstoneLabels(cam, gs.entities);
  }

  private syncGameContext(deltaMs: number): void {
    if (this.session.isGameplayFrozen) return;

    this.contextSyncAccumulatorMs += deltaMs;
    if (this.contextSyncAccumulatorMs < 2000) return;
    this.contextSyncAccumulatorMs = 0;

    const weapon = this.runState.snapshot.currentWeapon;
    redditLifecycle.setGameContext({
      score: this.session.survivalScore,
      weapon,
      coins: this.coinSystem.coins,
      elapsedSec: Math.floor(this.session.runElapsedMs / 1000),
    });
  }
}
