import { notFound } from 'next/navigation';
import { ar } from './dictionaries/ar';
import { en, type Dictionary } from './dictionaries/en';
import { isLocale, type Locale } from './config';
import { createI18n } from './runtime';

export type { Dictionary };
export * from './config';
export * from './format';
export { createI18n, type I18n } from './runtime';

const dictionaries: Record<Locale, Dictionary> = { ar, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Resolve the locale route param (404 for unsupported locales) and return locale-bound helpers. */
export async function getI18n(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return createI18n(locale, dictionaries[locale]);
}
