/**
 * Client-safe view model for small-vessel registration cases (procedure A.4.1/1).
 * These helpers only decide what the interface offers. Every action is still validated by the
 * API in src/server/cases.ts; the gating conditions below mirror the previous portal exactly.
 */

export type CaseSummary = {
  id: string;
  application_number: string;
  owner_id: string;
  representative_id: string | null;
  intake_channel: 'PORTAL' | 'EXTERNAL_CENTER' | string;
  status: string;
  version: number;
  party_category: string;
  foreign_flag: boolean;
  ownership_kind: string;
  vessel_name: string;
  tonnage: string;
  tonnage_unit: string;
  registry_number: string | null;
  certificate_version: number;
  created_at?: string;
  updated_at?: string;
};

export type CaseDocument = { id: string; type: string; version: number; filename: string; validation_result: string; verified_by?: string | null };

export type CaseDetail = CaseSummary & {
  required_documents: string[];
  missing_documents: string[];
  unverified_documents: string[];
  documents: CaseDocument[];
  demo_payment_enabled: boolean;
  verification_path: string | null;
  delivery_acknowledged: boolean;
};

export type Approval = { id: string; sequence: number; role: string; result: string; certificate_version: number; decided_at: string | null; draft_sha256: string | null };
export type Fee = { fixed_amount: string; wages: string; violations: string; total_amount: string; currency: string | null; payment_state: string; receipt_reference: string | null };
export type AuditEvent = { action: string; actor: string; role: string; from_status: string | null; to_status: string; detail: Record<string, unknown> | null; created_at: string };
export type Sla = { target_working_days: [number, number]; started_at: string | null; pause_policy: string; calendar: string };
export type ViewUser = { id: string; role: string; displayName: string };

export const STAFF_ROLES = new Set(['REGISTRATION_OFFICER', 'SUPERVISING_OFFICIAL', 'SHIP_REGISTRAR', 'SERVICE_ADMIN', 'AUDITOR']);
export const CREATOR_ROLES = new Set(['APPLICANT', 'AUTHORIZED_REPRESENTATIVE', 'REGISTRATION_OFFICER']);
export const isStaffRole = (role: string) => STAFF_ROLES.has(role);

const UPLOAD_STATUSES = new Set(['DRAFT', 'NEEDS_INFORMATION', 'CENTER_INTAKE', 'INSPECTION_IN_PROGRESS', 'AWAITING_INSPECTION_REPORT', 'FINAL_REVIEW']);
export const DOCUMENT_REVIEW_STATUSES = new Set(['SUBMITTED', 'INITIAL_REVIEW', 'CENTER_INTAKE', 'AWAITING_INSPECTION_REPORT', 'FINAL_REVIEW']);
export const EDITABLE_STATUSES = new Set(['DRAFT', 'NEEDS_INFORMATION']);
export const CERTIFICATE_STATUSES = new Set(['AWAITING_DELIVERY_ACK', 'COMPLETED']);
export const APPROVAL_STATUSES = new Set(['CERTIFICATE_DRAFT', 'OFFICER_SIGNATURE', 'SUPERVISOR_SIGNATURE', 'REGISTRAR_SIGNATURE', 'READY_FOR_RELEASE', 'AWAITING_RELEASE']);
export const GENERATED_DOCUMENTS = new Set(['INSPECTION_FORM', 'CERTIFICATE_DRAFT']);

/** Ordered statuses for each intake route (from src/server/workflow.ts transitions). */
export const ROUTE_SEQUENCE: Record<string, string[]> = {
  PORTAL: ['DRAFT', 'SUBMITTED', 'INITIAL_REVIEW', 'FEE_ASSESSMENT', 'AWAITING_PAYMENT', 'AWAITING_INSPECTION', 'INSPECTION_IN_PROGRESS', 'AWAITING_INSPECTION_REPORT', 'FINAL_REVIEW', 'CERTIFICATE_DRAFT', 'OFFICER_SIGNATURE', 'SUPERVISOR_SIGNATURE', 'REGISTRAR_SIGNATURE', 'READY_FOR_RELEASE', 'AWAITING_RELEASE', 'AWAITING_DELIVERY_ACK', 'COMPLETED'],
  EXTERNAL_CENTER: ['DRAFT', 'CENTER_INTAKE', 'FINAL_REVIEW', 'CERTIFICATE_DRAFT', 'OFFICER_SIGNATURE', 'SUPERVISOR_SIGNATURE', 'REGISTRAR_SIGNATURE', 'READY_FOR_RELEASE', 'AWAITING_RELEASE', 'AWAITING_DELIVERY_ACK', 'COMPLETED'],
};
export const ALL_STATUSES = [...new Set([...ROUTE_SEQUENCE.PORTAL, ...ROUTE_SEQUENCE.EXTERNAL_CENTER, 'NEEDS_INFORMATION', 'REINSPECTION_REQUIRED'])];

