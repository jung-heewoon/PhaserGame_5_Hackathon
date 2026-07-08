import type GameState from 'twopointfive-phaser-3/src/twopointfive/game.ts';
import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import type { ImageInfo } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import type { EnemyCatalog } from '../assets/EnemyAssets.ts';
import type { BossCatalog } from '../assets/BossAssets.ts';
import type { BossEffectImages } from '../assets/BossEffectAssets.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import DicePickupEntity from '../entities/DicePickupEntity.ts';
import HeartPickupEntity from '../entities/HeartPickupEntity.ts';
import BulletPickupEntity from '../entities/BulletPickupEntity.ts';
import DamageNumberEntity from '../entities/DamageNumberEntity.ts';
import EnemyEntity, { type EnemySpawnParams } from '../entities/EnemyEntity.ts';
import BossEntity, { type BossSpawnParams } from '../entities/BossEntity.ts';
import FireObstacleEntity from '../entities/FireObstacleEntity.ts';
import GuardianSpikeEntity from '../entities/GuardianSpikeEntity.ts';
import GuardianVolleyEntity, {
  type GuardianVolleySpawnParams,
} from '../entities/GuardianVolleyEntity.ts';
import BringerBeamSlotEntity, {
  type BringerBeamMode,
} from '../entities/BringerBeamSlotEntity.ts';
import HitEffectEntity from '../entities/HitEffectEntity.ts';
import WeaponExplosionEntity from '../entities/WeaponExplosionEntity.ts';
import ProjectileEntity from '../entities/ProjectileEntity.ts';
import BeamFlashEntity from '../entities/BeamFlashEntity.ts';
import type { GameRunState } from './GameRunState.ts';
import type { HitEffectVfx } from './HitEffectVfx.ts';
import type { WeaponExplosionVfx } from './WeaponExplosionVfx.ts';
import type { BeamFlashPool } from './BeamFlashPool.ts';
import type { ProjectilePool } from './ProjectilePool.ts';
import HomingMissileEntity from '../entities/HomingMissileEntity.ts';
import type { HomingMissilePool } from './HomingMissilePool.ts';
import type { DamageNumberVfx } from './DamageNumberVfx.ts';
import type { RunSession } from './RunSession.ts';
import type { PickupKind } from '../config/PickupFlyConfig.ts';

const STASH_X = -9999;
const STASH_Y = -9999;

export class EntityPool {
  private dicePool: DicePickupEntity[] = [];
  private heartPool: HeartPickupEntity[] = [];
  private bulletPool: BulletPickupEntity[] = [];
  private enemyPool: EnemyEntity[] = [];
  private bossPool: BossEntity[] = [];
  private firePool: FireObstacleEntity[] = [];
  private spikePool: GuardianSpikeEntity[] = [];
  private volleyPool: GuardianVolleyEntity[] = [];
  private beamPool: BringerBeamSlotEntity[] = [];
  private gs: GameState | null = null;
  private session: RunSession | null = null;
  private gameRunState: GameRunState | null = null;
  private diceImage: ImageInfo | null = null;
  private heartImage: ImageInfo | null = null;
  private bulletImage: ImageInfo | null = null;
  private enemyCatalog: EnemyCatalog | null = null;
  private bossCatalog: BossCatalog | null = null;
  private fireImage: ImageInfo | null = null;
  private bossEffectImages: BossEffectImages | null = null;
  private damageNumberVfx: DamageNumberVfx | null = null;
  private hitEffectVfx: HitEffectVfx | null = null;
  private weaponExplosionVfx: WeaponExplosionVfx | null = null;
  private projectilePool: ProjectilePool | null = null;
  private homingMissilePool: HomingMissilePool | null = null;
  private beamFlashPool: BeamFlashPool | null = null;
  private onEnemyKill: ((x: number, y: number, z: number) => void) | null = null;
  private onPickup: ((kind: PickupKind, x: number, y: number, z: number) => void) | null = null;

