import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, BadgeCheck, Building2, CalendarDays, CheckCircle2, FileCheck2, Info, LogIn, MapPin, Route, Scale, ScrollText, Ship, Stamp, Timer, UserCheck, Users } from 'lucide-react';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { getSessionUser } from '@/lib/session';
import { CREATOR_ROLES, isStaffRole } from '@/lib/cases/model';
import { findService } from '@/lib/service-catalog';
import { requiredDocuments } from '@/server/workflow';
import { Alert, Breadcrumbs, PageHeader } from '@/components/ui/primitives';
import { RememberService } from '@/components/catalog/RememberService';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = findService(slug);
  return isLocale(locale) && service ? { title: getDictionary(locale).services[service.slug].name } : {};
}

/** Document checklist variants derived from the workflow's own rule, so this page cannot drift from the API. */
function documentGroups() {
  const docs = (overrides: Record<string, unknown>) => requiredDocuments({ ownershipKind: 'OWNERSHIP_EVIDENCE', partyCategory: 'PERSON', representativeId: null, foreignFlag: false, intakeChannel: 'PORTAL', ...overrides } as Parameters<typeof requiredDocuments>[0]);
  const base = docs({});
  const extra = (overrides: Record<string, unknown>) => docs(overrides).filter(type => !base.includes(type));
  return { always: base, company: extra({ partyCategory: 'COMPANY' }), representative: extra({ representativeId: 'x' }), foreignFlag: extra({ foreignFlag: true }), center: extra({ intakeChannel: 'EXTERNAL_CENTER' }) };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const i18n = await getI18n(params);
  const { t, href, f, number } = i18n;
  const { slug } = await params;
  const service = findService(slug);
  if (!service) notFound();
  if (service.kind !== 'transaction') redirect(href(service.path));

  const user = await getSessionUser();
  const staff = !!user && isStaffRole(user.role);
  const svr = t.serviceDetail.svr;
  const text = t.services[service.slug];
  const fee = process.env.FIXED_FEE_AMOUNT || '16';
  const groups = documentGroups();
  const conditionIcons = { always: FileCheck2, company: Building2, representative: UserCheck, foreignFlag: Ship, center: MapPin } as const;

  const cta = !user
    ? <Link className="btn btn-lg btn-block" href={`${href('/login')}?next=${encodeURIComponent(href(service.startPath))}`}><LogIn size={18} aria-hidden="true" className="flip-rtl" />{t.serviceDetail.signInToStart}</Link>
    : staff
      ? <Link className="btn btn-lg btn-block" href={href(user.role === 'REGISTRATION_OFFICER' ? '/workspace/new' : '/workspace')}>{t.serviceDetail.openWorkspace}<ArrowRight size={18} aria-hidden="true" className="flip-rtl" /></Link>
      : CREATOR_ROLES.has(user.role) ? <Link className="btn btn-lg btn-block" href={href(service.startPath)}>{t.home.startApplication}<ArrowRight size={18} aria-hidden="true" className="flip-rtl" /></Link> : null;

  const sections = [
    { id: 'overview', label: t.serviceDetail.overview },
    { id: 'eligibility', label: t.serviceDetail.eligibility },
    { id: 'documents', label: t.serviceDetail.documents },
    { id: 'procedure', label: t.serviceDetail.procedure },
    { id: 'fees', label: t.serviceDetail.fees },
  ];

  return (
    <>
      <RememberService slug={service.slug} />
      <PageHeader
        breadcrumbs={<Breadcrumbs label={t.a11y.breadcrumb} items={[{ label: t.nav.home, href: href('/') }, { label: t.nav.services, href: href('/services') }, { label: text.name }]} />}
        eyebrow={<>{t.categories[service.category].name} · <bdi dir="ltr">{service.code}</bdi></>}
        title={text.name}
        subtitle={text.summary}
      >
        <ul className="header-facts">
          <li><Timer size={18} aria-hidden="true" />{svr.time}</li>
          <li><Scale size={18} aria-hidden="true" />{f(svr.fee, { amount: number(fee) })}</li>
          <li><Stamp size={18} aria-hidden="true" />{t.catalog.badgeOnline}</li>
        </ul>
      </PageHeader>

      <div className="container detail-layout">
        <div className="detail-main">
          <section id="overview" className="detail-section" aria-labelledby="overview-title">
            <h2 className="detail-title" id="overview-title"><Info size={22} aria-hidden="true" />{t.serviceDetail.overview}</h2>
            <p className="detail-lead">{svr.overview}</p>
            <dl className="fact-grid">
              {[
                [ScrollText, t.serviceDetail.facts.code, <bdi dir="ltr" key="c">{service.code}</bdi>],
                [Timer, t.serviceDetail.facts.time, svr.time],
                [Route, t.serviceDetail.facts.channels, svr.channels],
                [MapPin, t.serviceDetail.facts.location, svr.location],
                [CalendarDays, t.serviceDetail.facts.frequency, svr.frequency],
                [Stamp, t.serviceDetail.facts.approvals, svr.approvals],
              ].map(([Icon, term, value]) => {
                const FactIcon = Icon as typeof Timer;
                return <div key={term as string} className="fact"><dt><FactIcon size={18} aria-hidden="true" />{term as string}</dt><dd>{value as React.ReactNode}</dd></div>;
              })}
            </dl>
          </section>

          <section id="eligibility" className="detail-section" aria-labelledby="eligibility-title">
            <h2 className="detail-title" id="eligibility-title"><Users size={22} aria-hidden="true" />{t.serviceDetail.eligibility}</h2>
            <ul className="check-list check-list-lg">{svr.eligibility.map(item => <li key={item}><CheckCircle2 size={20} aria-hidden="true" />{item}</li>)}</ul>
          </section>

          <section id="documents" className="detail-section" aria-labelledby="documents-title">
            <h2 className="detail-title" id="documents-title"><FileCheck2 size={22} aria-hidden="true" />{t.serviceDetail.documents}</h2>
            <p className="muted">{svr.documentsIntro}</p>
            <div className="doc-groups">
              {(Object.keys(groups) as (keyof typeof groups)[]).map(key => {
                const Icon = conditionIcons[key];
                return (
                  <div key={key} className={`doc-group ${key === 'always' ? 'is-always' : ''}`}>
                    <p className="doc-group-title"><Icon size={18} aria-hidden="true" />{svr.conditions[key]}</p>
                    <ul>{groups[key].map(type => <li key={type}>{t.documentTypes[type as keyof typeof t.documentTypes] ?? type}</li>)}</ul>
                  </div>
                );
              })}
            </div>
          </section>

          <section id="procedure" className="detail-section" aria-labelledby="procedure-title">
            <h2 className="detail-title" id="procedure-title"><Route size={22} aria-hidden="true" />{t.serviceDetail.procedure}</h2>
            <ol className="procedure">
              {svr.steps.map((step, index) => (
                <li key={step.title} className="procedure-step">
                  <span className="procedure-index">{number(index + 1)}</span>
                  <div><h3 className="procedure-title">{step.title}</h3><p className="muted">{step.body}</p></div>
                </li>
              ))}
            </ol>
            <Alert tone="info">{svr.centerRoute}</Alert>
          </section>

          <section id="fees" className="detail-section" aria-labelledby="fees-title">
            <h2 className="detail-title" id="fees-title"><Scale size={22} aria-hidden="true" />{t.serviceDetail.fees}</h2>
            <div className="fee-cards">
              <div className="fee-card"><span className="fee-card-label">{t.serviceDetail.facts.fee}</span><span className="fee-card-value">{f(svr.fee, { amount: number(fee) })}</span><span className="muted">{svr.feeExtra}</span></div>
              <div className="fee-card"><span className="fee-card-label">{t.serviceDetail.facts.time}</span><span className="fee-card-value">{svr.time}</span><span className="muted">{svr.timeNote}</span></div>
            </div>
            <p className="field-hint" style={{ marginTop: 'var(--space-4)' }}>{svr.feeNote}</p>
            <Alert tone="warning">{svr.paymentNote}</Alert>
          </section>
        </div>

        <aside className="detail-aside">
          <div className="card card-pad start-card">
            <span className="icon-tile icon-tile-lg icon-tile-navy"><BadgeCheck size={26} aria-hidden="true" /></span>
            <h2 className="card-title">{t.serviceDetail.start}</h2>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>{staff ? t.serviceDetail.staffNote : t.serviceDetail.startBody}</p>
            {cta}
            {!user && <p className="field-hint">{t.serviceDetail.signInNote}</p>}
          </div>
          <nav className="card card-pad toc" aria-labelledby="toc-title">
            <h2 className="toc-title" id="toc-title">{t.serviceDetail.onThisPage}</h2>
            <ol>{sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.label}</a></li>)}</ol>
          </nav>
        </aside>
      </div>
    </>
  );
}