/** Six applicant-facing stages: Documents, Review, Payment, Inspection, Approvals, Certificate. */
export function stageIndex(status: string) {
  if (['DRAFT', 'NEEDS_INFORMATION'].includes(status)) return 0;
  if (['SUBMITTED', 'INITIAL_REVIEW'].includes(status)) return 1;
  if (['FEE_ASSESSMENT', 'AWAITING_PAYMENT'].includes(status)) return 2;
  if (['CENTER_INTAKE', 'AWAITING_INSPECTION', 'INSPECTION_IN_PROGRESS', 'AWAITING_INSPECTION_REPORT', 'REINSPECTION_REQUIRED'].includes(status)) return 3;
  if (['AWAITING_DELIVERY_ACK', 'COMPLETED'].includes(status)) return 5;
  return 4;
}

export type Tone = 'neutral' | 'info' | 'progress' | 'warning' | 'danger' | 'approval' | 'success';
export function statusTone(status: string): Tone {
  if (status === 'DRAFT') return 'neutral';
  if (['NEEDS_INFORMATION', 'AWAITING_PAYMENT'].includes(status)) return 'warning';
  if (status === 'REINSPECTION_REQUIRED') return 'danger';
  if (['AWAITING_INSPECTION', 'INSPECTION_IN_PROGRESS', 'AWAITING_INSPECTION_REPORT'].includes(status)) return 'progress';
  if (APPROVAL_STATUSES.has(status)) return 'approval';
  if (CERTIFICATE_STATUSES.has(status)) return 'success';
  return 'info';
}
export const documentTone = (state: string): Tone => (state === 'VERIFIED' ? 'success' : state === 'REJECTED' ? 'danger' : state === 'PENDING' ? 'info' : 'warning');
export const paymentTone = (state: string): Tone => (['VERIFIED', 'CENTER_VERIFIED', 'DEMO_VERIFIED'].includes(state) ? 'success' : state === 'UNPAID' ? 'warning' : 'neutral');
export const approvalTone = (result: string): Tone => (result === 'APPROVED' ? 'success' : result === 'RETURNED' ? 'danger' : 'neutral');

const centerCreated = (c: Pick<CaseSummary, 'owner_id'>) => c.owner_id.startsWith('CENTER-UNVERIFIED-');

/** Which role the case is waiting on (derived from the API's role checks for each status). */
export function responsibleRole(c: Pick<CaseSummary, 'status' | 'intake_channel' | 'owner_id'>): string | null {
  switch (c.status) {
    case 'DRAFT': case 'NEEDS_INFORMATION': return centerCreated(c) ? 'REGISTRATION_OFFICER' : 'APPLICANT';
    case 'AWAITING_PAYMENT': case 'AWAITING_INSPECTION': case 'INSPECTION_IN_PROGRESS': return 'APPLICANT';
    case 'REINSPECTION_REQUIRED': return 'INSPECTION_CENTER';
    case 'SUPERVISOR_SIGNATURE': return 'SUPERVISING_OFFICIAL';
    case 'REGISTRAR_SIGNATURE': return 'SHIP_REGISTRAR';
    case 'AWAITING_DELIVERY_ACK': return c.intake_channel === 'EXTERNAL_CENTER' ? 'REGISTRATION_OFFICER' : 'APPLICANT';
    case 'COMPLETED': return null;
    default: return 'REGISTRATION_OFFICER';
  }
}

/** Whether a staff role can take the next step on a case (used for work queues). */
export function awaitsRole(c: CaseSummary, role: string) {
  const responsible = responsibleRole(c);
  if (role === 'REGISTRATION_OFFICER') return responsible === 'REGISTRATION_OFFICER';
  return responsible === role;
}

/** Whether the owner or representative has the next step (applicant dashboard). */
export function awaitsApplicant(c: CaseSummary) {
  return responsibleRole(c) === 'APPLICANT';
}

export const isActive = (c: Pick<CaseSummary, 'status'>) => c.status !== 'COMPLETED';

export function nextStepKey(c: Pick<CaseSummary, 'status' | 'intake_channel'>) {
  return c.status === 'AWAITING_DELIVERY_ACK' && c.intake_channel === 'EXTERNAL_CENTER' ? 'AWAITING_DELIVERY_ACK_CENTER' : c.status;
}

/** Latest version of each document type. */
export function latestByType(documents: CaseDocument[]) {
  const latest = new Map<string, CaseDocument>();
  for (const document of documents) {
    const current = latest.get(document.type);
    if (!current || document.version > current.version) latest.set(document.type, document);
  }
  return latest;
}

export type ChecklistItem = { type: string; state: 'MISSING' | 'PENDING' | 'VERIFIED' | 'REJECTED' | string; document: CaseDocument | null };
export function documentChecklist(c: CaseDetail): ChecklistItem[] {
  const latest = latestByType(c.documents || []);
  return (c.required_documents || []).map(type => {
    const document = latest.get(type) || null;
    return { type, state: document ? document.validation_result : 'MISSING', document };
  });
}

export function latestInspectionReport(c: CaseDetail) {
  return (c.documents || []).filter(document => document.type === 'INSPECTION_REPORT').sort((a, b) => b.version - a.version)[0] || null;
}

