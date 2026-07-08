import {
  getEntryByHand,
  getEntryByWeapon,
  type HandId,
  type HandWeaponEntry,
  type WeaponId,
} from '../config/WeaponTable.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';

export type GameRunSnapshot = {
  currentDiceCount: number;
  currentWeapon: WeaponId;
  currentAmmo: number;
  isInfiniteAmmo: boolean;
};

type ChangeListener = (snapshot: GameRunSnapshot) => void;

export class GameRunState {
  private _diceCount: number;
  private _weaponId: WeaponId;
  private _ammo: number;
  private _listeners = new Set<ChangeListener>();

  constructor() {
    this._diceCount = RUN_GAME_CONFIG.initialDiceCount;
    this._weaponId = 'DEFAULT_PISTOL';
    this._ammo = 0;
  }

  get snapshot(): GameRunSnapshot {
    const entry = getEntryByWeapon(this._weaponId);
    const infinite = entry.maxAmmo === null;
    return {
      currentDiceCount: this._diceCount,
      currentWeapon: this._weaponId,
      currentAmmo: infinite ? 0 : this._ammo,
      isInfiniteAmmo: infinite,
    };
  }

  get weaponEntry(): HandWeaponEntry {
    return getEntryByWeapon(this._weaponId);
  }

  onChange(listener: ChangeListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private notify(): void {
    const snap = this.snapshot;
    for (const l of this._listeners) l(snap);
  }

  addDice(amount = 1): void {
    this._diceCount += amount;
    this.notify();
  }

  spendDice(amount: number): boolean {
    if (this._diceCount < amount) return false;
    this._diceCount -= amount;
    this.notify();
    return true;
  }

  equipFromHand(handId: HandId): void {
    const entry = getEntryByHand(handId);
    this._weaponId = entry.weaponId;
    this._ammo = entry.maxAmmo ?? 0;
    this.notify();
  }

  equipDefaultPistol(): void {
    this.equipFromHand('NONE');
  }

  isDefaultPistol(): boolean {
    return this._weaponId === 'DEFAULT_PISTOL';
  }

  canFire(): boolean {
    const entry = this.weaponEntry;
    if (entry.maxAmmo === null) return true;
    return this._ammo > 0;
  }

  consumeAmmo(): boolean {
    const entry = this.weaponEntry;
    if (entry.maxAmmo === null) return true;
    if (this._ammo <= 0) return false;
    this._ammo -= 1;
    this.notify();
    return true;
  }

  /** 유한 탄창 무기 탄약 전량 보충 — 이미 가득·무한 탄창이면 false */
  refillAmmo(): boolean {
    const entry = this.weaponEntry;
    if (entry.maxAmmo === null) return false;
    if (this._ammo >= entry.maxAmmo) return false;
    this._ammo = entry.maxAmmo;
    this.notify();
    return true;
  }

  isAmmoDepleted(): boolean {
    const entry = this.weaponEntry;
    if (entry.maxAmmo === null) return false;
    return this._ammo <= 0;
  }

  reset(): void {
    this._diceCount = RUN_GAME_CONFIG.initialDiceCount;
    this.equipDefaultPistol();
  }
}
