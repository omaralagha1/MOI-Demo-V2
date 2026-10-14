'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { BadgeCheck, CheckCircle2, ClipboardCheck, FilePen, FileText, Inbox, MessageSquareWarning, Receipt, Send, ShieldCheck, Ship, Truck, Wallet } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { documentChecklist, type CaseActions, type CaseDetail, type Fee } from '@/lib/cases/model';
import { Alert } from '@/components/ui/primitives';
import type { DialogRequest } from '@/components/ui/ConfirmationDialog';
import { Spinner } from './CaseParts';
import type { CaseController } from './useCaseData';

type Ask = (request: DialogRequest) => void;

/** Applicant "Review and submit" step for draft or returned applications. */
export function SubmitPanel({ c, actions, controller, ask }: { c: CaseDetail; actions: CaseActions; controller: CaseController; ask: Ask }) {
  const { t, f, label, locale } = useI18n();
  const outstanding = documentChecklist(c).filter(item => item.state === 'MISSING' || item.state === 'REJECTED');
  const [missingAfterSubmit, setMissingAfterSubmit] = useState<string[] | null>(null);
  if (!actions.canSubmit) return null;
  const submit = () => ask({
    title: t.caseView.submitConfirmTitle, body: t.caseView.submitConfirmBody, confirmLabel: c.status === 'NEEDS_INFORMATION' ? t.caseView.resubmit : t.caseView.submit,
    onConfirm: async () => {
      const result = await controller.action('submit');
      setMissingAfterSubmit(result?.missing?.length ? result.missing : null);
    },
  });
  return (
    <div className="submit-panel">
      {outstanding.length ? (
        <Alert tone="warning" title={t.caseView.notReady}>
          <ul className="inline-list">{outstanding.map(item => <li key={item.type}>{label(t.documentTypes, item.type)}</li>)}</ul>
        </Alert>
      ) : <Alert tone="success">{t.caseView.readyToSubmit}</Alert>}
      {missingAfterSubmit && <Alert tone="warning" role="alert">{f(t.caseView.submittedMissing, { documents: missingAfterSubmit.map(type => label(t.documentTypes, type)).join(locale === 'ar' ? '، ' : ', ') })}</Alert>}
      <div className="form-actions form-actions-end">
        <button type="button" className="btn btn-lg" onClick={submit} disabled={!!controller.busy}>
          {controller.busy === 'submit' ? <Spinner /> : <Send size={18} aria-hidden="true" className="flip-rtl" />}
          {c.status === 'NEEDS_INFORMATION' ? t.caseView.resubmit : t.caseView.submit}
        </button>
      </div>
    </div>
  );
}

/** Applicant inspection-stage actions (handover / return of inspected papers). */
export function InspectionActions({ actions, controller, compact }: { actions: CaseActions; controller: CaseController; compact?: boolean }) {
  const { t } = useI18n();
  if (!actions.canHandover && !actions.canReturnPapers) return null;
  return (
    <>
      {actions.canHandover && (
        <div className="action-block">
          {!compact && <p className="field-hint">{t.caseView.handoverHint}</p>}
          <button type="button" className="btn btn-accent" onClick={() => controller.action('inspection/handover')} disabled={!!controller.busy}>{controller.busy === 'inspection/handover' ? <Spinner /> : <Ship size={18} aria-hidden="true" />}{t.caseView.handover}</button>
        </div>
      )}
      {actions.canReturnPapers && (
        <div className="action-block">
          {!compact && <p className="field-hint">{t.caseView.returnHint}</p>}
          <button type="button" className="btn btn-accent" onClick={() => controller.action('inspection/return')} disabled={!!controller.busy}>{controller.busy === 'inspection/return' ? <Spinner /> : <Truck size={18} aria-hidden="true" className="flip-rtl" />}{t.caseView.returnPapers}</button>
        </div>
      )}
    </>
  );
}

