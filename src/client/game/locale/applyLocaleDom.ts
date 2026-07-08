import { localeManager } from './LocaleManager.ts';

/** Apply locale strings to static DOM elements marked with data-i18n attributes. */
export function applyLocaleDom(): void {
  document.documentElement.lang = localeManager.getLocale();

  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.dataset.i18n;
    if (key) el.textContent = localeManager.t(key);
  }

  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-aria]')) {
    const key = el.dataset.i18nAria;
    if (key) el.setAttribute('aria-label', localeManager.t(key));
  }

  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-title]')) {
    const key = el.dataset.i18nTitle;
    if (key) el.setAttribute('title', localeManager.t(key));
  }
}
