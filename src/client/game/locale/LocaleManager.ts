import type { HandId, WeaponId } from '../config/WeaponTable.ts';
import { LOCALE_STORAGE_KEY } from '../config/GamePersistenceConfig.ts';
import {publicUrl} from '../config/PublicUrl.ts';
import {gamePersistence} from '../platform/reddit/RedditPersistence.ts';
import {parseLocaleCsv} from './CsvParser.ts';

export type LocaleId = 'ko' | 'en';

const LOCALE_URL = publicUrl('locale/strings.csv');

function resolveLocaleFallback(): LocaleId | null {
  const lang = navigator.language?.toLowerCase() ?? '';
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('en')) return 'en';
  return null;
}

type LocaleTable = Map<string, { ko: string; en: string }>;

class LocaleManagerImpl {
  private table: LocaleTable = new Map();
  private locale: LocaleId = 'ko';
  private listeners = new Set<() => void>();
  private loaded = false;
  private hydrated = false;

  async loadFromUrl(url = LOCALE_URL): Promise<void> {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      this.init(text);
    } catch (err) {
      console.warn('[LocaleManager] Failed to load locale CSV:', err);
    }
  }

  init(csvText: string, initial?: LocaleId): void {
    const rows = parseLocaleCsv(csvText);
    this.table = new Map(rows.map((row) => [row.key, { ko: row.ko, en: row.en }]));
    this.loaded = true;

    if (initial) {
      this.locale = initial;
    } else if (!this.hydrated) {
      this.locale = 'ko';
    }
    document.documentElement.lang = this.locale;
  }

  /** persistence hydrate 이후 호출 — 저장값 또는 SDK locale fallback 적용 */
  applyHydratedLocale(): void {
    const stored = this.readStoredLocale();
    const fallback = resolveLocaleFallback();
    this.locale = stored ?? fallback ?? 'ko';
    this.hydrated = true;
    document.documentElement.lang = this.locale;
  }

  get isLoaded(): boolean {
    return this.loaded;
  }

  getLocale(): LocaleId {
    return this.locale;
  }

  setLocale(id: LocaleId): void {
    if (this.locale === id) return;
    this.locale = id;
    document.documentElement.lang = id;
    gamePersistence.setItem(LOCALE_STORAGE_KEY, id);
    this.notify();
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  t(key: string, params?: Record<string, string>): string {
    const entry = this.table.get(key);
    let value: string;
    if (!entry) {
      value = `[${key}]`;
    } else {
      value = entry[this.locale] || entry.ko || entry.en || `[${key}]`;
    }

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replaceAll(`{${k}}`, v);
      }
    }
    return value;
  }

  getHandLabel(handId: HandId): string {
    return this.t(`hand.${handId}`);
  }

  getWeaponLabel(weaponId: WeaponId): string {
    return this.t(`weapon.${weaponId}`);
  }

  private readStoredLocale(): LocaleId | null {
    try {
      const v = gamePersistence.getItem(LOCALE_STORAGE_KEY);
      if (v === 'ko' || v === 'en') return v;
    } catch {
      /* ignore */
    }
    return null;
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}

export const localeManager = new LocaleManagerImpl();