  dispose(): void {
    this.hitEffectVfx?.releaseAll();
    this.weaponExplosionVfx?.releaseAll();
    this.dicePool = [];
    this.heartPool = [];
    this.bulletPool = [];
    this.enemyPool = [];
    this.bossPool = [];
    this.firePool = [];
    this.spikePool = [];
    this.beamPool = [];
    this.gs = null;
    this.session = null;
    this.gameRunState = null;
    this.diceImage = null;
    this.heartImage = null;
    this.bulletImage = null;
    this.enemyCatalog = null;
    this.bossCatalog = null;
    this.fireImage = null;
    this.bossEffectImages = null;
    this.damageNumberVfx = null;
    this.hitEffectVfx = null;
    this.weaponExplosionVfx = null;
    this.projectilePool = null;
    this.homingMissilePool = null;
    this.beamFlashPool = null;
    this.onEnemyKill = null;
    this.onPickup = null;
  }

  setOnEnemyKill(callback: ((x: number, y: number, z: number) => void) | null): void {
    this.onEnemyKill = callback;
  }

  setOnPickup(
    callback: ((kind: PickupKind, x: number, y: number, z: number) => void) | null,
  ): void {
    this.onPickup = callback;
  }

  /** 픽업 성공 시에만 호출 (스크롤 정리 despawn 과 구분) */
  notifyPickup(kind: PickupKind, x: number, y: number, z: number): void {
    this.onPickup?.(kind, x, y, z);
  }

  setProjectilePools(
    projectilePool: ProjectilePool,
    homingMissilePool: HomingMissilePool,
    beamFlashPool: BeamFlashPool,
  ): void {
    this.projectilePool = projectilePool;
    this.homingMissilePool = homingMissilePool;
    this.beamFlashPool = beamFlashPool;
  }

