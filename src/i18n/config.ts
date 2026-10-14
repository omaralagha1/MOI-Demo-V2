export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];
export type Direction = 'rtl' | 'ltr';

/** Arabic is the primary design language of the platform. */
export const defaultLocale: Locale = 'ar';

export const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);
export const directionOf = (locale: Locale): Direction => (locale === 'ar' ? 'rtl' : 'ltr');
export const otherLocale = (locale: Locale): Locale => (locale === 'ar' ? 'en' : 'ar');

/** Latin digits are used in both languages so IDs, amounts and dates read consistently. */
export const intlLocale = (locale: Locale) => (locale === 'ar' ? 'ar-KW-u-nu-latn' : 'en-GB');
export const timeZone = 'Asia/Kuwait';

/** Swap the locale segment of an app path, e.g. /en/services -> /ar/services. */
export function switchLocalePath(pathname: string, target: Locale) {
  const parts = pathname.split('/');
  if (parts.length > 1 && isLocale(parts[1])) parts[1] = target;
  else parts.splice(1, 0, target);
  return parts.join('/') || `/${target}`;
}
