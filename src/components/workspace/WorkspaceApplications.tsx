'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowRight, FilterX, ListChecks, RefreshCw, Search } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { normalizeSearch } from '@/i18n/format';
import { ALL_STATUSES, responsibleRole, stageIndex, type CaseSummary } from '@/lib/cases/model';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState, Ltr, Skeleton } from '@/components/ui/primitives';
import { CaseStatusBadge } from '@/components/cases/CaseParts';
import { ErrorAlert } from '@/components/cases/errors';
import { useWorkspace } from './WorkspaceShell';
import { inView, type WorkspaceView } from './workspace-model';

export function WorkspaceApplications({ view, initialStage }: { view: WorkspaceView; initialStage: number | null }) {
  const { t, label, href, number, date } = useI18n();
  const { cases, error, reload, user } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [route, setRoute] = useState('');
  const [stage, setStage] = useState(initialStage === null ? '' : String(initialStage));
  const [refreshing, setRefreshing] = useState(false);
  const w = t.workspace;
  const titles: Record<WorkspaceView, [string, string]> = {
    queue: [w.navQueue, w.queueSubtitle], all: [w.navApplications, w.allSubtitle], verification: [w.verificationTitle, w.verificationSubtitle],
    inspections: [w.inspectionsTitle, w.inspectionsSubtitle], approvals: [w.approvalsTitle, w.approvalsSubtitle],
  };

  const rows = useMemo(() => {
    const q = normalizeSearch(query);
    return (cases || [])
      .filter(c => inView(view, c, user.role))
      .filter(c => !q || normalizeSearch(`${c.application_number} ${c.vessel_name}`).includes(q))
      .filter(c => !status || c.status === status)
      .filter(c => !route || c.intake_channel === route)
      .filter(c => stage === '' || stageIndex(c.status) === Number(stage));
  }, [cases, view, user.role, query, status, route, stage]);

  const columns: Column<CaseSummary>[] = [
    { key: 'application', header: t.table.application, sortValue: c => c.vessel_name,
      render: c => <Link className="table-link" href={href(`/workspace/applications/${c.id}`)}><span className="cell-primary"><bdi>{c.vessel_name}</bdi></span><span className="cell-sub"><Ltr mono>{c.application_number}</Ltr></span></Link> },
    { key: 'tonnage', header: t.table.tonnage, sortValue: c => Number(c.tonnage), render: c => <span className="num">{number(c.tonnage)}</span> },
    { key: 'route', header: t.table.route, sortValue: c => c.intake_channel, render: c => label(t.channels, c.intake_channel) },
    { key: 'status', header: t.table.status, sortValue: c => label(t.statuses, c.status), render: c => <CaseStatusBadge status={c.status} /> },
    { key: 'with', header: t.table.assignedTo, sortValue: c => label(t.roles, responsibleRole(c) || ''), render: c => { const role = responsibleRole(c); return role ? <span className={role === user.role ? 'with-me' : 'subtle'}>{label(t.roles, role)}</span> : <span className="subtle">{t.common.none}</span>; } },
    { key: 'created', header: t.table.created, sortValue: c => c.created_at || '', render: c => <span className="nowrap subtle">{date(c.created_at)}</span> },
    { key: 'updated', header: t.table.updated, sortValue: c => c.updated_at || '', render: c => <span className="nowrap subtle">{date(c.updated_at)}</span> },
    { key: 'actions', header: t.table.actions, className: 'cell-end', render: c => <Link className="btn btn-sm btn-secondary" href={href(`/workspace/applications/${c.id}`)} aria-label={`${t.table.open}: ${c.application_number}`}>{t.table.open}<ArrowRight size={14} aria-hidden="true" className="flip-rtl" /></Link> },
  ];
  const exportColumns: Pick<Column<CaseSummary>, 'header' | 'csv'>[] = [
    { header: t.table.application, csv: c => c.application_number },
    { header: t.table.vessel, csv: c => c.vessel_name },
    { header: t.table.tonnage, csv: c => c.tonnage },
    { header: t.table.route, csv: c => label(t.channels, c.intake_channel) },
    { header: t.table.status, csv: c => label(t.statuses, c.status) },
    { header: t.table.assignedTo, csv: c => label(t.roles, responsibleRole(c) || '') },
    { header: t.table.created, csv: c => c.created_at || '' },
    { header: t.table.updated, csv: c => c.updated_at || '' },
  ];

  const filtered = !!(query || status || route || stage);
  const clear = () => { setQuery(''); setStatus(''); setRoute(''); setStage(''); if (initialStage !== null) router.replace(view === 'all' ? pathname : `${pathname}?view=${view}`); };
  const [title, subtitle] = titles[view];

  return (
    <div className="ws-page">
      <div className="ws-page-head">
        <div>
          <p className="page-eyebrow">{w.title}</p>
          <h1 className="ws-page-title">{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} disabled={refreshing}><RefreshCw size={16} aria-hidden="true" className={refreshing ? 'spinner' : ''} />{t.common.refresh}</button>
      </div>
      {error ? <ErrorAlert error={error} /> : null}
      {!cases ? <div className="card card-pad"><Skeleton lines={8} /></div> : (
        <DataTable rows={rows} columns={columns} exportColumns={exportColumns} rowKey={c => c.id} initialSort={{ key: 'updated', direction: 'desc' }} caption={title} exportName={`applications-${view}`}
          toolbar={
            <>
              <label className="field field-search">
                <span className="field-label">{t.common.search}</span>
                <span className="input-group"><Search size={18} className="input-icon" aria-hidden="true" /><input className="input input-sm" type="search" dir="auto" placeholder={t.table.search} value={query} onChange={event => setQuery(event.target.value)} /></span>
              </label>
              <label className="field">
                <span className="field-label">{t.table.status}</span>
                <select className="select input-sm" value={status} onChange={event => setStatus(event.target.value)}>
                  <option value="">{t.table.all}</option>
                  {ALL_STATUSES.map(item => <option key={item} value={item}>{label(t.statuses, item)}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{t.table.stage}</span>
                <select className="select input-sm" value={stage} onChange={event => setStage(event.target.value)}>
                  <option value="">{t.table.all}</option>
                  {t.caseView.stages.map((item, index) => <option key={item} value={index}>{item}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{t.table.route}</span>
                <select className="select input-sm" value={route} onChange={event => setRoute(event.target.value)}>
                  <option value="">{t.table.all}</option>
                  <option value="PORTAL">{t.channels.PORTAL}</option>
                  <option value="EXTERNAL_CENTER">{t.channels.EXTERNAL_CENTER}</option>
                </select>
              </label>
              {filtered && <button type="button" className="btn btn-ghost btn-sm" onClick={clear}><FilterX size={16} aria-hidden="true" />{t.table.clearFilters}</button>}
            </>
          }
          empty={<EmptyState icon={ListChecks} title={t.table.noResults} action={filtered ? <button type="button" className="btn btn-secondary" onClick={clear}>{t.table.clearFilters}</button> : undefined} />}
        />
      )}
    </div>
  );
}