  warmUp(
    gs: GameState,
    session: RunSession,
    gameRunState: GameRunState,
    diceImage: ImageInfo | null,
    heartImage: ImageInfo | null,
    bulletImage: ImageInfo | null,
    enemyCatalog: EnemyCatalog,
    damageNumberVfx: DamageNumberVfx,
    hitEffectVfx: HitEffectVfx,
    weaponExplosionVfx: WeaponExplosionVfx,
    bossCatalog?: BossCatalog | null,
    fireImage?: ImageInfo | null,
    bossEffectImages?: BossEffectImages | null,
  ): void {
    this.gs = gs;
    this.session = session;
    this.gameRunState = gameRunState;
    this.diceImage = diceImage;
    this.heartImage = heartImage;
    this.bulletImage = bulletImage;
    this.enemyCatalog = enemyCatalog;
    this.bossCatalog = bossCatalog ?? null;
    this.fireImage = fireImage ?? null;
    this.bossEffectImages = bossEffectImages ?? null;
    this.damageNumberVfx = damageNumberVfx;
    this.hitEffectVfx = hitEffectVfx;
    this.weaponExplosionVfx = weaponExplosionVfx;

    const poolSettings = { entityPool: this, session, gameRunState, hitEffectVfx };

    for (let i = 0; i < RUN_GAME_CONFIG.entityPoolSize; i++) {
      const dice = gs.spawnEntity(DicePickupEntity, STASH_X, STASH_Y, {
        ...poolSettings,
        pickupImage: diceImage,
      }) as DicePickupEntity;
      this.releaseDice(dice);

      const enemy = gs.spawnEntity(EnemyEntity, STASH_X, STASH_Y, {
        ...poolSettings,
        enemyCatalog,
        damageNumberVfx,
        session,
        moveSpeed: 90,
      }) as EnemyEntity;
      this.releaseEnemy(enemy);
    }

    for (let i = 0; i < RUN_GAME_CONFIG.heartPickupPoolSize; i++) {
      const heart = gs.spawnEntity(HeartPickupEntity, STASH_X, STASH_Y, {
        entityPool: this,
        pickupImage: heartImage,
        session,
      }) as HeartPickupEntity;
      this.releaseHeart(heart);
    }

    for (let i = 0; i < RUN_GAME_CONFIG.bulletPickupPoolSize; i++) {
      const bullet = gs.spawnEntity(BulletPickupEntity, STASH_X, STASH_Y, {
        entityPool: this,
        pickupImage: bulletImage,
        gameRunState,
        session,
      }) as BulletPickupEntity;
      this.releaseBullet(bullet);
    }

    if (this.bossCatalog) {
      for (let i = 0; i < RUN_GAME_CONFIG.bossPoolSize; i++) {
        const boss = gs.spawnEntity(BossEntity, STASH_X, STASH_Y, {
          ...poolSettings,
          bossCatalog: this.bossCatalog,
          damageNumberVfx,
          hitEffectVfx,
          session,
        }) as BossEntity;
        this.releaseBoss(boss);
      }
    }

    if (this.fireImage) {
      for (let i = 0; i < RUN_GAME_CONFIG.fireObstaclePoolSize; i++) {
        const fire = gs.spawnEntity(FireObstacleEntity, STASH_X, STASH_Y, {
          entityPool: this,
          fireImage: this.fireImage,
          session,
        }) as FireObstacleEntity;
        this.releaseFire(fire);
      }
    }

    if (this.bossEffectImages) {
      for (let i = 0; i < RUN_GAME_CONFIG.guardianVolleyPoolSize; i++) {
        const volley = gs.spawnEntity(GuardianVolleyEntity, STASH_X, STASH_Y, {
          entityPool: this,
          session,
        }) as GuardianVolleyEntity;
        this.releaseGuardianVolley(volley);
      }
      for (let i = 0; i < RUN_GAME_CONFIG.guardianSpikePoolSize; i++) {
        const spike = gs.spawnEntity(GuardianSpikeEntity, STASH_X, STASH_Y, {
          entityPool: this,
          spikeImage: this.bossEffectImages.guardianSkill,
          session,
        }) as GuardianSpikeEntity;
        this.releaseGuardianSpike(spike);
      }
      for (let i = 0; i < RUN_GAME_CONFIG.bringerBeamPoolSize; i++) {
        const beam = gs.spawnEntity(BringerBeamSlotEntity, STASH_X, STASH_Y, {
          entityPool: this,
          beamImage: this.bossEffectImages.bringerSkill,
          session,
        }) as BringerBeamSlotEntity;
        this.releaseBringerBeam(beam);
      }
    }
  }

  releaseDice(ent: DicePickupEntity): void {
    if (this.dicePool.includes(ent)) return;
    this.deactivate(ent);
    this.dicePool.push(ent);
  }

  releaseHeart(ent: HeartPickupEntity): void {
    if (this.heartPool.includes(ent)) return;
    this.deactivate(ent);
    this.heartPool.push(ent);
  }

  releaseBullet(ent: BulletPickupEntity): void {
    if (this.bulletPool.includes(ent)) return;
    this.deactivate(ent);
    this.bulletPool.push(ent);
  }

  releaseEnemy(ent: EnemyEntity, fromPlayerKill = false): void {
    if (ent instanceof BossEntity) {
      this.releaseBoss(ent);
      return;
    }
    if (this.enemyPool.includes(ent)) return;
    if (fromPlayerKill) {
      this.onEnemyKill?.(ent.pos.x + ent.size.x / 2, ent.pos.y + ent.size.y / 2, ent.pos.z);
    }
    this.deactivate(ent);
    this.enemyPool.push(ent);
  }

  releaseBoss(ent: BossEntity): void {
    if (this.bossPool.includes(ent)) return;
    this.deactivateBoss(ent);
    this.bossPool.push(ent);
  }

  releaseFire(ent: FireObstacleEntity): void {
    if (this.firePool.includes(ent)) return;
    this.deactivateFire(ent);
    this.firePool.push(ent);
  }

  releaseAllFire(): void {
    if (!this.gs) return;
    for (const ent of this.gs.entities) {
      if (ent instanceof FireObstacleEntity && !ent._killed) {
        this.releaseFire(ent);
      }
    }
  }

