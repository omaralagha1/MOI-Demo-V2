'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, FileStack, FileText, GitBranch, History, MessageSquareText, Receipt, Stamp, Timer, UserRound, Zap } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { fileUrls } from '@/lib/cases/api';
import { caseActions, responsibleRole, type CaseDocument, type ViewUser } from '@/lib/cases/model';
import { Breadcrumbs, EmptyState, Ltr, Skeleton, StatusBadge } from '@/components/ui/primitives';
import { ConfirmationDialog, type DialogRequest } from '@/components/ui/ConfirmationDialog';
import { useCaseData } from '@/components/cases/useCaseData';
import { ErrorAlert } from '@/components/cases/errors';
import { ApplicationTimeline, ApprovalChain, CaseFacts, CaseStatusBadge, CertificatePanel, FeeSummary, NextActionCallout, Remarks, SlaSummary, WorkflowFlow } from '@/components/cases/CaseParts';
import { DocumentChecklist } from '@/components/cases/DocumentChecklist';
import { OfficerActionPanel, SubmitPanel } from '@/components/cases/ActionPanels';
import { useWorkspace } from './WorkspaceShell';

export function StaffCaseView({ id, user }: { id: string; user: ViewUser }) {
  const { t, href, label, number } = useI18n();
  const { reload: reloadList } = useWorkspace();
  const base = useCaseData(id);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  // Keep the sidebar counts in step with actions taken here.
  const controller = { ...base, action: async (suffix: string, body?: object, success?: string) => { const result = await base.action(suffix, body, success); reloadList(); return result; } };
  const { data, loadError, actionError, busy } = controller;
  const crumbs = (current: string) => <Breadcrumbs label={t.a11y.breadcrumb} items={[{ label: t.workspace.title, href: href('/workspace') }, { label: t.workspace.navApplications, href: href('/workspace/applications') }, { label: current }]} />;

  if (!data) {
    return (
      <div className="ws-page">
        {crumbs(t.common.loading)}
        {loadError ? <div className="card"><EmptyState title={t.caseView.notFound} action={<Link className="btn btn-secondary" href={href('/workspace/applications')}><ArrowLeft size={16} aria-hidden="true" className="flip-rtl" />{t.caseView.backToWorkspace}</Link>} /></div>
          : <div className="staff-case-grid"><div className="card card-pad"><Skeleton lines={8} /></div><div className="card card-pad"><Skeleton lines={10} /></div></div>}
      </div>
    );
  }

  const { detail: c, events, approvals, fee, sla } = data;
  const actions = caseActions(user, c, approvals);
  const ask = (request: DialogRequest) => setDialog(request);
  const role = responsibleRole(c);
  const verify = (document: CaseDocument) => controller.action(`documents/${document.id}/review`, { result: 'VERIFIED' }, `${t.documentStates.VERIFIED}: ${label(t.documentTypes, document.type)}`);
  const reject = (document: CaseDocument) => ask({
    title: t.officer.rejectTitle, body: label(t.documentTypes, document.type), confirmLabel: t.officer.rejectDocument, tone: 'danger', reason: { label: t.officer.rejectReason, hint: t.officer.rejectHint },
    onConfirm: reason => { controller.action(`documents/${document.id}/review`, { result: 'REJECTED', reason }); },
  });
  const approve = (step: { id: string }) => ask({ title: t.caseView.approveConfirmTitle, body: t.caseView.approveConfirmBody, confirmLabel: t.caseView.approve, onConfirm: () => { controller.action(`approvals/${step.id}/decision`, { result: 'APPROVED' }); } });
  const canApproveNow = !!actions.nextApproval && actions.canApprove(actions.nextApproval);
  const pendingReview = c.unverified_documents?.length && !['DRAFT', 'NEEDS_INFORMATION'].includes(c.status);

  return (
    <div className="ws-page">
      <div className="case-header card">
        {crumbs(c.application_number)}
        <div className="case-header-main">
          <div style={{ minWidth: 0 }}>
            <h1 className="ws-page-title"><bdi>{c.vessel_name}</bdi></h1>
            <p className="case-header-meta">
              <Ltr mono>{c.application_number}</Ltr>
              <span>{label(t.channels, c.intake_channel)}</span>
              <span>{label(t.partyCategories, c.party_category)}</span>
              {role && <span className="with-chip"><UserRound size={14} aria-hidden="true" />{t.caseView.waitingOn}: <strong>{role === user.role ? t.common.you : label(t.roles, role)}</strong></span>}
            </p>
          </div>
          <CaseStatusBadge status={c.status} size="lg" />
        </div>
      </div>

      {actionError ? <ErrorAlert error={actionError} /> : null}

      <div className="staff-case-grid">
        <div className="stack" style={{ '--stack-gap': 'var(--space-6)' } as React.CSSProperties}>
          <section className="card card-pad action-card" aria-labelledby="actions-title">
            <div className="card-head"><h2 className="card-title" id="actions-title"><Zap size={20} aria-hidden="true" />{t.officer.panelTitle}</h2></div>
            <NextActionCallout c={c} user={user} />
            <div style={{ marginTop: 'var(--space-5)' }}>
              {canApproveNow && (
                <div className="callout-actions" style={{ marginTop: 0, marginBottom: actions.isOfficer ? 'var(--space-4)' : 0 }}>
                  <a className="btn btn-secondary" href={fileUrls.draft(c.id)}><FileText size={18} aria-hidden="true" />{t.caseView.openDraft}</a>
                  <button type="button" className="btn btn-success" onClick={() => approve(actions.nextApproval!)} disabled={!!busy}><Stamp size={18} aria-hidden="true" />{t.caseView.approve}</button>
                </div>
              )}
              {actions.isOfficer ? <OfficerActionPanel c={c} actions={actions} controller={controller} ask={ask} hasOtherActions={canApproveNow} fee={fee} />
                : !canApproveNow && <p className="muted">{['SERVICE_ADMIN', 'AUDITOR'].includes(user.role) ? t.officer.readOnly : t.officer.noActions}</p>}
            </div>
            {actions.canSubmit && <div className="submit-section"><h3 className="subheading">{t.caseView.reviewSubmitTitle}</h3><SubmitPanel c={c} actions={actions} controller={controller} ask={ask} /></div>}
          </section>

          <section className="card card-pad" aria-labelledby="docs-title">
            <div className="card-head">
              <div>
                <h2 className="card-title" id="docs-title"><FileStack size={20} aria-hidden="true" />{t.caseView.documentsTitle}</h2>
                {pendingReview ? <p className="card-subtitle">{t.caseView.pendingVerification}: {c.unverified_documents.map(type => label(t.documentTypes, type)).join(' · ')}</p> : null}
              </div>
            </div>
            <DocumentChecklist c={c} actions={actions} onUpload={controller.upload} onVerify={verify} onReject={reject} busy={busy} />
          </section>

          {approvals.length > 0 && (
            <section className="card card-pad" aria-labelledby="approvals-title">
              <div className="card-head"><h2 className="card-title" id="approvals-title"><Stamp size={20} aria-hidden="true" />{t.caseView.approvalsTitle}</h2></div>
              <ApprovalChain c={c} approvals={approvals} actions={actions} onApprove={approve} busy={busy} />
            </section>
          )}

          <CertificatePanel c={c} actions={actions} />

          <section className="card card-pad" aria-labelledby="history-title">
            <div className="card-head"><h2 className="card-title" id="history-title"><History size={20} aria-hidden="true" />{t.caseView.timelineTitle}</h2><span className="subtle num">{number(events.length)}</span></div>
            <div className="scroll-area"><ApplicationTimeline events={events} user={user} showActorRef /></div>
          </section>
        </div>

        <aside className="stack staff-aside" style={{ '--stack-gap': 'var(--space-6)' } as React.CSSProperties}>
          <section className="card card-pad" aria-labelledby="flow-title">
            <h2 className="card-title aside-title" id="flow-title"><GitBranch size={18} aria-hidden="true" />{t.caseView.progress}</h2>
            <div className="scroll-area" style={{ maxHeight: '26rem' }}><WorkflowFlow c={c} events={events} /></div>
          </section>
          <section className="card card-pad" aria-labelledby="facts-title">
            <h2 className="card-title aside-title" id="facts-title">{t.caseView.summary}</h2>
            <CaseFacts c={c} events={events} staff />
          </section>
          <section className="card card-pad" aria-labelledby="fee-title">
            <h2 className="card-title aside-title" id="fee-title"><Receipt size={18} aria-hidden="true" />{t.caseView.feesTitle}</h2>
            <FeeSummary fee={fee} />
          </section>
          <section className="card card-pad" aria-labelledby="remarks-title">
            <h2 className="card-title aside-title" id="remarks-title"><MessageSquareText size={18} aria-hidden="true" />{t.caseView.remarksTitle}</h2>
            <Remarks events={events} />
          </section>
          <section className="card card-pad" aria-labelledby="sla-title">
            <h2 className="card-title aside-title" id="sla-title"><Timer size={18} aria-hidden="true" />{t.caseView.slaTitle}</h2>
            <SlaSummary sla={sla} />
            {c.status === 'NEEDS_INFORMATION' && <p style={{ marginTop: 'var(--space-3)' }}><StatusBadge tone="warning">{t.caseView.returned}</StatusBadge></p>}
          </section>
        </aside>
      </div>
      <ConfirmationDialog request={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
