'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BadgeCheck, Download, Search } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { normalizeSearch } from '@/i18n/format';
import { fileUrls } from '@/lib/cases/api';
import { CERTIFICATE_STATUSES, type CaseSummary } from '@/lib/cases/model';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState, Ltr, Skeleton } from '@/components/ui/primitives';
import { CaseStatusBadge } from '@/components/cases/CaseParts';
import { useWorkspace } from './WorkspaceShell';

/** Vessels with a released certificate record (registry number assigned at release). */
export function RegistryView() {
  const { t, href, number, date, label } = useI18n();
  const { cases } = useWorkspace();
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const q = normalizeSearch(query);
    return (cases || []).filter(c => c.registry_number && CERTIFICATE_STATUSES.has(c.status))
      .filter(c => !q || normalizeSearch(`${c.registry_number} ${c.vessel_name} ${c.application_number}`).includes(q));
  }, [cases, query]);
  const columns: Column<CaseSummary>[] = [
    { key: 'registry', header: t.table.registry, sortValue: c => c.registry_number || '', csv: c => c.registry_number || '', render: c => <span className="cell-primary"><Ltr mono>{c.registry_number}</Ltr></span> },
    { key: 'vessel', header: t.table.vessel, sortValue: c => c.vessel_name, csv: c => c.vessel_name, render: c => <bdi>{c.vessel_name}</bdi> },
    { key: 'tonnage', header: t.table.tonnage, sortValue: c => Number(c.tonnage), csv: c => c.tonnage, render: c => <span className="num">{number(c.tonnage)}</span> },
    { key: 'application', header: t.table.application, sortValue: c => c.application_number, csv: c => c.application_number, render: c => <Link href={href(`/workspace/applications/${c.id}`)}><Ltr mono>{c.application_number}</Ltr></Link> },
    { key: 'status', header: t.table.status, sortValue: c => c.status, csv: c => label(t.statuses, c.status), render: c => <CaseStatusBadge status={c.status} /> },
    { key: 'updated', header: t.table.updated, sortValue: c => c.updated_at || '', csv: c => c.updated_at || '', render: c => <span className="nowrap subtle">{date(c.updated_at)}</span> },
    { key: 'actions', header: t.table.actions, className: 'cell-end', render: c => <a className="btn btn-sm btn-secondary" href={fileUrls.certificate(c.id)} aria-label={`${t.caseView.downloadCertificate}: ${c.registry_number}`}><Download size={14} aria-hidden="true" />PDF</a> },
  ];
  return (
    <div className="ws-page">
      <div className="ws-page-head">
        <div>
          <p className="page-eyebrow">{t.workspace.title}</p>
          <h1 className="ws-page-title">{t.workspace.registryTitle}</h1>
          <p className="muted">{t.workspace.registrySubtitle}</p>
        </div>
      </div>
      {!cases ? <div className="card card-pad"><Skeleton lines={6} /></div> : (
        <DataTable rows={rows} columns={columns} rowKey={c => c.id} caption={t.workspace.registryTitle} exportName="vessel-registry" initialSort={{ key: 'registry', direction: 'asc' }}
          toolbar={<label className="field field-search"><span className="field-label">{t.common.search}</span><span className="input-group"><Search size={18} className="input-icon" aria-hidden="true" /><input className="input input-sm" type="search" value={query} onChange={event => setQuery(event.target.value)} /></span></label>}
          empty={<EmptyState icon={BadgeCheck} title={t.workspace.registryEmpty} />} />
      )}
    </div>
  );
}
