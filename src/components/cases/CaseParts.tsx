'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import {
  AlertTriangle, Award, BadgeCheck, Check, CheckCircle2, ClipboardCheck, Clock, Download, ExternalLink, FileCheck2, FilePen, FilePlus2, FileText, FileX2,
  Inbox, Loader2, MessageSquareWarning, Receipt, Send, ShieldCheck, Ship, Stamp, Timer, Upload, UserRound, Wallet, type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { fileUrls } from '@/lib/cases/api';
import {
  approvalTone, nextStepKey, paymentTone, responsibleRole, stageIndex, statusTone, workflowPosition,
  type Approval, type AuditEvent, type CaseActions, type CaseDetail, type CaseSummary, type Fee, type Sla, type Tone, type ViewUser,
} from '@/lib/cases/model';
import { Ltr, StatusBadge } from '@/components/ui/primitives';

export function CaseStatusBadge({ status, size }: { status: string; size?: 'lg' }) {
  const { t, label } = useI18n();
  return <StatusBadge tone={statusTone(status)} size={size}>{label(t.statuses, status)}</StatusBadge>;
}

export function Spinner() { return <Loader2 className="spinner" size={16} aria-hidden="true" />; }

/** Six-stage applicant progress indicator. */
export function StageStepper({ status }: { status: string }) {
  const { t } = useI18n();
  const current = stageIndex(status);
  const completed = status === 'COMPLETED';
  return (
    <ol className="stepper" aria-label={t.caseView.progress}>
      {t.caseView.stages.map((stage, index) => {
        const done = index < current || completed;
        const isCurrent = index === current && !completed;
        const returned = isCurrent && status === 'NEEDS_INFORMATION';
        return (
          <li key={stage} className={`stepper-item ${done ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''} ${returned ? 'is-returned' : ''}`} aria-current={isCurrent ? 'step' : undefined}>
            <span className="stepper-dot">{done ? <Check size={16} aria-hidden="true" /> : returned ? <AlertTriangle size={15} aria-hidden="true" /> : index + 1}</span>
            <span>{stage}{isCurrent && <span className="sr-only"> ({t.caseView.currentStage})</span>}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** "What happens next" with who the case is waiting on, plus any actions for the viewer. */
export function NextActionCallout({ c, user, children }: { c: CaseSummary; user: ViewUser; children?: ReactNode }) {
  const { t, label } = useI18n();
  const role = responsibleRole(c);
  const isOwner = [c.owner_id, c.representative_id].includes(user.id);
  const mine = (role === 'APPLICANT' && isOwner) || (role !== null && role === user.role);
  const done = c.status === 'COMPLETED';
  return (
    <div className={`callout ${done ? 'is-done' : mine ? 'is-applicant' : ''}`}>
      <span className={`icon-tile ${done ? 'icon-tile-success' : mine ? 'icon-tile-warning' : ''}`}>{done ? <CheckCircle2 size={22} aria-hidden="true" /> : mine ? <AlertTriangle size={22} aria-hidden="true" /> : <Timer size={22} aria-hidden="true" />}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="callout-title">{mine && !done ? t.caseView.yourAction : t.caseView.nextAction}</p>
        <p className="callout-text">{label(t.nextSteps, nextStepKey(c))}</p>
        {role && !done && <p className="callout-meta"><UserRound size={16} aria-hidden="true" />{t.caseView.waitingOn}: <strong>{mine ? t.common.you : label(t.roles, role)}</strong></p>}
        {children && <div className="callout-actions">{children}</div>}
      </div>
    </div>
  );
}

/** Detailed status-by-status workflow for the case's route, with who acts at each step. */
export function WorkflowFlow({ c, events }: { c: CaseSummary; events: AuditEvent[] }) {
  const { t, label, date } = useI18n();
  const { sequence, currentIndex, returned } = workflowPosition(c, events);
  const reached = new Map<string, string>();
  for (const event of events) if (!reached.has(event.to_status)) reached.set(event.to_status, event.created_at);
  const completed = c.status === 'COMPLETED';
  const list = useRef<HTMLOListElement>(null);
  // Keep the current step in view inside the scrollable panel (without scrolling the page).
  useEffect(() => {
    const current = list.current?.querySelector<HTMLElement>('[aria-current="step"]');
    const scroller = list.current?.parentElement;
    if (current && scroller && scroller.scrollHeight > scroller.clientHeight) scroller.scrollTop = Math.max(0, current.offsetTop - scroller.offsetTop - scroller.clientHeight / 3);
  }, [currentIndex]);
  return (
    <ol className="flow" aria-label={t.caseView.progress} ref={list}>
      {sequence.map((status, index) => {
        const done = index < currentIndex || (completed && index === currentIndex);
        const current = index === currentIndex && !completed;
        const role = responsibleRole({ status, intake_channel: c.intake_channel, owner_id: c.owner_id });
        return (
          <li key={status} className={`flow-item ${done ? 'is-done' : ''} ${current ? (returned ? 'is-returned' : 'is-current') : ''}`} aria-current={current ? 'step' : undefined}>
            <span className="flow-marker">{done ? <Check size={13} aria-hidden="true" /> : current && returned ? <AlertTriangle size={12} aria-hidden="true" /> : null}</span>
            <div>
              <p className="flow-title">{label(t.statuses, status)}</p>
              <p className="flow-meta">
                {current && returned && <StatusBadge tone="warning">{t.caseView.returned}</StatusBadge>}
                {role && status !== 'COMPLETED' && <span>{label(t.roles, role)}</span>}
                {reached.get(status) && (done || current) && <span>· {date(reached.get(status))}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export const eventVisual: Record<string, [LucideIcon, Tone]> = {
  createCase: [FilePlus2, 'neutral'], updateCase: [FilePen, 'neutral'], uploadDocument: [Upload, 'info'], submit: [Send, 'info'],
  missingEvidence: [AlertTriangle, 'warning'], documentVerified: [FileCheck2, 'success'], documentRejected: [FileX2, 'danger'],
  officerReceivedAndVerifiedDocuments: [ClipboardCheck, 'success'], inspectionFormIssued: [FileText, 'info'], feeAssessed: [Receipt, 'info'],
  demoPaymentVerified: [Wallet, 'success'], centerFeeReceiptVerified: [Wallet, 'success'], documentsHandedOverForInspection: [Ship, 'info'],
  inspectedPapersReturned: [Send, 'info'], validatedInspectionReportReceived: [ShieldCheck, 'success'], requestInfo: [MessageSquareWarning, 'warning'],
  finalFileApproved: [BadgeCheck, 'success'], draftGenerated: [FilePen, 'approval'], approvalDecision: [Stamp, 'approval'],
  officerReceivedApprovedDraft: [Inbox, 'approval'], officerReleasedCertificate: [Award, 'success'], deliveryAcknowledged: [CheckCircle2, 'success'],
};

/** Audit history, newest first, with localized actions, roles and recorded reasons. */
export function ApplicationTimeline({ events, user, showActorRef }: { events: AuditEvent[]; user: ViewUser; showActorRef?: boolean }) {
  const { t, label, dateTime, f } = useI18n();
  if (!events.length) return <p className="muted">{t.caseView.timelineEmpty}</p>;
  return (
    <ol className="timeline">
      {[...events].reverse().map((event, index) => {
        const [Icon, tone] = eventVisual[event.action] || [Clock, 'neutral'];
        const detail = event.detail || {};
        const documentType = typeof detail.type === 'string' ? detail.type : null;
        const reason = typeof detail.reason === 'string' ? detail.reason : null;
        const version = typeof detail.version === 'number' ? detail.version : null;
        const result = typeof detail.result === 'string' ? detail.result : null;
        return (
          <li className="timeline-item" key={`${event.created_at}-${index}`}>
            <span className={`timeline-icon tone-${tone}`}><Icon size={16} aria-hidden="true" /></span>
            <div>
              <p className="timeline-title">
                {label(t.auditActions, event.action)}
                {documentType && <span className="muted"> · {label(t.documentTypes, documentType)}{version ? ` · ${f(t.caseView.version, { version })}` : ''}</span>}
                {result && event.action === 'approvalDecision' && <span className="muted"> · {label(t.approvalResults, result)}</span>}
              </p>
              <p className="timeline-meta">
                <span>{event.actor === user.id ? t.common.you : label(t.roles, event.role)}</span>
                {showActorRef && event.actor !== user.id && <Ltr mono>{event.actor.slice(0, 8)}</Ltr>}
                <time dateTime={event.created_at}>{dateTime(event.created_at)}</time>
                {event.from_status !== event.to_status && <span>→ {label(t.statuses, event.to_status)}</span>}
              </p>
              {reason && <p className="timeline-note">{reason}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function FeeSummary({ fee, actions, onPay, busy }: { fee: Fee; actions?: CaseActions; onPay?: () => void; busy?: boolean }) {
  const { t, label, number } = useI18n();
  const rows: [string, string][] = [[t.caseView.feeFixed, fee.fixed_amount], [t.caseView.feeWages, fee.wages], [t.caseView.feeViolations, fee.violations]];
  return (
    <div className="fee-summary">
      <dl className="dl dl-inline">
        {rows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd className="num">{number(value, 2)}</dd></div>)}
        <div className="fee-total"><dt>{t.caseView.feeTotal}</dt><dd className="num">{number(fee.total_amount, 2)} <span className="subtle" style={{ fontWeight: 400, fontSize: 'var(--text-xs)' }}>{fee.currency || t.caseView.currencyPending}</span></dd></div>
      </dl>
      <p className="fee-state"><span className="subtle">{t.caseView.paymentStatus}</span><StatusBadge tone={paymentTone(fee.payment_state)}>{label(t.paymentStates, fee.payment_state)}</StatusBadge></p>
      {fee.receipt_reference && !fee.receipt_reference.startsWith('DEMO-') && <p className="field-hint">{t.caseView.receiptReference}: <Ltr mono>{fee.receipt_reference}</Ltr></p>}
      {actions?.canSimulatePayment && onPay && (
        <div className="pay-box">
          <button type="button" className="btn btn-accent btn-block" onClick={onPay} disabled={busy}>{busy ? <Spinner /> : <Wallet size={18} aria-hidden="true" />}{t.caseView.pay}</button>
          <p className="field-hint">{t.caseView.payNote}</p>
        </div>
      )}
    </div>
  );
}

export function ApprovalChain({ c, approvals, actions, onApprove, busy }: { c: CaseDetail; approvals: Approval[]; actions: CaseActions; onApprove?: (step: Approval) => void; busy?: string | null }) {
  const { t, f, label, date } = useI18n();
  return (
    <div>
      <ol className="approval-chain">
        {approvals.map(step => {
          const current = step.id === actions.nextApproval?.id;
          return (
            <li key={step.id} className={`approval-step ${current ? 'is-current' : ''} ${step.result === 'APPROVED' ? 'is-done' : ''}`}>
              <span className="approval-index">{step.result === 'APPROVED' ? <Check size={16} aria-hidden="true" /> : step.sequence + 1}</span>
              <div className="approval-body">
                <p className="approval-role">{label(t.roles, step.role)}</p>
                <p className="approval-meta">
                  <StatusBadge tone={approvalTone(step.result)}>{label(t.approvalResults, step.result)}</StatusBadge>
                  {current && <span className="badge tone-info">{t.caseView.approvalCurrent}</span>}
                  {step.decided_at && <span>{f(t.caseView.approvalDecided, { date: date(step.decided_at) })}</span>}
                </p>
              </div>
              {actions.canApprove(step) && onApprove && (
                <button type="button" className="btn btn-sm btn-success" onClick={() => onApprove(step)} disabled={!!busy}>{busy === `approvals/${step.id}/decision` ? <Spinner /> : <Stamp size={16} aria-hidden="true" />}{t.caseView.approve}</button>
              )}
            </li>
          );
        })}
      </ol>
      {actions.canViewDraft && <a className="link-button" href={fileUrls.draft(c.id)} style={{ marginTop: 'var(--space-4)' }}><FileText size={16} aria-hidden="true" />{t.caseView.openDraft}</a>}
    </div>
  );
}

/** Released certificate: download, verification link and (portal owners) acknowledgement. */
export function CertificatePanel({ c, actions, onAcknowledge, busy }: { c: CaseDetail; actions: CaseActions; onAcknowledge?: () => void; busy?: boolean }) {
  const { t, label } = useI18n();
  if (!actions.showCertificate) return null;
  return (
    <section className="certificate-panel card card-pad" aria-labelledby="certificate-title">
      <div className="certificate-art" aria-hidden="true"><Award size={30} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 className="card-title" id="certificate-title">{t.caseView.certificateTitle}</h2>
        <p className="muted" style={{ marginTop: 'var(--space-1)' }}>{label(t.statuses, c.status)}{c.registry_number && <> · {t.caseView.registryNumber}: <Ltr mono>{c.registry_number}</Ltr></>}</p>
        <p className="field-hint" style={{ marginTop: 'var(--space-2)' }}>{t.caseView.certificateNote}</p>
        <div className="callout-actions">
          <a className="btn" href={fileUrls.certificate(c.id)}><Download size={18} aria-hidden="true" />{t.caseView.downloadCertificate}</a>
          {c.verification_path && <a className="btn btn-secondary" href={c.verification_path} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" />{t.caseView.openVerification}<span className="sr-only"> {t.a11y.newTab}</span></a>}
          {actions.canAcknowledgePortal && onAcknowledge && <button type="button" className="btn btn-success" onClick={onAcknowledge} disabled={busy}>{busy ? <Spinner /> : <CheckCircle2 size={18} aria-hidden="true" />}{t.caseView.acknowledge}</button>}
        </div>
      </div>
    </section>
  );
}

/** Key facts about the vessel and application. */
export function CaseFacts({ c, events, staff }: { c: CaseDetail; events: AuditEvent[]; staff?: boolean }) {
  const { t, label, dateTime, number } = useI18n();
  const created = c.created_at || events[0]?.created_at;
  const submitted = events.find(event => ['submit', 'inspectedPapersReturned'].includes(event.action) && ['DRAFT', 'NEEDS_INFORMATION'].includes(event.from_status || ''))?.created_at;
  const items: [string, ReactNode][] = [
    [t.caseView.applicationNumber, <Ltr mono key="n">{c.application_number}</Ltr>],
    [t.caseView.service, `${t.services['small-vessel-registration'].name} · A.4.1/1`],
    [t.caseView.route, label(t.channels, c.intake_channel)],
    [t.caseView.category, label(t.partyCategories, c.party_category)],
    [t.caseView.tonnage, <span key="t"><span className="num">{number(c.tonnage)}</span> <span className="subtle" style={{ fontWeight: 400 }}>({t.caseView.tonnageUnit})</span></span>],
    [t.caseView.foreignFlag, c.foreign_flag ? t.common.yes : t.common.no],
    [t.caseView.representative, c.representative_id ? <Ltr key="r">{c.representative_id}</Ltr> : t.common.none],
    ...(staff ? [[t.caseView.owner, <Ltr mono key="o">{c.owner_id.slice(0, 18)}{c.owner_id.length > 18 ? '…' : ''}</Ltr>] as [string, ReactNode]] : []),
    ...(c.registry_number ? [[t.caseView.registryNumber, <Ltr mono key="g">{c.registry_number}</Ltr>] as [string, ReactNode]] : []),
    ...(created ? [[t.caseView.created, dateTime(created)] as [string, ReactNode]] : []),
    ...(submitted ? [[t.caseView.submitted, dateTime(submitted)] as [string, ReactNode]] : []),
    ...(c.updated_at ? [[t.caseView.updated, dateTime(c.updated_at)] as [string, ReactNode]] : []),
  ];
  return <dl className="dl dl-inline">{items.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>;
}

export function SlaSummary({ sla }: { sla: Sla | null }) {
  const { t, f, dateTime, number } = useI18n();
  if (!sla) return null;
  return (
    <dl className="dl dl-inline">
      <div><dt>{t.caseView.slaTargetLabel}</dt><dd>{f(t.caseView.slaTarget, { min: number(sla.target_working_days[0]), max: number(sla.target_working_days[1]) })}</dd></div>
      <div><dt>{t.caseView.slaStarted}</dt><dd>{sla.started_at ? dateTime(sla.started_at) : <span className="muted" style={{ fontWeight: 400 }}>{t.caseView.slaNotStarted}</span>}</dd></div>
      <p className="field-hint" style={{ paddingTop: 'var(--space-2)' }}>{t.caseView.slaCalendar}</p>
    </dl>
  );
}

export function Remarks({ events }: { events: AuditEvent[] }) {
  const { t, label, dateTime } = useI18n();
  const remarks = events.filter(event => typeof event.detail?.reason === 'string' && (event.detail.reason as string).trim()).reverse();
  if (!remarks.length) return <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>{t.caseView.remarksEmpty}</p>;
  return (
    <ul className="remarks">
      {remarks.map((event, index) => (
        <li key={index}>
          <p className="remark-text">{event.detail!.reason as string}</p>
          <p className="timeline-meta">
            <span>{label(t.auditActions, event.action)}</span>
            {typeof event.detail?.type === 'string' && <span>· {label(t.documentTypes, event.detail.type as string)}</span>}
            <span>· {label(t.roles, event.role)}</span>
            <time dateTime={event.created_at}>· {dateTime(event.created_at)}</time>
          </p>
        </li>
      ))}
    </ul>
  );
}