  releaseGuardianVolley(ent: GuardianVolleyEntity): void {
    if (this.volleyPool.includes(ent)) return;
    this.deactivateGuardianVolley(ent);
    this.volleyPool.push(ent);
  }

  releaseAllGuardianVolleys(): void {
    if (!this.gs) return;
    const volleys = this.gs.entities.filter(
      (e): e is GuardianVolleyEntity => e instanceof GuardianVolleyEntity && e.isVolleyActive(),
    );
    for (const ent of volleys) {
      this.releaseGuardianVolley(ent);
    }
  }

  releaseGuardianSpike(ent: GuardianSpikeEntity): void {
    if (this.spikePool.includes(ent)) return;
    this.deactivateGuardianSpike(ent);
    this.spikePool.push(ent);
  }

  releaseBringerBeam(ent: BringerBeamSlotEntity): void {
    if (this.beamPool.includes(ent)) return;
    this.deactivateBringerBeam(ent);
    this.beamPool.push(ent);
  }

  releaseAllGuardianSpikes(): void {
    if (!this.gs) return;
    for (const ent of this.gs.entities) {
      if (ent instanceof GuardianSpikeEntity && !ent._killed) {
        this.releaseGuardianSpike(ent);
      }
    }
  }

  releaseAllBringerBeams(): void {
    if (!this.gs) return;
    for (const ent of this.gs.entities) {
      if (ent instanceof BringerBeamSlotEntity && !ent._killed) {
        this.releaseBringerBeam(ent);
      }
    }
  }

  releaseAllBossEffects(): void {
    this.releaseAllFire();
    this.releaseAllGuardianVolleys();
    this.releaseAllGuardianSpikes();
    this.releaseAllBringerBeams();
  }

  releaseDamageNumber(ent: DamageNumberEntity): void {
    this.damageNumberVfx?.release(ent);
  }

  releaseHitEffect(fx: HitEffectEntity): void {
    this.hitEffectVfx?.release(fx);
  }

  releaseWeaponExplosion(fx: WeaponExplosionEntity): void {
    this.weaponExplosionVfx?.release(fx);
  }

  releaseProjectile(proj: ProjectileEntity): void {
    this.projectilePool?.release(proj);
  }

  releaseHomingMissile(missile: HomingMissileEntity): void {
    this.homingMissilePool?.release(missile);
  }

  releaseBeamFlash(fx: BeamFlashEntity): void {
    this.beamFlashPool?.release(fx);
  }

  acquireDice(x: number, y: number): DicePickupEntity | null {
    const ent = this.dicePool.pop();
    if (!ent) return this.spawnDiceFallback(x, y);
    return this.activateDice(ent, x, y);
  }

  acquireHeart(x: number, y: number): HeartPickupEntity | null {
    const ent = this.heartPool.pop();
    if (!ent) return this.spawnHeartFallback(x, y);
    return this.activateHeart(ent, x, y);
  }

  acquireBullet(x: number, y: number): BulletPickupEntity | null {
    const ent = this.bulletPool.pop();
    if (!ent) return this.spawnBulletFallback(x, y);
    return this.activateBullet(ent, x, y);
  }

  acquireEnemy(x: number, y: number, spawn: EnemySpawnParams): EnemyEntity | null {
    const ent = this.enemyPool.pop();
    if (!ent) return this.spawnEnemyFallback(x, y, spawn);
    return this.activateEnemy(ent, x, y, spawn);
  }

  acquireBoss(
    x: number,
    y: number,
    spawn: BossSpawnParams & { onBossDefeated?: () => void; onBossDeathStart?: () => void },
  ): BossEntity | null {
    const ent = this.bossPool.pop();
    if (!ent) return this.spawnBossFallback(x, y, spawn);
    return this.activateBoss(ent, x, y, spawn);
  }

  acquireFire(x: number, y: number, opts?: { telegraph?: boolean }): FireObstacleEntity | null {
    const ent = this.firePool.pop();
    if (!ent) return this.spawnFireFallback(x, y, opts);
    return this.activateFire(ent, x, y, opts);
  }

