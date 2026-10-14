import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, ShieldX } from 'lucide-react';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { verifyCertificate } from '@/server/certificate-verification';
import { Breadcrumbs, Ltr, PageHeader } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).verify.eyebrow, robots: { index: false } } : {};
}

/** Public result page opened from the certificate QR code (/verify/<id> redirects here by language). */
export default async function VerificationPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { t, href, dateTime, number } = await getI18n(params);
  const { id } = await params;
  const record = await verifyCertificate(id);
  const valid = record?.verified === true;
  return (
    <>
      <PageHeader
        breadcrumbs={<Breadcrumbs label={t.a11y.breadcrumb} items={[{ label: t.nav.home, href: href('/') }, { label: t.verify.lookupTitle, href: href('/verify') }, { label: t.verify.eyebrow }]} />}
        eyebrow={t.verify.eyebrow}
        title={valid ? t.verify.validTitle : t.verify.invalidTitle}
      />
      <div className="container section-tight verify-wrap">
        <section className={`card verification-card ${valid ? 'is-valid' : 'is-invalid'}`} aria-live="polite">
          <div className={`verification-icon ${valid ? 'success' : 'failure'}`}>{valid ? <ShieldCheck size={36} aria-hidden="true" /> : <ShieldX size={36} aria-hidden="true" />}</div>
          <p className="verification-lead">{valid ? t.verify.validBody : t.verify.invalidBody}</p>
          {record?.verified === true && (
            <dl className="verification-facts">
              <div><dt>{t.verify.registry}</dt><dd><Ltr mono>{record.registry_number}</Ltr></dd></div>
              <div><dt>{t.verify.vessel}</dt><dd><bdi>{record.vessel_name}</bdi></dd></div>
              <div><dt>{t.verify.version}</dt><dd>{number(record.certificate_version)}</dd></div>
              <div><dt>{t.verify.recordedAt}</dt><dd>{dateTime(record.recorded_at)}</dd></div>
            </dl>
          )}
          <p className="verification-notice">{t.verify.notice}</p>
          <div className="page-actions">
            <Link className="btn btn-secondary" href={href('/verify')}>{t.verify.verifyAnother}</Link>
            <Link className="btn btn-ghost" href={href('/')}><ArrowLeft size={16} aria-hidden="true" className="flip-rtl" />{t.verify.back}</Link>
          </div>
        </section>
      </div>
    </>
  );
}
