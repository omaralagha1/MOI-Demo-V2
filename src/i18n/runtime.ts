import { directionOf, type Locale } from './config';
import type { Dictionary } from './dictionaries/en';
import { formatDate, formatDateTime, formatFileSize, formatNumber, interpolate, labelOf } from './format';

/** Locale-bound helpers shared by Server Components and the client I18nProvider. */
export function createI18n(locale: Locale, t: Dictionary) {
  return {
    locale,
    dir: directionOf(locale),
    t,
    f: interpolate,
    label: labelOf,
    date: (value: string | number | Date | null | undefined) => formatDate(value, locale),
    dateTime: (value: string | number | Date | null | undefined) => formatDateTime(value, locale),
    number: (value: number | string, digits?: number) => formatNumber(value, locale, digits),
    fileSize: (bytes: number) => formatFileSize(bytes, locale),
    href: (path: string) => `/${locale}${path === '/' ? '' : path}`,
  };
}
export type I18n = ReturnType<typeof createI18n>;