  acquireGuardianVolley(params: GuardianVolleySpawnParams): GuardianVolleyEntity | null {
    const ent = this.volleyPool.pop();
    if (!ent) return this.spawnGuardianVolleyFallback(params);
    return this.activateGuardianVolley(ent, params);
  }

  acquireGuardianSpikeSlot(x: number, y: number): GuardianSpikeEntity | null {
    const ent = this.spikePool.pop();
    if (!ent) return this.spawnGuardianSpikeSlotFallback(x, y);
    return this.activateGuardianSpikeSlot(ent, x, y);
  }

  acquireBringerBeam(
    x: number,
    y: number,
    params: { mode: BringerBeamMode },
  ): BringerBeamSlotEntity | null {
    const ent = this.beamPool.pop();
    if (!ent) return this.spawnBringerBeamFallback(x, y, params);
    return this.activateBringerBeam(ent, x, y, params);
  }

  private deactivate(
    ent: DicePickupEntity | HeartPickupEntity | BulletPickupEntity | EnemyEntity,
  ): void {
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.pos.x = STASH_X;
    ent.pos.y = STASH_Y;
    ent.pos.z = 0;
    ent.last.x = STASH_X;
    ent.last.y = STASH_Y;
    ent.checkAgainst = TPFEntity.TYPE.NONE;
    ent.type = TPFEntity.TYPE.NONE;
    ent.collides = TPFEntity.COLLIDES.NEVER;
    ent._killed = true;
    ent.remove();
    ent.updateQuad();
  }

  private deactivateBoss(ent: BossEntity): void {
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.pos.x = STASH_X;
    ent.pos.y = STASH_Y;
    ent.pos.z = 0;
    ent.last.x = STASH_X;
    ent.last.y = STASH_Y;
    ent.checkAgainst = TPFEntity.TYPE.NONE;
    ent.type = TPFEntity.TYPE.NONE;
    ent.collides = TPFEntity.COLLIDES.NEVER;
    ent._killed = true;
    ent.remove();
    ent.updateQuad();
  }

  private deactivateFire(ent: FireObstacleEntity): void {
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.pos.x = STASH_X;
    ent.pos.y = STASH_Y;
    ent.pos.z = 0;
    ent.last.x = STASH_X;
    ent.last.y = STASH_Y;
    ent.checkAgainst = TPFEntity.TYPE.NONE;
    ent.type = TPFEntity.TYPE.NONE;
    ent.collides = TPFEntity.COLLIDES.NEVER;
    ent._killed = true;
    ent.remove();
    ent.updateQuad();
  }

  private deactivateGuardianVolley(ent: GuardianVolleyEntity): void {
    ent.abortVolley();
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.pos.x = STASH_X;
    ent.pos.y = STASH_Y;
    ent.pos.z = 0;
    ent.last.x = STASH_X;
    ent.last.y = STASH_Y;
    ent.checkAgainst = TPFEntity.TYPE.NONE;
    ent.type = TPFEntity.TYPE.NONE;
    ent.collides = TPFEntity.COLLIDES.NEVER;
    ent._killed = true;
    ent.remove();
  }

  private deactivateGuardianSpike(ent: GuardianSpikeEntity): void {
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.pos.x = STASH_X;
    ent.pos.y = STASH_Y;
    ent.pos.z = 0;
    ent.last.x = STASH_X;
    ent.last.y = STASH_Y;
    ent.checkAgainst = TPFEntity.TYPE.NONE;
    ent.type = TPFEntity.TYPE.NONE;
    ent.collides = TPFEntity.COLLIDES.NEVER;
    ent._killed = true;
    ent.remove();
    ent.updateQuad();
  }

