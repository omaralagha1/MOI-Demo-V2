'use client';

import { usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';
import { otherLocale, switchLocalePath } from '@/i18n/config';
import { useI18n } from '@/i18n/provider';

/** Full page load on purpose: <html lang/dir>, fonts and dictionaries all change with the locale. */
export function LanguageSwitch({ className = 'utility-button', compact = false }: { className?: string; compact?: boolean }) {
  const { locale, t } = useI18n();
  const pathname = usePathname() || `/${locale}`;
  const target = otherLocale(locale);
  const href = switchLocalePath(pathname, target);
  return (
    <a
      className={className}
      href={href}
      hrefLang={target}
      lang={target}
      aria-label={t.nav.switchLanguageLabel}
      onClick={event => {
        if (!window.location.search) return;
        event.preventDefault();
        window.location.assign(`${href}${window.location.search}`);
      }}
    >
      <Languages size={18} aria-hidden="true" />
      {!compact && <span>{t.nav.switchLanguage}</span>}
    </a>
  );
}
