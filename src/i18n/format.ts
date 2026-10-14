import { intlLocale, timeZone, type Locale } from './config';

/** Fill {name} placeholders in a dictionary template. */
export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** Look up an enum label, falling back to a readable form of the raw value instead of showing SCREAMING_CASE. */
export function labelOf(map: Record<string, string>, key: string | null | undefined) {
  if (!key) return '';
  return map[key] ?? key.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

const toDate = (value: string | number | Date) => (value instanceof Date ? value : new Date(value));

export function formatDate(value: string | number | Date | null | undefined, locale: Locale) {
  if (!value) return '';
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeZone }).format(toDate(value));
}

export function formatDateTime(value: string | number | Date | null | undefined, locale: Locale) {
  if (!value) return '';
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(toDate(value));
}

export function formatNumber(value: number | string, locale: Locale, fractionDigits?: number) {
  const number = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat(intlLocale(locale), fractionDigits === undefined ? {} : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(number);
}

export function formatFileSize(bytes: number, locale: Locale) {
  const units = locale === 'ar' ? ['بايت', 'كيلوبايت', 'ميغابايت'] : ['B', 'KB', 'MB'];
  let size = bytes, unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
  return `${formatNumber(size, locale, unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/** Normalise text for bilingual search: case, Arabic diacritics and letter variants. */
export function normalizeSearch(text: string) {
  return text
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}
