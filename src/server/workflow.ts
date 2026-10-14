import type { RegistrationCase, Document } from '@prisma/client';
import { fail } from '../lib/errors';

type Evidence = Pick<Document, 'type' | 'validationResult'> & Partial<Pick<Document, 'version'>>;

export function requiredDocuments(c: RegistrationCase): string[] {
  const result = new Set([c.ownershipKind,'CIVIL_ID','MOC_CLEARANCE']);
  if (c.partyCategory === 'COMPANY') { result.add('SIGNATORY_AUTHORIZATION'); result.add('COMMERCIAL_REGISTER'); }
  if (c.representativeId) result.add('OFFICIAL_POA');
  if (c.foreignFlag) result.add('FOREIGN_FLAG_DELETION');
  if (c.intakeChannel === 'EXTERNAL_CENTER') { result.add('CENTER_RECEIPT'); result.add('INSPECTION_REPORT'); }
  return [...result].sort();
}
function latestByType(docs: Evidence[]) {
  const latest = new Map<string, Evidence>();
  for (const doc of docs) if (!latest.has(doc.type) || (doc.version || 0) >= (latest.get(doc.type)?.version || 0)) latest.set(doc.type, doc);
  return latest;
}
export function missingDocuments(c: RegistrationCase, docs: Evidence[]): string[] {
  const latest = latestByType(docs);
  return requiredDocuments(c).filter(type => !latest.has(type) || latest.get(type)?.validationResult === 'REJECTED');
}
export function unverifiedDocuments(c: RegistrationCase, docs: Evidence[]): string[] {
  const latest = latestByType(docs);
  return requiredDocuments(c).filter(type => latest.get(type)?.validationResult !== 'VERIFIED');
}
export function transition(status: string, action: string, channel: string): string {
  const targets: Record<string,Record<string,string>> = {
    submit: { DRAFT:channel==='EXTERNAL_CENTER'?'CENTER_INTAKE':'SUBMITTED', NEEDS_INFORMATION:channel==='EXTERNAL_CENTER'?'CENTER_INTAKE':'SUBMITTED' },
    requestInfo: { SUBMITTED:'NEEDS_INFORMATION',INITIAL_REVIEW:'NEEDS_INFORMATION',CENTER_INTAKE:'NEEDS_INFORMATION',AWAITING_INSPECTION_REPORT:'NEEDS_INFORMATION',FINAL_REVIEW:'NEEDS_INFORMATION' },
    intakeAccepted: { SUBMITTED:'INITIAL_REVIEW' },
    inspectionFormIssued: { INITIAL_REVIEW:'FEE_ASSESSMENT' },
    feeAssessed: { FEE_ASSESSMENT:'AWAITING_PAYMENT' },
    demoPaymentVerified: { AWAITING_PAYMENT:'AWAITING_INSPECTION' },
    documentsHandedOver: { AWAITING_INSPECTION:'INSPECTION_IN_PROGRESS' },
    inspectedPapersReturned: { INSPECTION_IN_PROGRESS:'AWAITING_INSPECTION_REPORT' },
    inspectionPassed: { CENTER_INTAKE:'FINAL_REVIEW',AWAITING_INSPECTION_REPORT:'FINAL_REVIEW',REINSPECTION_REQUIRED:'FINAL_REVIEW' },
    finalFileApproved: { FINAL_REVIEW:'CERTIFICATE_DRAFT' },
    draftGenerated: { CERTIFICATE_DRAFT:'OFFICER_SIGNATURE' },
    officerSigned: { OFFICER_SIGNATURE:'SUPERVISOR_SIGNATURE' },
    supervisorSigned: { SUPERVISOR_SIGNATURE:'REGISTRAR_SIGNATURE' },
    registrarSigned: { REGISTRAR_SIGNATURE:'READY_FOR_RELEASE' },
    officerReceivedApprovedDraft: { READY_FOR_RELEASE:'AWAITING_RELEASE' },
    officerReleasedCertificate: { AWAITING_RELEASE:'AWAITING_DELIVERY_ACK' },
    deliveryAcknowledged: { AWAITING_DELIVERY_ACK:'COMPLETED' },
  };
  const target = targets[action]?.[status];
  if (!target) fail(409, `${action} invalid from ${status}`);
  return target;
}
