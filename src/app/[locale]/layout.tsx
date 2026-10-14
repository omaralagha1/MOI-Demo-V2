import '../styles.css';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { directionOf, getDictionary, isLocale, locales } from '@/i18n';
import { I18nProvider } from '@/i18n/provider';
import { ToastProvider } from '@/components/ui/Toast';
import { accessibilityBootScript } from '@/components/layout/AccessibilityMenu';

export const dynamicParams = false;
export function generateStaticParams() { return locales.map(locale => ({ locale })); }

export const viewport: Viewport = { themeColor: '#102b4e', width: 'device-width', initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: { default: t.meta.siteName, template: `%s · ${t.meta.siteName}` },
    description: t.meta.description,
    alternates: { languages: { ar: '/ar', en: '/en' } },
  };
}

/** Root layout per locale so <html lang dir> is rendered on the server for Arabic (RTL) and English (LTR). */
export default async function LocaleRootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const primaryFont = locale === 'ar' ? '/fonts/ibm-plex-sans-arabic-arabic-400.woff2' : '/fonts/inter-latin-400-700.woff2';
  return (
    <html lang={locale} dir={directionOf(locale)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accessibilityBootScript }} />
        <link rel="preload" href={primaryFont} as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <I18nProvider locale={locale} dictionary={getDictionary(locale)}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
