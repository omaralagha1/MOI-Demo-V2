import Link from 'next/link';
import { ArrowRight, BadgeCheck, CircleHelp, ClipboardCheck, FileStack, FileText, Landmark, MapPin, Route, Scale, ShieldCheck, Ship, Stamp, Timer, Wallet } from 'lucide-react';
import { getI18n } from '@/i18n';
import { getSessionUser } from '@/lib/session';
import { isStaffRole } from '@/lib/cases/model';
import { categories, services } from '@/lib/service-catalog';
import { SectionHeader } from '@/components/ui/primitives';
import { HeroArt } from '@/components/home/HeroArt';
import { ServiceSearch } from '@/components/home/ServiceSearch';
import { serviceIcons } from '@/components/home/ServiceCard';
import { PersonalPanel } from '@/components/home/PersonalPanel';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const i18n = await getI18n(params);
  const { t, href, f, number } = i18n;
  const user = await getSessionUser();
  const featured = services.find(service => service.featured)!;
  const journeyIcons = [FileStack, ClipboardCheck, Wallet, Ship, Stamp, BadgeCheck];
  const fee = process.env.FIXED_FEE_AMOUNT || '16';

  return (
    <>
      <section className="hero on-dark" aria-labelledby="hero-title">
        <HeroArt />
        <div className="container hero-inner">
          <p className="hero-eyebrow"><span className="hero-eyebrow-dot" aria-hidden="true" />{t.home.heroEyebrow}</p>
          <h1 className="hero-title" id="hero-title">{t.home.heroTitle}</h1>
          <p className="hero-subtitle">{t.home.heroSubtitle}</p>
          <ServiceSearch signedIn={!!user} staff={!!user && isStaffRole(user.role)} />
          <div className="hero-quick">
            <span className="hero-quick-label">{t.home.popular}</span>
            <Link className="hero-chip" href={href(featured.path)}><Ship size={16} aria-hidden="true" />{t.home.quickRegister}</Link>
            <Link className="hero-chip" href={href('/applications')}><ClipboardCheck size={16} aria-hidden="true" />{t.home.quickTrack}</Link>
            <Link className="hero-chip" href={href('/verify')}><ShieldCheck size={16} aria-hidden="true" />{t.home.quickVerify}</Link>
          </div>
          <ul className="hero-facts">
            <li><span className="hero-fact-value"><bdi dir="ltr">A.4.1/1</bdi></span><span>{t.home.factCode}</span></li>
            <li><span className="hero-fact-value">{t.home.factTimeValue}</span><span>{t.home.factTime}</span></li>
            <li><span className="hero-fact-value"><ShieldCheck size={22} aria-hidden="true" /> QR</span><span>{t.home.factQr}</span></li>
          </ul>
        </div>
      </section>

      {user && <div className="container personal-wrap"><PersonalPanel user={user} /></div>}

      <section className="section" aria-labelledby="categories-title">
        <div className="container">
          <SectionHeader id="categories-title" title={t.home.categoriesTitle} subtitle={t.home.categoriesSubtitle}
            action={<Link className="link-button" href={href('/services')}>{t.common.viewAll}<ArrowRight size={16} aria-hidden="true" className="flip-rtl" /></Link>} />
          <ul className="category-grid">
            {categories.map(category => {
              const Icon = serviceIcons[category.icon];
              const inCategory = services.filter(service => service.category === category.id);
              return (
                <li key={category.id}>
                  <Link className="card card-interactive category-card" href={`${href('/services')}?category=${category.id}`}>
                    <span className="icon-tile icon-tile-lg"><Icon size={26} aria-hidden="true" /></span>
                    <span className="category-name">{t.categories[category.id].name}</span>
                    <span className="category-desc">{t.categories[category.id].description}</span>
                    <span className="category-foot">
                      <span className="subtle">{inCategory.length === 1 ? t.home.serviceCountOne : f(t.home.serviceCount, { count: number(inCategory.length) })}</span>
                      <ArrowRight size={18} aria-hidden="true" className="flip-rtl" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="section section-tint" aria-labelledby="featured-title">
        <div className="container">
          <article className="featured">
            <div className="featured-copy">
              <p className="page-eyebrow">{t.home.featuredEyebrow}</p>
              <h2 className="section-title" id="featured-title">{t.services[featured.slug].name}</h2>
              <p className="featured-body">{t.home.featuredBody}</p>
              <dl className="featured-facts">
                <div><dt><FileText size={18} aria-hidden="true" />{t.serviceDetail.facts.code}</dt><dd><bdi dir="ltr">{featured.code}</bdi></dd></div>
                <div><dt><Timer size={18} aria-hidden="true" />{t.serviceDetail.facts.time}</dt><dd>{t.serviceDetail.svr.time}</dd></div>
                <div><dt><Scale size={18} aria-hidden="true" />{t.serviceDetail.facts.fee}</dt><dd>{f(t.serviceDetail.svr.fee, { amount: number(fee) })}</dd></div>
                <div><dt><Route size={18} aria-hidden="true" />{t.serviceDetail.facts.channels}</dt><dd>{t.channels.PORTAL} · {t.channels.EXTERNAL_CENTER}</dd></div>
              </dl>
              <div className="page-actions">
                <Link className="btn btn-lg" href={href(featured.startPath)}>{t.home.startApplication}<ArrowRight size={18} aria-hidden="true" className="flip-rtl" /></Link>
                <Link className="btn btn-lg btn-secondary" href={href(featured.path)}>{t.home.viewRequirements}</Link>
              </div>
            </div>
            <div className="featured-visual" aria-hidden="true">
              <div className="featured-visual-card">
                <span className="icon-tile icon-tile-lg icon-tile-navy"><Ship size={28} /></span>
                <div className="featured-visual-lines"><span /><span /><span /></div>
                <ol className="featured-visual-steps">
                  {t.caseView.stages.map((stage, index) => <li key={stage} className={index < 3 ? 'is-done' : index === 3 ? 'is-current' : ''}><span />{stage}</li>)}
                </ol>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="section" aria-labelledby="journey-title">
        <div className="container">
          <SectionHeader id="journey-title" title={t.home.journeyTitle} subtitle={t.home.journeySubtitle} />
          <ol className="journey">
            {t.caseView.stages.map((stage, index) => {
              const Icon = journeyIcons[index];
              return (
                <li key={stage} className="journey-step">
                  <span className="journey-index" aria-hidden="true">{number(index + 1)}</span>
                  <span className="icon-tile"><Icon size={22} aria-hidden="true" /></span>
                  <h3 className="journey-title">{stage}</h3>
                  <p className="journey-body">{t.home.journey[index]}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="section section-tint" aria-labelledby="guides-title">
        <div className="container guide-help-grid">
          <div>
            <SectionHeader id="guides-title" title={t.home.guidesTitle} subtitle={t.home.guidesSubtitle} />
            <ul className="guide-list">
              {[[Scale, t.home.guideEligibilityTitle, t.home.guideEligibilityBody], [FileStack, t.home.guideDocumentsTitle, t.home.guideDocumentsBody], [Route, t.home.guideRouteTitle, t.home.guideRouteBody]].map(([Icon, title, body]) => {
                const GuideIcon = Icon as typeof Scale;
                return (
                  <li key={title as string} className="guide-item">
                    <span className="icon-tile"><GuideIcon size={22} aria-hidden="true" /></span>
                    <span><span className="guide-title">{title as string}</span><span className="guide-body">{body as string}</span></span>
                  </li>
                );
              })}
            </ul>
            <Link className="btn btn-secondary" href={`${href(featured.path)}#documents`} style={{ marginTop: 'var(--space-6)' }}>{t.home.fullRequirements}<ArrowRight size={16} aria-hidden="true" className="flip-rtl" /></Link>
          </div>
          <div>
            <SectionHeader title={t.home.helpTitle} subtitle={t.home.helpSubtitle} />
            <div className="help-cards">
              <Link className="card card-interactive help-link" href={href('/help')}>
                <span className="icon-tile"><CircleHelp size={22} aria-hidden="true" /></span>
                <span><span className="guide-title">{t.home.helpFaqTitle}</span><span className="guide-body">{t.home.helpFaqBody}</span></span>
                <ArrowRight size={18} aria-hidden="true" className="flip-rtl" />
              </Link>
              <Link className="card card-interactive help-link" href={href('/verify')}>
                <span className="icon-tile"><ShieldCheck size={22} aria-hidden="true" /></span>
                <span><span className="guide-title">{t.home.helpVerifyTitle}</span><span className="guide-body">{t.home.helpVerifyBody}</span></span>
                <ArrowRight size={18} aria-hidden="true" className="flip-rtl" />
              </Link>
              <div className="card help-link">
                <span className="icon-tile"><MapPin size={22} aria-hidden="true" /></span>
                <span><span className="guide-title">{t.home.helpOfficeTitle}</span><span className="guide-body">{t.help.contactLocation}</span><span className="guide-body subtle">{t.help.contactFrequency}</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container more-services">
        <Landmark size={20} aria-hidden="true" />
        <p>{t.home.moreServices}</p>
      </section>
    </>
  );
}
