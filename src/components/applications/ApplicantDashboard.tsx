'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Award, CheckCircle2, Download, FilePlus2, Layers, Search, Ship, Timer } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { fileUrls } from '@/lib/cases/api';
import { awaitsApplicant, CERTIFICATE_STATUSES, CREATOR_ROLES, isActive, nextStepKey, type ViewUser } from '@/lib/cases/model';
import { normalizeSearch } from '@/i18n/format';
import { EmptyState, KpiStatCard, Ltr, PageHeader, Skeleton } from '@/components/ui/primitives';
import { ApplicationCard } from '@/components/cases/ApplicationCard';
import { NotificationPanel } from '@/components/cases/NotificationPanel';
import { useCaseList, useRecentActivity } from '@/components/cases/useCaseList';
import { ErrorAlert } from '@/components/cases/errors';

type Filter = 'all' | 'active' | 'action' | 'completed';

export function ApplicantDashboard({ user }: { user: ViewUser }) {
  const { t, f, label, href, number } = useI18n();
  const { cases, error } = useCaseList();
  const activity = useRecentActivity(cases);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const d = t.dashboard;
  const list = cases || [];
  const needsAction = list.filter(awaitsApplicant);
  const registered = list.filter(c => c.registry_number && CERTIFICATE_STATUSES.has(c.status));
  const caseHref = (id: string) => href(`/applications/${id}`);

  const visible = useMemo(() => {
    const q = normalizeSearch(query);
    return list
      .filter(c => filter === 'all' || (filter === 'active' && isActive(c)) || (filter === 'action' && awaitsApplicant(c)) || (filter === 'completed' && !isActive(c)))
      .filter(c => !q || normalizeSearch(`${c.application_number} ${c.vessel_name}`).includes(q));
  }, [list, filter, query]);

  const filters: [Filter, string, number][] = [
    ['all', d.filterAll, list.length], ['active', d.filterActive, list.filter(isActive).length],
    ['action', d.filterAction, needsAction.length], ['completed', d.filterCompleted, list.filter(c => !isActive(c)).length],
  ];

  return (
    <>
      <PageHeader
        eyebrow={d.title}
        title={f(d.welcome, { name: user.displayName })}
        subtitle={d.subtitle}
        actions={CREATOR_ROLES.has(user.role) && <Link className="btn btn-lg" href={href('/applications/new')}><FilePlus2 size={18} aria-hidden="true" />{d.newApplication}</Link>}
      />
      <div className="container section-tight stack" style={{ '--stack-gap': 'var(--space-8)' } as React.CSSProperties}>
        {error ? <ErrorAlert error={error} /> : null}
        <div className="kpi-grid">
          <KpiStatCard label={d.kpiTotal} value={cases ? number(list.length) : '–'} icon={Layers} />
          <KpiStatCard label={d.kpiActive} value={cases ? number(list.filter(isActive).length) : '–'} icon={Timer} />
          <KpiStatCard label={d.kpiAction} value={cases ? number(needsAction.length) : '–'} icon={AlertTriangle} tile="icon-tile-warning" emphasis={needsAction.length > 0} />
          <KpiStatCard label={d.kpiCompleted} value={cases ? number(list.filter(c => !isActive(c)).length) : '–'} icon={CheckCircle2} tile="icon-tile-success" />
        </div>

        <div className="dashboard-layout">
          <div className="stack" style={{ '--stack-gap': 'var(--space-8)' } as React.CSSProperties}>
            {needsAction.length > 0 && (
              <section aria-labelledby="pending-title">
                <h2 className="block-title" id="pending-title">{d.pendingTitle}</h2>
                <ul className="pending-list">
                  {needsAction.map(c => (
                    <li key={c.id}>
                      <Link className="pending-item" href={caseHref(c.id)}>
                        <span className="icon-tile icon-tile-warning"><AlertTriangle size={20} aria-hidden="true" /></span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span className="pending-title">{label(t.nextSteps, nextStepKey(c))}</span>
                          <span className="pending-meta"><bdi>{c.vessel_name}</bdi> · <Ltr mono>{c.application_number}</Ltr> · {label(t.statuses, c.status)}</span>
                        </span>
                        <ArrowRight size={18} aria-hidden="true" className="flip-rtl" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="applications-title">
              <div className="block-head">
                <h2 className="block-title" id="applications-title">{d.applicationsTitle}</h2>
                <div className="segmented" role="group" aria-label={d.applicationsTitle}>
                  {filters.map(([value, text, count]) => (
                    <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{text}{cases && <span className="subtle num">{number(count)}</span>}</button>
                  ))}
                </div>
              </div>
              {list.length > 3 && (
                <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <Search size={18} className="input-icon" aria-hidden="true" />
                  <input className="input" type="search" dir="auto" placeholder={d.searchPlaceholder} aria-label={d.searchPlaceholder} value={query} onChange={event => setQuery(event.target.value)} />
                </div>
              )}
              {!cases ? (
                <div className="app-grid">{[0, 1].map(key => <div key={key} className="card card-pad"><Skeleton lines={3} /></div>)}</div>
              ) : !list.length ? (
                <div className="card">
                  <EmptyState icon={Ship} title={d.applicationsEmpty} body={d.applicationsEmptyBody} action={CREATOR_ROLES.has(user.role) && <Link className="btn" href={href('/applications/new')}><FilePlus2 size={18} aria-hidden="true" />{d.newApplication}</Link>} />
                </div>
              ) : !visible.length ? (
                <div className="card"><EmptyState compact title={d.noMatches} icon={Search} /></div>
              ) : (
                <div className="app-grid">{visible.map(c => <ApplicationCard key={c.id} c={c} user={user} href={caseHref(c.id)} />)}</div>
              )}
            </section>
          </div>

          <aside className="stack" style={{ '--stack-gap': 'var(--space-6)' } as React.CSSProperties}>
            <NotificationPanel items={activity} user={user} caseHref={caseHref} title={d.notificationsTitle} empty={d.notificationsEmpty} />
            <section className="card card-pad" aria-labelledby="vessels-title">
              <h2 className="card-title" id="vessels-title"><Ship size={20} aria-hidden="true" />{d.vesselsTitle}</h2>
              {!registered.length ? <p className="muted aside-empty">{d.vesselsEmpty}</p> : (
                <ul className="mini-list">
                  {registered.map(c => (
                    <li key={c.id}><Link href={caseHref(c.id)}><bdi className="mini-list-title">{c.vessel_name}</bdi><span className="subtle">{d.registryNumber}: <Ltr mono>{c.registry_number}</Ltr></span></Link></li>
                  ))}
                </ul>
              )}
            </section>
            <section className="card card-pad" aria-labelledby="certificates-title">
              <h2 className="card-title" id="certificates-title"><Award size={20} aria-hidden="true" />{d.certificatesTitle}</h2>
              {!registered.length ? <p className="muted aside-empty">{d.certificatesEmpty}</p> : (
                <ul className="mini-list">
                  {registered.map(c => (
                    <li key={c.id} className="mini-list-row">
                      <span><bdi className="mini-list-title">{c.vessel_name}</bdi><span className="subtle">{label(t.statuses, c.status)}</span></span>
                      <a className="btn btn-secondary btn-icon btn-sm" href={fileUrls.certificate(c.id)} aria-label={`${t.caseView.downloadCertificate}: ${c.vessel_name}`}><Download size={16} aria-hidden="true" /></a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
