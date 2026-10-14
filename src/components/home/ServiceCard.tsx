import Link from 'next/link';
import { ArrowRight, BadgeCheck, ListChecks, Lock, Ship, Globe2, type LucideIcon } from 'lucide-react';
import type { ServiceEntry, ServiceIcon } from '@/lib/service-catalog';
import type { I18n } from '@/i18n/runtime';

export const serviceIcons: Record<ServiceIcon, LucideIcon> = { ship: Ship, 'list-checks': ListChecks, 'badge-check': BadgeCheck };

/** Catalog card: icon, category, name, summary, access badge and the primary action. */
export function ServiceCard({ service, i18n, headingLevel = 'h3' }: { service: ServiceEntry; i18n: Pick<I18n, 't' | 'href'>; headingLevel?: 'h2' | 'h3' }) {
  const { t, href } = i18n;
  const Icon = serviceIcons[service.icon];
  const Heading = headingLevel;
  const text = t.services[service.slug];
  return (
    <article className="card card-interactive service-card">
      <div className="service-card-top">
        <span className="icon-tile icon-tile-lg icon-tile-navy"><Icon size={26} aria-hidden="true" /></span>
        <span className="service-category">{t.categories[service.category].name}</span>
      </div>
      <Heading className="service-card-title">
        <Link href={href(service.path)} className="stretched-link">{text.name}</Link>
      </Heading>
      <p className="service-card-summary">{text.summary}</p>
      <div className="service-card-foot">
        <span className="service-badges">
          {service.code && <span className="badge tone-neutral"><bdi dir="ltr">{service.code}</bdi></span>}
          <span className={`badge ${service.requiresSignIn ? 'tone-info' : 'tone-success'}`}>
            {service.requiresSignIn ? <Lock aria-hidden="true" /> : <Globe2 aria-hidden="true" />}
            {service.kind === 'transaction' ? t.catalog.badgeOnline : service.requiresSignIn ? t.catalog.badgeSignIn : t.catalog.badgePublic}
          </span>
        </span>
        <span className="service-card-cta" aria-hidden="true">{service.kind === 'transaction' ? t.catalog.startService : t.catalog.openService}<ArrowRight size={16} className="flip-rtl" /></span>
      </div>
    </article>
  );
}