/** Actions the interface offers. Conditions are identical to the original portal; the API remains the authority. */
export function caseActions(user: ViewUser, c: CaseDetail, approvals: Approval[]) {
  const isOwner = [c.owner_id, c.representative_id].includes(user.id);
  const isOfficer = user.role === 'REGISTRATION_OFFICER';
  const isStaff = STAFF_ROLES.has(user.role);
  const latest = latestByType(c.documents || []);
  const report = latestInspectionReport(c);
  const nextApproval = approvals.find(step => step.result === 'PENDING') || null;
  const status = c.status;
  return {
    isOwner,
    isOfficer,
    isStaff,
    canUpload: CREATOR_ROLES.has(user.role) && UPLOAD_STATUSES.has(status) && (isOwner || isOfficer),
    uploadTypes: [...new Set([...(c.required_documents || []), 'INSPECTION_REPORT'])],
    canSubmit: EDITABLE_STATUSES.has(status) && (isOwner || isOfficer),
    hasInspectionForm: (c.documents || []).some(document => document.type === 'INSPECTION_FORM'),
    canSimulatePayment: status === 'AWAITING_PAYMENT' && c.demo_payment_enabled && isOwner,
    canHandover: status === 'AWAITING_INSPECTION' && isOwner,
    canReturnPapers: status === 'INSPECTION_IN_PROGRESS' && (isOwner || isOfficer) && !!report,
    showCertificate: CERTIFICATE_STATUSES.has(status),
    canAcknowledgePortal: status === 'AWAITING_DELIVERY_ACK' && isOwner && c.intake_channel === 'PORTAL',
    canViewDraft: isStaff,
    canReviewDocument: (document: CaseDocument) => isOfficer && document.validation_result === 'PENDING' && latest.get(document.type)?.version === document.version && DOCUMENT_REVIEW_STATUSES.has(status),
    canAcceptIntake: isOfficer && status === 'SUBMITTED',
    canIssueInspectionForm: isOfficer && status === 'INITIAL_REVIEW',
    canApproveFinal: isOfficer && status === 'FINAL_REVIEW',
    canPrepareCertificate: isOfficer && status === 'CERTIFICATE_DRAFT',
    canReceiveDraft: isOfficer && status === 'READY_FOR_RELEASE',
    canRelease: isOfficer && status === 'AWAITING_RELEASE',
    canRequestInfo: isOfficer && DOCUMENT_REVIEW_STATUSES.has(status),
    canAssessFee: isOfficer && status === 'FEE_ASSESSMENT',
    canVerifyCenterReceipt: isOfficer && status === 'CENTER_INTAKE',
    canRecordInPersonDelivery: isOfficer && status === 'AWAITING_DELIVERY_ACK' && c.intake_channel === 'EXTERNAL_CENTER',
    canRecordInspection: isOfficer && ['CENTER_INTAKE', 'AWAITING_INSPECTION_REPORT'].includes(status),
    inspectionReport: report,
    nextApproval,
    canApprove: (step: Approval) => step.id === nextApproval?.id && user.role === step.role,
  };
}
export type CaseActions = ReturnType<typeof caseActions>;

/** Position of a case in its route, accounting for side states (returned for correction, reinspection). */
export function workflowPosition(c: CaseSummary, events: AuditEvent[]) {
  const sequence = ROUTE_SEQUENCE[c.intake_channel] || ROUTE_SEQUENCE.PORTAL;
  let anchor = c.status;
  let returned = false;
  if (c.status === 'NEEDS_INFORMATION') {
    returned = true;
    const lastReturn = [...events].reverse().find(event => event.to_status === 'NEEDS_INFORMATION');
    anchor = lastReturn?.from_status && sequence.includes(lastReturn.from_status) ? lastReturn.from_status : 'DRAFT';
  }
  if (c.status === 'REINSPECTION_REQUIRED') anchor = 'AWAITING_INSPECTION_REPORT';
  return { sequence, currentIndex: Math.max(0, sequence.indexOf(anchor)), returned };
}

/** Reasons recorded with rejections and information requests (audit detail.reason). */
export function remarksFrom(events: AuditEvent[]) {
  return events
    .filter(event => typeof event.detail?.reason === 'string' && (event.detail.reason as string).trim())
    .map(event => ({ ...event, reason: event.detail!.reason as string, documentType: typeof event.detail?.type === 'string' ? (event.detail.type as string) : null }))
    .reverse();
}

export const submittedAt = (events: AuditEvent[]) => events.find(event => ['submit', 'inspectedPapersReturned'].includes(event.action) && event.from_status && EDITABLE_STATUSES.has(event.from_status))?.created_at || null;

/** Client-side mirror of the API's create-case validation (src/server/cases.ts createSchema). */
export const TONNAGE_LIMIT = 150;
export const MAX_UPLOAD_BYTES = 10_000_000;
export const ACCEPTED_UPLOADS = ['application/pdf', 'image/jpeg', 'image/png'];
export const ACCEPT_ATTRIBUTE = '.pdf,.jpg,.jpeg,.png';
