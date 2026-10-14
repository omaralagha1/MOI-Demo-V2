'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, FilePlus2, FileSearch, Inbox, Layers, Ship, Stamp } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { isActive, stageIndex, type CaseSummary } from '@/lib/cases/model';
import { Alert, EmptyState, KpiStatCard, Ltr, Skeleton, StatusBadge } from '@/components/ui/primitives';
import { CaseStatusBadge } from '@/components/cases/CaseParts';
import { NotificationPanel } from '@/components/cases/NotificationPanel';
import { useRecentActivity } from '@/components/cases/useCaseList';
import { ErrorAlert } from '@/components/cases/errors';
import { useWorkspace } from './WorkspaceShell';
import { inView } from './workspace-model';

export function WorkspaceDashboard() {
  const { t, f, href, label, number, date } = useI18n();
  const { cases, error, user } = useWorkspace();
  const activity = useRecentActivity(cases, 6, 8);
  const w = t.workspace;
  const list = cases || [];
  const count = (predicate: (c: CaseSummary) => boolean) => (cases ? number(list.filter(predicate).length) : '–');
  const queue = list.filter(c => inView('queue', c, user.role)).sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || ''));
  const readOnly = ['SERVICE_ADMIN', 'AUDITOR'].includes(user.role);
  const listHref = (view?: string) => `${href('/workspace/applications')}${view ? `?view=${view}` : ''}`;

  const open = list.filter(isActive);
  const stages = t.caseView.stages.map((stage, index) => ({ stage, index, count: open.filter(c => stageIndex(c.status) === index).length }));
  const max = Math.max(1, ...stages.map(item => item.count));

  return (
    <div className="ws-page">
      <div className="ws-page-head">
        <div>
          <p className="page-eyebrow">{w.title}</p>
          <h1 className="ws-page-title">{f(w.greeting, { name: user.displayName })}</h1>
          <p className="muted"><StatusBadge tone="info" icon={false}>{label(t.roles, user.role)}</StatusBadge> <span style={{ marginInlineStart: 'var(--space-2)' }}>{w.subtitle}</span></p>
        </div>
        <div className="page-actions">
          {user.role === 'REGISTRATION_OFFICER' && <Link className="btn" href={href('/workspace/new')}><FilePlus2 size={18} aria-hidden="true" />{w.navNewIntake}</Link>}
          <Link className="btn btn-secondary" href={listHref()}>{w.navApplications}</Link>
        </div>
      </div>

      {error ? <ErrorAlert error={error} /> : null}
      {readOnly && <Alert tone="info">{t.officer.readOnly}</Alert>}

      <div className="kpi-grid kpi-grid-5">
        <KpiStatCard label={w.kpiAwaiting} value={count(c => inView('queue', c, user.role))} icon={Inbox} href={listHref('queue')} emphasis={queue.length > 0} tile={queue.length ? 'icon-tile-warning' : ''} />
        <KpiStatCard label={w.kpiIntake} value={count(c => inView('verification', c, user.role))} icon={FileSearch} href={listHref('verification')} />
        <KpiStatCard label={w.kpiInspection} value={count(c => inView('inspections', c, user.role))} icon={Ship} href={listHref('inspections')} />
        <KpiStatCard label={w.kpiApprovals} value={count(c => inView('approvals', c, user.role))} icon={Stamp} href={listHref('approvals')} />
        <KpiStatCard label={w.kpiCompleted} value={count(c => !isActive(c))} icon={CheckCircle2} tile="icon-tile-success" href={listHref()} />
      </div>

      <div className="ws-grid">
        <section className="card" aria-labelledby="queue-title">
          <div className="card-head card-pad" style={{ marginBottom: 0, paddingBottom: 'var(--space-4)' }}>
            <div><h2 className="card-title" id="queue-title"><Inbox size={20} aria-hidden="true" />{w.queueTitle}</h2><p className="card-subtitle">{w.queueSubtitle}</p></div>
            <Link className="link-button" href={listHref('queue')}>{t.common.viewAll}<ArrowRight size={16} aria-hidden="true" className="flip-rtl" /></Link>
          </div>
          {!cases ? <div className="card-pad"><Skeleton lines={4} title={false} /></div> : !queue.length ? <EmptyState compact icon={CheckCircle2} title={w.queueEmpty} /> : (
            <div className="table-scroll" role="region" aria-label={w.queueTitle} tabIndex={0}>
              <table className="data-table">
                <caption className="sr-only">{w.queueTitle}</caption>
                <thead><tr><th scope="col">{t.table.application}</th><th scope="col">{t.table.status}</th><th scope="col">{t.table.updated}</th><th scope="col"><span className="sr-only">{t.table.actions}</span></th></tr></thead>
                <tbody>
                  {queue.slice(0, 8).map(c => (
                    <tr key={c.id}>
                      <td><span className="cell-primary"><bdi>{c.vessel_name}</bdi></span><span className="cell-sub"><Ltr mono>{c.application_number}</Ltr> · {label(t.channels, c.intake_channel)}</span></td>
                      <td><CaseStatusBadge status={c.status} /></td>
                      <td className="nowrap subtle">{date(c.updated_at)}</td>
                      <td className="cell-end"><Link className="btn btn-sm btn-secondary" href={href(`/workspace/applications/${c.id}`)}>{t.table.open}<ArrowRight size={14} aria-hidden="true" className="flip-rtl" /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card card-pad" aria-labelledby="workload-title">
          <div className="card-head"><div><h2 className="card-title" id="workload-title"><Layers size={20} aria-hidden="true" />{w.workloadTitle}</h2><p className="card-subtitle">{w.workloadSubtitle}</p></div></div>
          {!cases ? <Skeleton lines={6} title={false} /> : (
            <table className="bar-table">
              <caption className="sr-only">{w.workloadTableCaption}</caption>
              <thead className="sr-only"><tr><th scope="col">{w.stageColumn}</th><th scope="col">{w.countColumn}</th></tr></thead>
              <tbody>
                {stages.map(item => (
                  <tr key={item.stage} className="bar-row">
                    <th scope="row"><Link href={`${listHref()}${listHref().includes('?') ? '&' : '?'}stage=${item.index}`} className="bar-link">{item.stage}</Link></th>
                    <td>
                      <span className="bar-track">
                        <span className="bar-fill" style={{ width: `${(item.count / max) * 100}%` }} title={`${item.stage}: ${item.count}`} />
                        <span className="bar-value">{number(item.count)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <NotificationPanel items={activity} user={user} caseHref={id => href(`/workspace/applications/${id}`)} title={w.activityTitle} empty={w.activityEmpty} />
      {cases && !list.length && <div className="card"><EmptyState icon={Layers} title={t.table.noResults} /></div>}
    </div>
  );
}