  private deactivateBringerBeam(ent: BringerBeamSlotEntity): void {
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.pos.x = STASH_X;
    ent.pos.y = STASH_Y;
    ent.pos.z = 0;
    ent.last.x = STASH_X;
    ent.last.y = STASH_Y;
    ent.checkAgainst = TPFEntity.TYPE.NONE;
    ent.type = TPFEntity.TYPE.NONE;
    ent.collides = TPFEntity.COLLIDES.NEVER;
    ent._killed = true;
    ent.remove();
    ent.updateQuad();
  }

  private ensureInGameState(ent: TPFEntity): void {
    if (!this.gs) return;
    if (!this.gs.entities.includes(ent)) {
      this.gs.entities.push(ent);
    }
  }

  private activateDice(ent: DicePickupEntity, x: number, y: number): DicePickupEntity {
    ent._killed = false;
    ent.checkAgainst = TPFEntity.TYPE.A;
    ent.type = TPFEntity.TYPE.NONE;
    ent.collides = TPFEntity.COLLIDES.NEVER;
    ent.pos.x = x;
    ent.pos.y = y;
    ent.pos.z = 0;
    ent.last.x = x;
    ent.last.y = y;
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.init(x, y, null);
    ent.updateQuad();
    this.ensureInGameState(ent);
    if (ent.context.culledSectors) {
      ent.context.culledSectors.moveEntity(ent);
    }
    return ent;
  }

  private activateHeart(ent: HeartPickupEntity, x: number, y: number): HeartPickupEntity {
    ent._killed = false;
    ent.checkAgainst = TPFEntity.TYPE.A;
    ent.type = TPFEntity.TYPE.NONE;
    ent.collides = TPFEntity.COLLIDES.NEVER;
    ent.pos.x = x;
    ent.pos.y = y;
    ent.pos.z = 0;
    ent.last.x = x;
    ent.last.y = y;
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.init(x, y, null);
    ent.updateQuad();
    this.ensureInGameState(ent);
    if (ent.context.culledSectors) {
      ent.context.culledSectors.moveEntity(ent);
    }
    return ent;
  }

  private activateBullet(ent: BulletPickupEntity, x: number, y: number): BulletPickupEntity {
    ent._killed = false;
    ent.checkAgainst = TPFEntity.TYPE.A;
    ent.type = TPFEntity.TYPE.NONE;
    ent.collides = TPFEntity.COLLIDES.NEVER;
    ent.pos.x = x;
    ent.pos.y = y;
    ent.pos.z = 0;
    ent.last.x = x;
    ent.last.y = y;
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.init(x, y, null);
    ent.updateQuad();
    this.ensureInGameState(ent);
    if (ent.context.culledSectors) {
      ent.context.culledSectors.moveEntity(ent);
    }
    return ent;
  }

  private activateEnemy(ent: EnemyEntity, x: number, y: number, spawn: EnemySpawnParams): EnemyEntity {
    ent._killed = false;
    ent.type = TPFEntity.TYPE.B;
    ent.checkAgainst = TPFEntity.TYPE.A;
    ent.collides = TPFEntity.COLLIDES.LITE;
    ent.pos.x = x;
    ent.pos.y = y;
    ent.pos.z = 0;
    ent.last.x = x;
    ent.last.y = y;
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.setMoveSpeed(spawn.moveSpeed);
    ent.init(x, y, {
      typeId: spawn.typeId,
      health: spawn.health,
      moveSpeed: spawn.moveSpeed,
      moveProfile: spawn.moveProfile,
    });
    ent.updateQuad();
    this.ensureInGameState(ent);
    if (ent.context.culledSectors) {
      ent.context.culledSectors.moveEntity(ent);
    }
    return ent;
  }

