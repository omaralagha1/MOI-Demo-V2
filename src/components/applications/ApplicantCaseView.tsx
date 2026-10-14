'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ClipboardList, Download, FileStack, History, LifeBuoy, Receipt, Stamp, Timer } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { fileUrls } from '@/lib/cases/api';
import { caseActions, EDITABLE_STATUSES, type ViewUser } from '@/lib/cases/model';
import { Breadcrumbs, EmptyState, Ltr, PageHeader, Skeleton } from '@/components/ui/primitives';
import { ConfirmationDialog, type DialogRequest } from '@/components/ui/ConfirmationDialog';
import { useCaseData } from '@/components/cases/useCaseData';
import { ErrorAlert } from '@/components/cases/errors';
import { ApplicationTimeline, ApprovalChain, CaseFacts, CaseStatusBadge, CertificatePanel, FeeSummary, NextActionCallout, Remarks, SlaSummary, StageStepper } from '@/components/cases/CaseParts';
import { DocumentChecklist } from '@/components/cases/DocumentChecklist';
import { InspectionActions, SubmitPanel } from '@/components/cases/ActionPanels';
import { WizardSteps } from './WizardSteps';

export function ApplicantCaseView({ id, user }: { id: string; user: ViewUser }) {
  const { t, href, label } = useI18n();
  const controller = useCaseData(id);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const { data, loadError, actionError, busy } = controller;

  const crumbs = (current: string) => <Breadcrumbs label={t.a11y.breadcrumb} items={[{ label: t.nav.home, href: href('/') }, { label: t.nav.myApplications, href: href('/applications') }, { label: current }]} />;

  if (!data) {
    return (
      <>
        <PageHeader breadcrumbs={crumbs(t.common.loading)} title={loadError ? t.dashboard.title : <span className="skeleton" style={{ display: 'inline-block', width: '16rem', height: '2.2rem' }} aria-label={t.caseView.loading} />} />
        <div className="container section-tight">
          {loadError ? (
            <div className="card"><EmptyState title={t.caseView.notFound} action={<Link className="btn btn-secondary" href={href('/applications')}>{t.caseView.backToList}</Link>} /></div>
          ) : <div className="case-layout"><div className="card card-pad"><Skeleton lines={5} /></div><div className="card card-pad"><Skeleton lines={6} /></div></div>}
        </div>
      </>
    );
  }

  const { detail: c, events, approvals, fee, sla } = data;
  const actions = caseActions(user, c, approvals);
  const draft = c.status === 'DRAFT';
  const ask = (request: DialogRequest) => setDialog(request);
  const pay = () => ask({ title: t.caseView.payConfirmTitle, body: t.caseView.payConfirmBody, confirmLabel: t.caseView.pay, onConfirm: () => { controller.action('payment-simulation'); } });
  const acknowledge = () => ask({ title: t.caseView.acknowledgeConfirmTitle, body: t.caseView.acknowledgeConfirmBody, confirmLabel: t.caseView.acknowledge, onConfirm: () => { controller.action('delivery/acknowledge', { mode: 'PORTAL' }); } });

  return (
    <>
      <PageHeader
        breadcrumbs={crumbs(c.application_number)}
        eyebrow={<>{t.services['small-vessel-registration'].name} · <Ltr>A.4.1/1</Ltr></>}
        title={<bdi>{c.vessel_name}</bdi>}
        subtitle={<><Ltr mono>{c.application_number}</Ltr> · {label(t.channels, c.intake_channel)}</>}
        actions={<CaseStatusBadge status={c.status} size="lg" />}
      />
      <div className="container section-tight">
        {draft && <div className="card card-pad wizard-card"><WizardSteps current={actions.canSubmit && !c.missing_documents.length ? 4 : 3} /></div>}
        <div className="case-layout">
          <div className="case-main">
            {actionError ? <ErrorAlert error={actionError} /> : null}

            {!draft && (
              <section className="card card-pad" aria-labelledby="progress-title">
                <div className="card-head"><h2 className="card-title" id="progress-title"><ClipboardList size={20} aria-hidden="true" />{t.caseView.progress}</h2></div>
                <StageStepper status={c.status} />
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <NextActionCallout c={c} user={user}>
                    {actions.hasInspectionForm && c.status === 'AWAITING_INSPECTION' && <a className="btn btn-secondary" href={fileUrls.inspectionForm(c.id)}><Download size={18} aria-hidden="true" />{t.caseView.downloadForm}</a>}
                    <InspectionActions actions={actions} controller={controller} compact />
                    {actions.canSimulatePayment && <button type="button" className="btn btn-accent" onClick={pay} disabled={!!busy}>{t.caseView.pay}</button>}
                  </NextActionCallout>
                </div>
              </section>
            )}

            <CertificatePanel c={c} actions={actions} onAcknowledge={acknowledge} busy={busy === 'delivery/acknowledge'} />

            <section className="card card-pad" aria-labelledby="documents-title">
              <div className="card-head">
                <div>
                  <h2 className="card-title" id="documents-title"><FileStack size={20} aria-hidden="true" />{EDITABLE_STATUSES.has(c.status) ? t.caseView.checklistTitle : t.caseView.documentsTitle}</h2>
                  {actions.canUpload && <p className="card-subtitle">{t.caseView.checklistHint}</p>}
                </div>
              </div>
              <DocumentChecklist c={c} actions={actions} onUpload={controller.upload} busy={busy} />
              {actions.canSubmit && (
                <div className="submit-section">
                  <h3 className="subheading">{t.caseView.reviewSubmitTitle}</h3>
                  <SubmitPanel c={c} actions={actions} controller={controller} ask={ask} />
                </div>
              )}
            </section>

            <section className="card card-pad" aria-labelledby="activity-title">
              <div className="card-head"><h2 className="card-title" id="activity-title"><History size={20} aria-hidden="true" />{t.caseView.timelineTitle}</h2></div>
              <div className="scroll-area"><ApplicationTimeline events={events} user={user} /></div>
            </section>
          </div>

          <aside className="case-aside">
            <section className="card card-pad" aria-labelledby="summary-title">
              <h2 className="card-title aside-title" id="summary-title">{t.caseView.summary}</h2>
              <CaseFacts c={c} events={events} />
            </section>
            <section className="card card-pad" aria-labelledby="fees-title">
              <h2 className="card-title aside-title" id="fees-title"><Receipt size={18} aria-hidden="true" />{t.caseView.feesTitle}</h2>
              <FeeSummary fee={fee} actions={actions} onPay={pay} busy={busy === 'payment-simulation'} />
            </section>
            {approvals.length > 0 && (
              <section className="card card-pad" aria-labelledby="approvals-title">
                <h2 className="card-title aside-title" id="approvals-title"><Stamp size={18} aria-hidden="true" />{t.caseView.approvalsTitle}</h2>
                <ApprovalChain c={c} approvals={approvals} actions={actions} />
              </section>
            )}
            {events.some(event => typeof event.detail?.reason === 'string') && (
              <section className="card card-pad" aria-labelledby="remarks-title">
                <h2 className="card-title aside-title" id="remarks-title">{t.caseView.remarksTitle}</h2>
                <Remarks events={events} />
              </section>
            )}
            <section className="card card-pad" aria-labelledby="sla-title">
              <h2 className="card-title aside-title" id="sla-title"><Timer size={18} aria-hidden="true" />{t.caseView.slaTitle}</h2>
              <SlaSummary sla={sla} />
            </section>
            <section className="card card-pad help-card">
              <LifeBuoy size={22} aria-hidden="true" />
              <div>
                <h2 className="card-title aside-title">{t.caseView.helpTitle}</h2>
                <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>{t.caseView.helpBody}</p>
                <Link className="link-button" href={href('/help')}>{t.nav.help}</Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
      <ConfirmationDialog request={dialog} onClose={() => setDialog(null)} />
    </>
  );
}
