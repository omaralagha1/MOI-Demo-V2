'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Clock3, FilePlus2, LayoutDashboard } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { awaitsRole, CREATOR_ROLES, isActive, isStaffRole, type ViewUser } from '@/lib/cases/model';
import { findService } from '@/lib/service-catalog';
import { Skeleton } from '@/components/ui/primitives';
import { ApplicationCard } from '@/components/cases/ApplicationCard';
import { useCaseList } from '@/components/cases/useCaseList';
import { readRecentServices } from './recent';
import { serviceIcons } from './ServiceCard';

/** Personalised strip for signed-in users: active applications (applicants) or workload (staff). */
export function PersonalPanel({ user }: { user: ViewUser }) {
  const { t, f, href, number } = useI18n();
  const { cases } = useCaseList();
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { setRecent(readRecentServices()); }, []);
  const staff = isStaffRole(user.role);
  const recentServices = recent.map(findService).filter(Boolean);

  if (staff) {
    const waiting = cases?.filter(c => awaitsRole(c, user.role)).length ?? null;
    return (
      <section className="personal-panel card" aria-labelledby="personal-title">
        <div className="personal-staff">
          <span className="icon-tile icon-tile-lg icon-tile-navy"><LayoutDashboard size={26} aria-hidden="true" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="personal-title" id="personal-title">{f(t.home.welcome, { name: user.displayName })}</h2>
            <p className="muted">{waiting === null ? t.common.loading : waiting ? f(t.home.staffBody, { count: number(waiting) }) : t.home.staffBodyNone}</p>
          </div>
          <Link className="btn btn-lg" href={href('/workspace')}>{t.home.openWorkspace}<ArrowRight size={18} aria-hidden="true" className="flip-rtl" /></Link>
        </div>
      </section>
    );
  }

  const active = cases?.filter(isActive).slice(0, 3) ?? null;
  return (
    <section className="personal-panel card" aria-labelledby="personal-title">
      <div className="personal-head">
        <div>
          <h2 className="personal-title" id="personal-title">{f(t.home.welcome, { name: user.displayName })}</h2>
          <p className="muted">{t.home.activeTitle}</p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-secondary" href={href('/applications')}>{t.common.viewAll}</Link>
          {CREATOR_ROLES.has(user.role) && <Link className="btn" href={href('/applications/new')}><FilePlus2 size={18} aria-hidden="true" />{t.home.startNew}</Link>}
        </div>
      </div>
      {!active ? <div className="app-grid"><div className="card card-pad"><Skeleton lines={3} /></div></div>
        : active.length ? <div className="app-grid">{active.map(c => <ApplicationCard key={c.id} c={c} user={user} href={href(`/applications/${c.id}`)} />)}</div>
        : <p className="muted personal-empty">{t.home.activeEmpty}</p>}
      {recentServices.length > 0 && (
        <div className="recent-services">
          <span className="recent-label"><Clock3 size={16} aria-hidden="true" />{t.home.recentTitle}</span>
          {recentServices.map(service => {
            const Icon = serviceIcons[service!.icon];
            return <Link key={service!.slug} className="chip" href={href(service!.path)}><Icon size={16} aria-hidden="true" />{t.services[service!.slug].name}</Link>;
          })}
        </div>
      )}
    </section>
  );
}