  private activateBoss(
    ent: BossEntity,
    x: number,
    y: number,
    spawn: BossSpawnParams & { onBossDefeated?: () => void; onBossDeathStart?: () => void },
  ): BossEntity {
    ent._killed = false;
    ent.type = TPFEntity.TYPE.B;
    ent.checkAgainst = TPFEntity.TYPE.A;
    ent.collides = TPFEntity.COLLIDES.LITE;
    ent.pos.x = x;
    ent.pos.y = y;
    ent.pos.z = 0;
    ent.last.x = x;
    ent.last.y = y;
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.init(x, y, {
      bossType: spawn.bossType,
      health: spawn.health,
      onBossDefeated: spawn.onBossDefeated,
      onBossDeathStart: spawn.onBossDeathStart,
      damageNumberVfx: this.damageNumberVfx,
      hitEffectVfx: this.hitEffectVfx,
      entityPool: this,
    });
    ent.updateQuad();
    this.ensureInGameState(ent);
    if (ent.context.culledSectors) {
      ent.context.culledSectors.moveEntity(ent);
    }
    return ent;
  }

  private activateFire(
    ent: FireObstacleEntity,
    x: number,
    y: number,
    opts?: { telegraph?: boolean },
  ): FireObstacleEntity {
    ent._killed = false;
    ent.pos.x = x;
    ent.pos.y = y;
    ent.pos.z = 0;
    ent.last.x = x;
    ent.last.y = y;
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.init(x, y, { telegraphOnly: opts?.telegraph === true });
    ent.updateQuad();
    this.ensureInGameState(ent);
    if (ent.context.culledSectors) {
      ent.context.culledSectors.moveEntity(ent);
    }
    return ent;
  }

  private spawnDiceFallback(x: number, y: number): DicePickupEntity | null {
    if (!this.gs || !this.session || !this.gameRunState) return null;
    const ent = this.gs.spawnEntity(DicePickupEntity, x, y, {
      entityPool: this,
      pickupImage: this.diceImage,
      gameRunState: this.gameRunState,
      session: this.session,
    });
    return ent as DicePickupEntity;
  }

  private spawnHeartFallback(x: number, y: number): HeartPickupEntity | null {
    if (!this.gs || !this.session) return null;
    const ent = this.gs.spawnEntity(HeartPickupEntity, x, y, {
      entityPool: this,
      pickupImage: this.heartImage,
      session: this.session,
    });
    return ent as HeartPickupEntity;
  }

  private spawnBulletFallback(x: number, y: number): BulletPickupEntity | null {
    if (!this.gs || !this.session || !this.gameRunState) return null;
    const ent = this.gs.spawnEntity(BulletPickupEntity, x, y, {
      entityPool: this,
      pickupImage: this.bulletImage,
      gameRunState: this.gameRunState,
      session: this.session,
    });
    return ent as BulletPickupEntity;
  }

  private spawnEnemyFallback(x: number, y: number, spawn: EnemySpawnParams): EnemyEntity | null {
    if (!this.gs || !this.session || !this.enemyCatalog || !this.damageNumberVfx || !this.hitEffectVfx) return null;
    const ent = this.gs.spawnEntity(EnemyEntity, x, y, {
      entityPool: this,
      enemyCatalog: this.enemyCatalog,
      damageNumberVfx: this.damageNumberVfx,
      hitEffectVfx: this.hitEffectVfx,
      moveSpeed: spawn.moveSpeed,
      session: this.session,
      typeId: spawn.typeId,
      health: spawn.health,
      moveProfile: spawn.moveProfile,
    });
    return ent as EnemyEntity;
  }

  private spawnBossFallback(
    x: number,
    y: number,
    spawn: BossSpawnParams & { onBossDefeated?: () => void; onBossDeathStart?: () => void },
  ): BossEntity | null {
    if (!this.gs || !this.session || !this.bossCatalog || !this.damageNumberVfx || !this.hitEffectVfx) {
      return null;
    }
    const ent = this.gs.spawnEntity(BossEntity, x, y, {
      entityPool: this,
      bossCatalog: this.bossCatalog,
      damageNumberVfx: this.damageNumberVfx,
      hitEffectVfx: this.hitEffectVfx,
      session: this.session,
      bossType: spawn.bossType,
      health: spawn.health,
      onBossDefeated: spawn.onBossDefeated,
      onBossDeathStart: spawn.onBossDeathStart,
    });
    return ent as BossEntity;
  }

