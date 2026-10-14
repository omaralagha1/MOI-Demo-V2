'use client';

import { useState, type CSSProperties } from 'react';
import { CheckCircle2, ChevronDown, CircleDashed, Clock, Download, FileText, History, Upload, XCircle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { fileUrls } from '@/lib/cases/api';
import {
  documentChecklist, documentTone, GENERATED_DOCUMENTS, latestByType,
  type CaseActions, type CaseDetail, type CaseDocument,
} from '@/lib/cases/model';
import { StatusBadge } from '@/components/ui/primitives';
import { FileUploadField } from '@/components/ui/FileUploadField';
import { Spinner } from './CaseParts';

const stateIcon = { MISSING: CircleDashed, PENDING: Clock, VERIFIED: CheckCircle2, REJECTED: XCircle } as const;

type Props = {
  c: CaseDetail;
  actions: CaseActions;
  onUpload: (type: string, file: File) => Promise<boolean>;
  onVerify?: (document: CaseDocument) => void;
  onReject?: (document: CaseDocument) => void;
  busy?: string | null;
};

/** Required-document checklist with upload, versions and (for officers) verification controls. */
export function DocumentChecklist({ c, actions, onUpload, onVerify, onReject, busy }: Props) {
  const { t, f, label } = useI18n();
  const checklist = documentChecklist(c);
  const latest = latestByType(c.documents || []);
  const required = new Set(c.required_documents || []);
  const reportStage = ['INSPECTION_IN_PROGRESS', 'AWAITING_INSPECTION_REPORT'].includes(c.status) || latest.has('INSPECTION_REPORT');
  // The portal route has no required INSPECTION_REPORT at intake, but it becomes the key upload during inspection.
  const rows = [...checklist, ...(!required.has('INSPECTION_REPORT') && reportStage ? [{ type: 'INSPECTION_REPORT', state: latest.get('INSPECTION_REPORT')?.validation_result || 'MISSING', document: latest.get('INSPECTION_REPORT') || null }] : [])];
  const shown = new Set(rows.map(row => row.type));
  const issued = (c.documents || []).filter(document => GENERATED_DOCUMENTS.has(document.type) && (document.type !== 'CERTIFICATE_DRAFT' || actions.canViewDraft));
  const other = [...latest.values()].filter(document => !shown.has(document.type) && !GENERATED_DOCUMENTS.has(document.type));
  const extraUploadTypes = actions.uploadTypes.filter(type => !shown.has(type));

  return (
    <div className="stack" style={{ '--stack-gap': 'var(--space-6)' } as CSSProperties}>
      <ul className="doc-list">
        {rows.map(row => (
          <DocumentRow key={row.type} c={c} type={row.type} state={row.state} document={row.document} actions={actions} onUpload={onUpload} onVerify={onVerify} onReject={onReject} busy={busy} />
        ))}
      </ul>

      {issued.length > 0 && (
        <div>
          <h3 className="subheading">{t.caseView.issuedTitle}</h3>
          <ul className="doc-list">
            {issued.filter(document => latest.get(document.type)?.id === document.id).map(document => (
              <li key={document.id} className="doc-row">
                <span className="icon-tile" style={{ width: '2.5rem', height: '2.5rem' }}><FileText size={18} aria-hidden="true" /></span>
                <div style={{ minWidth: 0 }}>
                  <p className="doc-row-title">{label(t.documentTypes, document.type)}</p>
                  <p className="doc-row-meta"><span>{f(t.caseView.version, { version: document.version })}</span></p>
                </div>
                <div className="doc-row-actions">
                  <a className="btn btn-secondary btn-sm" href={document.type === 'INSPECTION_FORM' ? fileUrls.inspectionForm(c.id) : fileUrls.draft(c.id)}><Download size={16} aria-hidden="true" />{t.common.download}</a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(other.length > 0 || (actions.canUpload && extraUploadTypes.length > 0)) && (
        <OtherUploads c={c} documents={other} types={actions.canUpload ? extraUploadTypes : []} onUpload={onUpload} />
      )}
    </div>
  );
}

function DocumentRow({ c, type, state, document, actions, onUpload, onVerify, onReject, busy }: Omit<Props, 'onUpload'> & { type: string; state: string; document: CaseDocument | null; onUpload: Props['onUpload'] }) {
  const { t, f, label } = useI18n();
  const [replacing, setReplacing] = useState(false);
  const Icon = stateIcon[state as keyof typeof stateIcon] || Clock;
  const history = (c.documents || []).filter(item => item.type === type && item.id !== document?.id).sort((a, b) => b.version - a.version);
  const needsFile = state === 'MISSING' || state === 'REJECTED';
  const showUploader = actions.canUpload && (needsFile || replacing);
  const reviewing = document && actions.canReviewDocument(document);
  return (
    <li className={`doc-row ${state === 'MISSING' ? 'is-missing' : ''} ${state === 'REJECTED' ? 'is-rejected' : ''}`}>
      <span className={`icon-tile ${state === 'VERIFIED' ? 'icon-tile-success' : state === 'REJECTED' || state === 'MISSING' ? 'icon-tile-warning' : ''}`} style={{ width: '2.5rem', height: '2.5rem' }}><Icon size={18} aria-hidden="true" /></span>
      <div style={{ minWidth: 0 }}>
        <p className="doc-row-title">{label(t.documentTypes, type)}</p>
        <div className="doc-row-meta">
          <StatusBadge tone={documentTone(state)} icon={false}>{label(t.documentStates, state)}</StatusBadge>
          {document && <a href={fileUrls.document(c.id, document.id)} title={document.filename}><bdi>{document.filename}</bdi></a>}
          {document && <span>{f(t.caseView.version, { version: document.version })}</span>}
        </div>
        {state === 'REJECTED' && <p className="field-hint" style={{ color: 'var(--danger)', marginTop: 'var(--space-1)' }}>{t.caseView.rejectedHint}</p>}
        {history.length > 0 && (
          <details className="versions">
            <summary><History size={14} aria-hidden="true" />{f(t.caseView.previousVersions, { count: history.length })}</summary>
            <ul>
              {history.map(item => <li key={item.id}><a href={fileUrls.document(c.id, item.id)}><bdi>{item.filename}</bdi></a> · {f(t.caseView.version, { version: item.version })} · {label(t.documentStates, item.validation_result)}</li>)}
            </ul>
          </details>
        )}
      </div>
      <div className="doc-row-actions">
        {reviewing && onVerify && onReject && (
          <>
            <button type="button" className="btn btn-sm btn-success" onClick={() => onVerify(document!)} disabled={!!busy}>{busy === `documents/${document!.id}/review` ? <Spinner /> : <CheckCircle2 size={16} aria-hidden="true" />}{t.officer.verifyDocument}</button>
            <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => onReject(document!)} disabled={!!busy}><XCircle size={16} aria-hidden="true" />{t.officer.rejectDocument}</button>
          </>
        )}
        {actions.canUpload && !needsFile && (
          <button type="button" className="btn btn-sm btn-ghost" aria-expanded={replacing} onClick={() => setReplacing(value => !value)}><Upload size={16} aria-hidden="true" />{t.caseView.uploadNew}</button>
        )}
      </div>
      {showUploader && (
        <div className="doc-row-upload">
          <FileUploadField compact label={label(t.documentTypes, type)} disabled={!!busy} onUpload={async file => { const ok = await onUpload(type, file); if (ok) setReplacing(false); return ok; }} />
        </div>
      )}
    </li>
  );
}

function OtherUploads({ c, documents, types, onUpload }: { c: CaseDetail; documents: CaseDocument[]; types: string[]; onUpload: Props['onUpload'] }) {
  const { t, f, label } = useI18n();
  const [type, setType] = useState(types[0] || '');
  return (
    <details className="other-uploads" open={documents.length > 0}>
      <summary><span className="subheading" style={{ margin: 0 }}>{t.caseView.otherTitle}</span><ChevronDown size={18} aria-hidden="true" /></summary>
      {documents.length > 0 && (
        <ul className="doc-list" style={{ marginTop: 'var(--space-3)' }}>
          {documents.map(document => (
            <li key={document.id} className="doc-row">
              <span className="icon-tile" style={{ width: '2.5rem', height: '2.5rem' }}><FileText size={18} aria-hidden="true" /></span>
              <div style={{ minWidth: 0 }}>
                <p className="doc-row-title">{label(t.documentTypes, document.type)}</p>
                <p className="doc-row-meta"><a href={fileUrls.document(c.id, document.id)}><bdi>{document.filename}</bdi></a><span>{f(t.caseView.version, { version: document.version })}</span><span>{label(t.documentStates, document.validation_result)}</span></p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {types.length > 0 && (
        <div className="other-upload-form">
          <label className="field">
            <span className="field-label">{t.caseView.documentType}</span>
            <select className="select input-sm" value={type} onChange={event => setType(event.target.value)}>
              {types.map(option => <option key={option} value={option}>{label(t.documentTypes, option)}</option>)}
            </select>
          </label>
          <FileUploadField compact label={label(t.documentTypes, type)} onUpload={file => onUpload(type, file)} />
        </div>
      )}
    </details>
  );
}
