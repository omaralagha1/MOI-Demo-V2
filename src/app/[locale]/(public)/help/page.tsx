import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarDays, ChevronDown, ClipboardCheck, MapPin, ShieldCheck, Ship } from 'lucide-react';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { Breadcrumbs, PageHeader } from '@/components/ui/primitives';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).help.title } : {};
}

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t, href } = await getI18n(params);
  const tools = [
    { icon: Ship, label: t.services['small-vessel-registration'].name, path: '/services/small-vessel-registration' },
    { icon: ClipboardCheck, label: t.services['application-tracking'].name, path: '/applications' },
    { icon: ShieldCheck, label: t.services['certificate-verification'].name, path: '/verify' },
  ];
  return (
    <>
      <PageHeader
        breadcrumbs={<Breadcrumbs label={t.a11y.breadcrumb} items={[{ label: t.nav.home, href: href('/') }, { label: t.help.title }]} />}
        title={t.help.title}
        subtitle={t.help.subtitle}
      />
      <div className="container detail-layout">
        <section className="detail-main" aria-labelledby="faq-title">
          <h2 className="detail-title" id="faq-title">{t.help.faqTitle}</h2>
          <div className="faq">
            {t.help.faqs.map((item, index) => (
              <details key={item.q} className="faq-item" open={index === 0}>
                <summary><span>{item.q}</span><ChevronDown size={20} aria-hidden="true" /></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
        <aside className="detail-aside">
          <section className="card card-pad" aria-labelledby="office-title">
            <h2 className="card-title" id="office-title"><MapPin size={20} aria-hidden="true" />{t.help.contactTitle}</h2>
            <p style={{ marginTop: 'var(--space-3)' }}>{t.help.contactLocation}</p>
            <p className="muted" style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}><CalendarDays size={16} aria-hidden="true" />{t.help.contactFrequency}</p>
          </section>
          <nav className="card card-pad" aria-labelledby="tools-title">
            <h2 className="card-title" id="tools-title">{t.help.toolsTitle}</h2>
            <ul className="tool-list">
              {tools.map(tool => (
                <li key={tool.path}><Link href={href(tool.path)}><tool.icon size={18} aria-hidden="true" /><span>{tool.label}</span><ArrowRight size={16} aria-hidden="true" className="flip-rtl" /></Link></li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </>
  );
}
