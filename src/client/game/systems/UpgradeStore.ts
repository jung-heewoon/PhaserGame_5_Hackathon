import type { WeaponId } from '../config/WeaponTable.ts';
import {
  UPGRADE_CONFIG,
  UPGRADE_STORAGE_KEY,
  WALLET_STORAGE_KEY,
} from '../config/UpgradeConfig.ts';
import {gamePersistence} from '../platform/reddit/RedditPersistence.ts';

type LevelMap = Partial<Record<WeaponId, number>>;

/** 지갑(런 합산 코인) + 총별 강화 레벨 — CrazyGames SDK.data 영속. 싱글턴. */
class UpgradeStoreImpl {
  private coins = 0;
  private levels: LevelMap = {};
  private listeners = new Set<() => void>();

  hydrate(): void {
    this.coins = this.readWallet();
    this.levels = this.readLevels();
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCoins(): number {
    return this.coins;
  }

  /** 런 종료 시 획득 코인 합산 */
  addCoins(amount: number): void {
    if (amount <= 0) return;
    this.coins += amount;
    this.saveWallet();
    this.notify();
  }

  getLevel(weaponId: WeaponId): number {
    return this.levels[weaponId] ?? 0;
  }

  /** 공격력 배율 = 1 + level × step */
  getMultiplier(weaponId: WeaponId): number {
    return 1 + this.getLevel(weaponId) * UPGRADE_CONFIG.multiplierPerLevel;
  }

  /** 다음 레벨 배율 (미리보기용) */
  getNextMultiplier(weaponId: WeaponId): number {
    return 1 + (this.getLevel(weaponId) + 1) * UPGRADE_CONFIG.multiplierPerLevel;
  }

  /** 현재 레벨에서 다음 레벨로 올릴 때 드는 비용 */
  getUpgradeCost(weaponId: WeaponId): number {
    const level = this.getLevel(weaponId);
    const raw = Math.round(UPGRADE_CONFIG.baseCost * UPGRADE_CONFIG.costGrowth ** level);
    return Math.min(raw, UPGRADE_CONFIG.maxCostPerUpgrade);
  }

  canUpgrade(weaponId: WeaponId): boolean {
    return this.coins >= this.getUpgradeCost(weaponId);
  }

  /** 강화: 코인 충분하면 차감 + 레벨++ + 저장 후 true */
  upgrade(weaponId: WeaponId): boolean {
    const cost = this.getUpgradeCost(weaponId);
    if (this.coins < cost) return false;
    this.coins -= cost;
    this.levels[weaponId] = this.getLevel(weaponId) + 1;
    this.saveWallet();
    this.saveLevels();
    this.notify();
    return true;
  }

  /** 기본 데미지에 배율 적용 (소수점 반올림) */
  getEffectiveDamage(baseDamage: number, weaponId: WeaponId): number {
    return Math.round(baseDamage * this.getMultiplier(weaponId));
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  private readWallet(): number {
    try {
      const raw = gamePersistence.getItem(WALLET_STORAGE_KEY);
      const value = raw === null ? 0 : Number.parseInt(raw, 10);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  private saveWallet(): void {
    gamePersistence.setItem(WALLET_STORAGE_KEY, String(this.coins));
  }

  private readLevels(): LevelMap {
    try {
      const raw = gamePersistence.getItem(UPGRADE_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return {};
      const out: LevelMap = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        const level = typeof value === 'number' ? Math.floor(value) : 0;
        if (level > 0) out[key as WeaponId] = level;
      }
      return out;
    } catch {
      return {};
    }
  }

  private saveLevels(): void {
    gamePersistence.setItem(UPGRADE_STORAGE_KEY, JSON.stringify(this.levels));
  }
}

export const upgradeStore = new UpgradeStoreImpl();