function ActionForm({ title, icon, children, onSubmit }: { title: string; icon: ReactNode; children: ReactNode; onSubmit: (form: FormData) => void }) {
  return (
    <form className="action-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget)); }}>
      <p className="action-form-title">{icon}{title}</p>
      {children}
    </form>
  );
}

function MoneyFields() {
  const { t } = useI18n();
  return (
    <>
      <label className="field"><span className="field-label">{t.officer.wages}<span className="field-required" aria-hidden="true">*</span></span><input className="input input-sm input-ltr" name="wages" type="number" min="0" step="0.01" defaultValue="0" required inputMode="decimal" /></label>
      <label className="field"><span className="field-label">{t.officer.violations}<span className="field-required" aria-hidden="true">*</span></span><input className="input input-sm input-ltr" name="violations" type="number" min="0" step="0.01" defaultValue="0" required inputMode="decimal" /></label>
    </>
  );
}

/** Registration-officer actions for the current stage. Payloads match the original portal exactly. */
export function OfficerActionPanel({ c, actions, controller, ask, hasOtherActions, fee }: { c: CaseDetail; actions: CaseActions; controller: CaseController; ask: Ask; hasOtherActions?: boolean; fee?: Fee }) {
  const { t, f, label } = useI18n();
  // Once the center receipt is verified the API treats the fee as settled; show the outcome instead of the form.
  const receiptVerified = fee?.payment_state === 'CENTER_VERIFIED';
  const busy = controller.busy;
  const button = (key: string, text: string, icon: ReactNode, run: () => void, variant = '') => (
    <button type="button" className={`btn ${variant}`} onClick={run} disabled={!!busy}>{busy === key ? <Spinner /> : icon}{text}</button>
  );
  const stageButtons = [
    actions.canAcceptIntake && button('review/approve', t.officer.acceptIntake, <ClipboardCheck size={18} aria-hidden="true" />, () => controller.action('review/approve', { stage: 'intake' })),
    actions.canIssueInspectionForm && button('review/approve', t.officer.issueForm, <FileText size={18} aria-hidden="true" />, () => controller.action('review/approve', { stage: 'initial' })),
    actions.canApproveFinal && button('review/approve', t.officer.approveFinal, <BadgeCheck size={18} aria-hidden="true" />, () => controller.action('review/approve', { stage: 'final' })),
    actions.canPrepareCertificate && button('certificate/draft', t.officer.prepareCertificate, <FilePen size={18} aria-hidden="true" />, () => controller.action('certificate/draft')),
    actions.canReceiveDraft && button('approved-draft/receive', t.officer.receiveDraft, <Inbox size={18} aria-hidden="true" />, () => controller.action('approved-draft/receive')),
    actions.canRelease && button('release', t.officer.release, <ShieldCheck size={18} aria-hidden="true" />, () => ask({ title: t.officer.releaseConfirmTitle, body: t.officer.releaseConfirmBody, confirmLabel: t.officer.release, onConfirm: () => { controller.action('release'); } }), 'btn-success'),
  ].filter(Boolean);
  const pendingReview = c.unverified_documents?.length && actions.canAcceptIntake;
  const anything = stageButtons.length || actions.canRequestInfo || actions.canAssessFee || actions.canVerifyCenterReceipt || actions.canRecordInPersonDelivery || actions.canRecordInspection || actions.canReturnPapers || actions.canSubmit;
  if (!anything) return hasOtherActions ? null : <p className="muted">{t.officer.noActions}</p>;

  return (
    <div className="officer-actions">
      {pendingReview ? <Alert tone="info">{t.officer.acceptIntakeHint}</Alert> : null}
      {stageButtons.length > 0 && <div className="callout-actions" style={{ marginTop: 0 }}>{stageButtons}</div>}
      <InspectionActions actions={actions} controller={controller} compact />

      {actions.canAssessFee && (
        <ActionForm title={t.officer.assessFee} icon={<Receipt size={18} aria-hidden="true" />} onSubmit={form => controller.action('fees/assess', { wages: form.get('wages'), violations: form.get('violations') })}>
          <div className="form-grid compact-grid"><MoneyFields /></div>
          <button className="btn" disabled={!!busy}>{busy === 'fees/assess' ? <Spinner /> : null}{t.officer.assessFee}</button>
        </ActionForm>
      )}

      {actions.canVerifyCenterReceipt && receiptVerified && (
        <Alert tone="success" title={t.officer.receiptVerified}>{t.caseView.receiptReference}: <bdi dir="ltr">{fee?.receipt_reference}</bdi></Alert>
      )}
      {actions.canVerifyCenterReceipt && !receiptVerified && (
        <ActionForm title={t.officer.verifyReceipt} icon={<Wallet size={18} aria-hidden="true" />} onSubmit={form => controller.action('payment-confirmations', { reference: form.get('reference'), source: 'CENTER', wages: form.get('wages'), violations: form.get('violations') })}>
          <div className="form-grid compact-grid">
            <label className="field"><span className="field-label">{t.officer.receiptReference}<span className="field-required" aria-hidden="true">*</span></span><input className="input input-sm input-ltr" name="reference" required maxLength={100} /></label>
            <MoneyFields />
          </div>
          <button className="btn" disabled={!!busy}>{busy === 'payment-confirmations' ? <Spinner /> : null}{t.officer.verifyReceipt}</button>
        </ActionForm>
      )}

      {actions.canRecordInspection && (actions.inspectionReport ? (
        <ActionForm title={t.officer.recordInspection} icon={<ShieldCheck size={18} aria-hidden="true" />} onSubmit={form => controller.action('inspection-reports', { reference: form.get('reference'), report_document_id: form.get('document'), result: 'PASSED' })}>
          <div className="form-grid compact-grid">
            <label className="field"><span className="field-label">{t.officer.inspectionReference}<span className="field-required" aria-hidden="true">*</span></span><input className="input input-sm input-ltr" name="reference" required maxLength={100} /></label>
            <label className="field"><span className="field-label">{t.officer.inspectionReport}</span>
              <select className="select input-sm" name="document" required>
                <option value={actions.inspectionReport.id}>{actions.inspectionReport.filename} · {f(t.caseView.version, { version: actions.inspectionReport.version })} · {label(t.documentStates, actions.inspectionReport.validation_result)}</option>
              </select>
            </label>
          </div>
          <button className="btn btn-success" disabled={!!busy}>{busy === 'inspection-reports' ? <Spinner /> : <CheckCircle2 size={18} aria-hidden="true" />}{t.officer.recordInspection}</button>
        </ActionForm>
      ) : <Alert tone="info">{t.officer.uploadReportFirst}</Alert>)}

      {actions.canRecordInPersonDelivery && (
        <ActionForm title={t.officer.inPersonDelivery} icon={<CheckCircle2 size={18} aria-hidden="true" />} onSubmit={form => controller.action('delivery/acknowledge', { mode: 'IN_PERSON', recipient_reference: form.get('recipient_reference') })}>
          <label className="field"><span className="field-label">{t.officer.recipientReference}<span className="field-required" aria-hidden="true">*</span></span><input className="input input-sm" name="recipient_reference" required maxLength={100} /></label>
          <button className="btn btn-success" disabled={!!busy}>{busy === 'delivery/acknowledge' ? <Spinner /> : null}{t.officer.inPersonDelivery}</button>
        </ActionForm>
      )}

      {actions.canRequestInfo && (
        <div className="action-secondary">
          <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={() => ask({
            title: t.officer.requestInfoTitle, confirmLabel: t.officer.requestInfo, tone: 'danger', reason: { label: t.officer.reason, hint: t.officer.reasonHint },
            onConfirm: reason => { controller.action('review/request-info', { reason }); },
          })}><MessageSquareWarning size={18} aria-hidden="true" />{t.officer.requestInfo}</button>
        </div>
      )}
    </div>
  );
}
