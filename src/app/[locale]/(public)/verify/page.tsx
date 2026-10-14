import type { Metadata } from 'next';
import { ScanLine } from 'lucide-react';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { Breadcrumbs, PageHeader } from '@/components/ui/primitives';
import { VerifyLookup } from '@/components/verify/VerifyLookup';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).verify.lookupTitle } : {};
}

export default async function VerifyLookupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t, href } = await getI18n(params);
  return (
    <>
      <PageHeader
        breadcrumbs={<Breadcrumbs label={t.a11y.breadcrumb} items={[{ label: t.nav.home, href: href('/') }, { label: t.nav.services, href: href('/services') }, { label: t.verify.lookupTitle }]} />}
        eyebrow={t.verify.eyebrow}
        title={t.verify.lookupTitle}
        subtitle={t.verify.lookupBody}
      />
      <div className="container section-tight verify-wrap">
        <section className="card verification-card">
          <span className="icon-tile icon-tile-lg"><ScanLine size={26} aria-hidden="true" /></span>
          <VerifyLookup />
          <p className="verification-notice">{t.verify.notice}</p>
        </section>
      </div>
    </>
  );
}