  private spawnFireFallback(
    x: number,
    y: number,
    opts?: { telegraph?: boolean },
  ): FireObstacleEntity | null {
    if (!this.gs || !this.session || !this.fireImage) return null;
    const ent = this.gs.spawnEntity(FireObstacleEntity, x, y, {
      entityPool: this,
      fireImage: this.fireImage,
      session: this.session,
    });
    return this.activateFire(ent as FireObstacleEntity, x, y, opts);
  }

  private activateGuardianVolley(
    ent: GuardianVolleyEntity,
    params: GuardianVolleySpawnParams,
  ): GuardianVolleyEntity {
    ent._killed = false;
    ent.type = TPFEntity.TYPE.NONE;
    ent.checkAgainst = TPFEntity.TYPE.NONE;
    ent.collides = TPFEntity.COLLIDES.NEVER;
    ent.pos.x = params.pathStartCx;
    ent.pos.y = params.pathStartCy;
    ent.pos.z = 0;
    ent.last.x = params.pathStartCx;
    ent.last.y = params.pathStartCy;
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.configureVolley(params);
    this.ensureInGameState(ent);
    if (ent.context.culledSectors) {
      ent.context.culledSectors.moveEntity(ent);
    }
    return ent;
  }

  private activateGuardianSpikeSlot(
    ent: GuardianSpikeEntity,
    x: number,
    y: number,
  ): GuardianSpikeEntity {
    ent._killed = false;
    ent.type = TPFEntity.TYPE.B;
    ent.checkAgainst = TPFEntity.TYPE.NONE;
    ent.collides = TPFEntity.COLLIDES.NEVER;
    ent.activateSlot(x, y);
    this.ensureInGameState(ent);
    return ent;
  }

  private spawnGuardianVolleyFallback(
    params: GuardianVolleySpawnParams,
  ): GuardianVolleyEntity | null {
    if (!this.gs || !this.session) return null;
    const ent = this.gs.spawnEntity(GuardianVolleyEntity, STASH_X, STASH_Y, {
      entityPool: this,
      session: this.session,
    });
    return this.activateGuardianVolley(ent as GuardianVolleyEntity, params);
  }

  private spawnGuardianSpikeSlotFallback(x: number, y: number): GuardianSpikeEntity | null {
    if (!this.gs || !this.session || !this.bossEffectImages) return null;
    const ent = this.gs.spawnEntity(GuardianSpikeEntity, x, y, {
      entityPool: this,
      spikeImage: this.bossEffectImages.guardianSkill,
      session: this.session,
    });
    return this.activateGuardianSpikeSlot(ent as GuardianSpikeEntity, x, y);
  }

  private activateBringerBeam(
    ent: BringerBeamSlotEntity,
    x: number,
    y: number,
    params: { mode: BringerBeamMode },
  ): BringerBeamSlotEntity {
    ent._killed = false;
    ent.type = TPFEntity.TYPE.B;
    ent.checkAgainst = TPFEntity.TYPE.A;
    ent.collides = TPFEntity.COLLIDES.LITE;
    ent.pos.x = x;
    ent.pos.y = y;
    ent.pos.z = 0;
    ent.last.x = x;
    ent.last.y = y;
    ent.vel.x = 0;
    ent.vel.y = 0;
    ent.vel.z = 0;
    ent.init(x, y, { mode: params.mode });
    ent.updateQuad();
    this.ensureInGameState(ent);
    if (ent.context.culledSectors) {
      ent.context.culledSectors.moveEntity(ent);
    }
    return ent;
  }

  private spawnBringerBeamFallback(
    x: number,
    y: number,
    params: { mode: BringerBeamMode },
  ): BringerBeamSlotEntity | null {
    if (!this.gs || !this.session || !this.bossEffectImages) return null;
    const ent = this.gs.spawnEntity(BringerBeamSlotEntity, x, y, {
      entityPool: this,
      beamImage: this.bossEffectImages.bringerSkill,
      session: this.session,
      mode: params.mode,
    });
    return ent as BringerBeamSlotEntity;
  }
}
