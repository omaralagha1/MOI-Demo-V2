import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Prisma, type RegistrationCase } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { type Actor, requireRole } from '@/lib/auth';
import { fail } from '@/lib/errors';
import { missingDocuments, requiredDocuments, transition, unverifiedDocuments } from './workflow';
import { buildCertificateDraftPdf, buildCertificatePdf, buildInspectionFormPdf } from './certificate-pdf';

type Tx = Prisma.TransactionClient;
const store = () => process.env.FILE_STORE || './private_uploads';
const storagePath = (key: string) => join(/* turbopackIgnore: true */ store(), key);
const staff = ['REGISTRATION_OFFICER', 'SUPERVISING_OFFICIAL', 'SHIP_REGISTRAR', 'SERVICE_ADMIN', 'AUDITOR'];
const ownerRoles = ['APPLICANT', 'AUTHORIZED_REPRESENTATIVE', 'REGISTRATION_OFFICER'];
const demoPaymentEnabled = () => process.env.ENABLE_DEMO_PAYMENT === 'true';
const feeVerified = (state: string) => ['VERIFIED', 'CENTER_VERIFIED'].includes(state) || (demoPaymentEnabled() && state === 'DEMO_VERIFIED');
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const decimal = z.coerce.number().positive().lt(150).refine(value => Math.round(value * 100) === value * 100);
const money = z.coerce.number().nonnegative().max(1_000_000).refine(value => Math.round(value * 100) === value * 100);

export const createSchema = z.object({
  vessel_name: z.string().trim().min(1).max(200),
  tonnage: decimal,
  tonnage_unit: z.string().max(30).default('UNCONFIRMED'),
  party_category: z.enum(['PERSON', 'COMPANY']).default('PERSON'),
  foreign_flag: z.boolean().default(false),
  representative_id: z.string().max(100).nullable().optional(),
  intake_channel: z.enum(['PORTAL', 'EXTERNAL_CENTER']).default('PORTAL'),
  ownership_kind: z.enum(['OWNERSHIP_EVIDENCE', 'PURCHASE_INVOICE', 'ORIGIN_CERTIFICATE', 'CUSTOMS_DECLARATION']).default('OWNERSHIP_EVIDENCE'),
});

function view(c: RegistrationCase) {
  return { id: c.id, application_number: c.applicationNumber, owner_id: c.ownerId, representative_id: c.representativeId,
    intake_channel: c.intakeChannel, status: c.status, version: c.version, party_category: c.partyCategory,
    foreign_flag: c.foreignFlag, ownership_kind: c.ownershipKind, vessel_name: c.vesselName,
    tonnage: c.tonnage.toString(), tonnage_unit: c.tonnageUnit, registry_number: c.registryNumber,
    certificate_version: c.certificateVersion, created_at: c.createdAt, updated_at: c.updatedAt };
}
async function get(tx: Tx, id: string, actor: Actor, write = false) {
  const c = await tx.registrationCase.findUnique({ where: { id } });
  if (!c) fail(404, 'Case not found');
  if (c.ownerId !== actor.id && c.representativeId !== actor.id && !staff.includes(actor.role)) fail(403, 'Case access denied');
  if (write && actor.role === 'AUDITOR') fail(403, 'Case access denied');
  return c;
}
async function event(tx: Tx, c: RegistrationCase, actor: Actor, action: string, target = c.status, detail: object = {}) {
  const updated = await tx.registrationCase.updateMany({ where: { id: c.id, version: c.version }, data: { status: target, version: { increment: 1 } } });
  if (updated.count !== 1) fail(409, 'Stale version');
  await tx.auditEvent.create({ data: { caseId: c.id, actor: actor.id, role: actor.role, action, fromStatus: c.status, toStatus: target, detail } });
  await tx.notificationOutbox.create({ data: { caseId: c.id, event: action } });
  return { ...c, status: target, version: c.version + 1 };
}
async function evidence(tx: Tx, id: string) {
  return tx.document.findMany({ where: { caseId: id }, select: { type: true, version: true, validationResult: true } });
}
async function missing(tx: Tx, c: RegistrationCase) { return missingDocuments(c, await evidence(tx, c.id)); }
async function requireVerified(tx: Tx, c: RegistrationCase) {
  const pending = unverifiedDocuments(c, await evidence(tx, c.id));
  if (pending.length) fail(409, `Officer verification required: ${pending.join(', ')}`);
}
async function latestDocument(tx: Tx, id: string, type: string) {
  return tx.document.findFirst({ where: { caseId: id, type }, orderBy: { version: 'desc' } });
}
async function saveGeneratedDocument(tx: Tx, c: RegistrationCase, actor: Actor, type: string, version: number, bytes: Buffer) {
  const id = randomUUID();
  const key = `${type.toLowerCase()}-${id}.pdf`;
  await mkdir(store(), { recursive: true });
  await writeFile(storagePath(key), bytes, { flag: 'wx' });
  return tx.document.create({ data: { id, caseId: c.id, type, version, filename: key, mediaType: 'application/pdf', storageKey: key,
    sha256: sha256(bytes), validationResult: 'VERIFIED', verifiedBy: actor.id, reviewedAt: new Date() } });
}

export async function listCases(actor: Actor, url: URL) {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 20) || 20, 1), 100);
  const offset = Math.max(Number(url.searchParams.get('offset') || 0) || 0, 0);
  const where: Prisma.RegistrationCaseWhereInput = {};
  if (!staff.includes(actor.role)) where.OR = [{ ownerId: actor.id }, { representativeId: actor.id }];
  if (url.searchParams.get('status')) where.status = url.searchParams.get('status')!;
  return (await db.registrationCase.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset })).map(view);
}
export async function createCase(actor: Actor, raw: unknown) {
  requireRole(actor, ...ownerRoles);
  const data = createSchema.parse(raw);
  if (actor.role === 'AUTHORIZED_REPRESENTATIVE' && !data.representative_id) fail(422, 'Representative identity required');
  return db.$transaction(async tx => {
    const id = randomUUID();
    const c = await tx.registrationCase.create({ data: { id, applicationNumber: `SV-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
      ownerId: actor.role === 'REGISTRATION_OFFICER' ? `CENTER-UNVERIFIED-${id}` : actor.id,
      representativeId: data.representative_id, intakeChannel: data.intake_channel, partyCategory: data.party_category,
      foreignFlag: data.foreign_flag, ownershipKind: data.ownership_kind, vesselName: data.vessel_name,
      tonnage: data.tonnage, tonnageUnit: data.tonnage_unit } });
    return view(await event(tx, c, actor, 'createCase'));
  });
}
export async function detail(actor: Actor, id: string) {
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor);
    const documents = await tx.document.findMany({ where: { caseId: id }, orderBy: [{ createdAt: 'desc' }, { version: 'desc' }],
      select: { id: true, type: true, version: true, filename: true, validationResult: true, verifiedBy: true } });
    const certificate = ['AWAITING_DELIVERY_ACK', 'COMPLETED'].includes(c.status)
      ? await tx.certificate.findUnique({ where: { caseId: id }, select: { id: true, storageKey: true, acknowledgedAt: true } }) : null;
    const rows = await evidence(tx, id);
    return { ...view(c), required_documents: requiredDocuments(c), missing_documents: missingDocuments(c, rows),
      unverified_documents: unverifiedDocuments(c, rows), documents: documents.map(d => ({ id: d.id, type: d.type,
        version: d.version, filename: d.filename, validation_result: d.validationResult, verified_by: d.verifiedBy })),
      demo_payment_enabled: demoPaymentEnabled(), verification_path: certificate?.storageKey.endsWith('.pdf') ? `/verify/${certificate.id}` : null,
      delivery_acknowledged: Boolean(certificate?.acknowledgedAt) };
  });
}
export async function updateCase(actor: Actor, id: string, raw: unknown) {
  const data = z.object({ version: z.number().int(), vessel_name: z.string().trim().min(1).max(200).optional(), tonnage: decimal.optional() }).parse(raw);
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (![c.ownerId, c.representativeId].includes(actor.id) || !['DRAFT', 'NEEDS_INFORMATION'].includes(c.status)) fail(403, 'Case not editable');
    if (c.version !== data.version) fail(409, 'Stale version');
    await tx.registrationCase.update({ where: { id }, data: { vesselName: data.vessel_name, tonnage: data.tonnage } });
    return view(await event(tx, c, actor, 'updateCase'));
  });
}
export async function submit(actor: Actor, id: string) {
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (![c.ownerId, c.representativeId].includes(actor.id) && actor.role !== 'REGISTRATION_OFFICER') fail(403, 'Submission denied');
    if (!['DRAFT', 'NEEDS_INFORMATION'].includes(c.status)) fail(409, 'Already submitted');
    const absent = await missing(tx, c);
    const defaultTarget = transition(c.status, 'submit', c.intakeChannel);
    const target = absent.length ? 'NEEDS_INFORMATION' : c.resumeStatus || defaultTarget;
    if (!absent.length && !['SUBMITTED', 'CENTER_INTAKE', 'INITIAL_REVIEW', 'FINAL_REVIEW', 'AWAITING_INSPECTION_REPORT'].includes(target)) fail(409, 'Invalid resumption stage');
    await tx.registrationCase.update({ where: { id }, data: { resumeStatus: absent.length ? c.resumeStatus || defaultTarget : null } });
    await event(tx, c, actor, absent.length ? 'missingEvidence' : c.intakeChannel === 'EXTERNAL_CENTER' && target === 'CENTER_INTAKE' ? 'inspectedPapersReturned' : 'submit', target, { missing: absent });
    if (!absent.length) await tx.sla.upsert({ where: { caseId: id }, create: { caseId: id, startedAt: new Date() }, update: {} });
    if (!absent.length && c.intakeChannel === 'EXTERNAL_CENTER') await tx.fee.upsert({ where: { caseId: id }, create: { caseId: id, fixedAmount: process.env.FIXED_FEE_AMOUNT || '16' }, update: {} });
    return { status: target, missing: absent };
  });
}
export async function reviewDocument(actor: Actor, id: string, documentId: string, raw: unknown) {
  requireRole(actor, 'REGISTRATION_OFFICER');
  const data = z.object({ result: z.enum(['VERIFIED', 'REJECTED']), reason: z.string().trim().max(1000).optional() }).parse(raw);
  if (data.result === 'REJECTED' && !data.reason) fail(422, 'Rejection reason required');
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (!['SUBMITTED', 'INITIAL_REVIEW', 'CENTER_INTAKE', 'AWAITING_INSPECTION_REPORT', 'FINAL_REVIEW'].includes(c.status)) fail(409, 'Document review unavailable at this stage');
    const doc = await tx.document.findUnique({ where: { id: documentId } });
    if (!doc || doc.caseId !== id || ![...requiredDocuments(c), 'INSPECTION_REPORT'].includes(doc.type)) fail(404, 'Reviewable document not found');
    const latest = await latestDocument(tx, id, doc.type);
    if (latest?.id !== doc.id || doc.validationResult !== 'PENDING') fail(409, 'Only the latest pending document can be reviewed');
    await tx.document.update({ where: { id: documentId }, data: { validationResult: data.result, verifiedBy: actor.id, reviewedAt: new Date() } });
    const target = data.result === 'REJECTED' ? transition(c.status, 'requestInfo', c.intakeChannel) : c.status;
    if (data.result === 'REJECTED') await tx.registrationCase.update({ where: { id }, data: { resumeStatus: c.status } });
    await event(tx, c, actor, data.result === 'REJECTED' ? 'documentRejected' : 'documentVerified', target, { document_id: doc.id, type: doc.type, reason: data.reason || null });
    return { status: target, document_status: data.result };
  });
}
export async function review(actor: Actor, id: string, raw: unknown) {
  requireRole(actor, 'REGISTRATION_OFFICER');
  const stage = z.object({ stage: z.enum(['intake', 'initial', 'final']) }).parse(raw).stage;
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (stage === 'intake') {
      if (c.status !== 'SUBMITTED') fail(409, 'Invalid intake stage');
      await requireVerified(tx, c);
      const target = transition(c.status, 'intakeAccepted', c.intakeChannel);
      await event(tx, c, actor, 'officerReceivedAndVerifiedDocuments', target);
      return { status: target };
    }
    if (stage === 'initial') {
      if (c.status !== 'INITIAL_REVIEW' || c.intakeChannel !== 'PORTAL') fail(409, 'Invalid initial review stage');
      await requireVerified(tx, c);
      const reference = `IF-${c.applicationNumber.slice(3)}`;
      const bytes = await buildInspectionFormPdf({ applicationNumber: c.applicationNumber, vesselName: c.vesselName,
        tonnage: c.tonnage.toString(), reference, issuedAt: new Date() });
      await saveGeneratedDocument(tx, c, actor, 'INSPECTION_FORM', 1, bytes);
      const target = transition(c.status, 'inspectionFormIssued', c.intakeChannel);
      await event(tx, c, actor, 'inspectionFormIssued', target, { reference });
      return { status: target, inspection_form_reference: reference };
    }
    if (c.status !== 'FINAL_REVIEW') fail(409, 'Invalid final review stage');
    await requireVerified(tx, c);
    const fee = await tx.fee.findUnique({ where: { caseId: id } });
    const report = await latestDocument(tx, id, 'INSPECTION_REPORT');
    const inspection = await tx.inspection.findFirst({ where: { caseId: id, result: 'PASSED', reportDocumentId: report?.id }, orderBy: { createdAt: 'desc' } });
    if (!fee || !feeVerified(fee.paymentState) || !report || report.validationResult !== 'VERIFIED' || !inspection) fail(409, 'Fee or verified inspection report missing');
    const target = transition(c.status, 'finalFileApproved', c.intakeChannel);
    await event(tx, c, actor, 'finalFileApproved', target);
    return { status: target };
  }, { timeout: 15000 });
}
export async function requestInfo(actor: Actor, id: string, raw: unknown) {
  requireRole(actor, 'REGISTRATION_OFFICER');
  const { reason } = z.object({ reason: z.string().trim().min(1).max(1000) }).parse(raw);
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    const target = transition(c.status, 'requestInfo', c.intakeChannel);
    await tx.registrationCase.update({ where: { id }, data: { resumeStatus: c.status } });
    await event(tx, c, actor, 'requestInfo', target, { reason });
    if (process.env.SLA_PAUSE_NEEDS_INFORMATION === 'true') await tx.sla.updateMany({ where: { caseId: id }, data: { pausedAt: new Date() } });
    return { status: target };
  });
}
export async function fees(actor: Actor, id: string) {
  return db.$transaction(async tx => {
    await get(tx, id, actor);
    const f = await tx.fee.findUnique({ where: { caseId: id } });
    const fixed = Number(f?.fixedAmount || process.env.FIXED_FEE_AMOUNT || '16');
    const wages = Number(f?.wages || 0), violations = Number(f?.violations || 0);
    return { fixed_amount: fixed.toFixed(2), wages: wages.toFixed(2), violations: violations.toFixed(2),
      total_amount: (fixed + wages + violations).toFixed(2), currency: f?.currency || process.env.FEE_CURRENCY || null,
      payment_state: f?.paymentState || 'NOT_ASSESSED', receipt_reference: f?.receiptReference || null, capture_enabled: false };
  });
}
export async function assessFee(actor: Actor, id: string, raw: unknown) {
  requireRole(actor, 'REGISTRATION_OFFICER');
  const data = z.object({ wages: money, violations: money }).parse(raw);
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (c.status !== 'FEE_ASSESSMENT' || c.intakeChannel !== 'PORTAL' || !(await latestDocument(tx, id, 'INSPECTION_FORM'))) fail(409, 'Inspection form required before fee assessment');
    await tx.fee.upsert({ where: { caseId: id }, create: { caseId: id, fixedAmount: process.env.FIXED_FEE_AMOUNT || '16', wages: data.wages,
      violations: data.violations, currency: process.env.FEE_CURRENCY || null, assessedBy: actor.id, assessedAt: new Date() },
    update: { wages: data.wages, violations: data.violations, assessedBy: actor.id, assessedAt: new Date() } });
    const target = transition(c.status, 'feeAssessed', c.intakeChannel);
    await event(tx, c, actor, 'feeAssessed', target, { wages: data.wages, violations: data.violations, financial_transaction: false });
    return { status: target };
  });
}
export async function confirmPayment(actor: Actor, id: string, raw: unknown) {
  requireRole(actor, 'REGISTRATION_OFFICER');
  const data = z.object({ reference: z.string().trim().min(1).max(100), source: z.literal('CENTER'), wages: money.default(0), violations: money.default(0) }).parse(raw);
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (c.intakeChannel !== 'EXTERNAL_CENTER' || c.status !== 'CENTER_INTAKE') fail(409, 'Invalid center receipt stage');
    const receipt = await latestDocument(tx, id, 'CENTER_RECEIPT');
    if (!receipt || receipt.validationResult !== 'VERIFIED') fail(409, 'Verified center receipt required');
    const fee = await tx.fee.findUnique({ where: { caseId: id } });
    if (fee?.receiptReference === data.reference && fee.paymentState === 'CENTER_VERIFIED') return { status: c.status, payment_state: fee.paymentState };
    if (fee && fee.paymentState !== 'UNPAID') fail(409, 'Fee already settled');
    await tx.fee.upsert({ where: { caseId: id }, create: { caseId: id, fixedAmount: process.env.FIXED_FEE_AMOUNT || '16',
      wages: data.wages, violations: data.violations, paymentState: 'CENTER_VERIFIED', receiptReference: data.reference,
      verifiedBy: actor.id, assessedBy: actor.id, assessedAt: new Date() }, update: { wages: data.wages, violations: data.violations,
      paymentState: 'CENTER_VERIFIED', receiptReference: data.reference, verifiedBy: actor.id, assessedBy: actor.id, assessedAt: new Date() } });
    await event(tx, c, actor, 'centerFeeReceiptVerified', c.status, { reference: data.reference, wages: data.wages, violations: data.violations, external_collection: true });
    return { status: c.status, payment_state: 'CENTER_VERIFIED' };
  });
}
export async function simulatePayment(actor: Actor, id: string) {
  if (!demoPaymentEnabled()) fail(404, 'Demo payment unavailable');
  requireRole(actor, 'APPLICANT', 'AUTHORIZED_REPRESENTATIVE');
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (c.intakeChannel !== 'PORTAL' || ![c.ownerId, c.representativeId].includes(actor.id)) fail(403, 'Payment simulation denied');
    const fee = await tx.fee.findUnique({ where: { caseId: id } });
    if (!fee) fail(409, 'No assessment');
    if (fee.paymentState === 'DEMO_VERIFIED' && c.status === 'AWAITING_INSPECTION') return { status: c.status, payment_state: fee.paymentState, simulated: true };
    if (fee.paymentState !== 'UNPAID') fail(409, 'Fee already settled');
    const target = transition(c.status, 'demoPaymentVerified', c.intakeChannel);
    await tx.fee.update({ where: { caseId: id }, data: { paymentState: 'DEMO_VERIFIED', receiptReference: `DEMO-${id}`, verifiedBy: actor.id } });
    await event(tx, c, actor, 'demoPaymentVerified', target, { simulated: true, financial_transaction: false });
    return { status: target, payment_state: 'DEMO_VERIFIED', simulated: true };
  });
}
export async function handoverForInspection(actor: Actor, id: string) {
  requireRole(actor, 'APPLICANT', 'AUTHORIZED_REPRESENTATIVE');
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (c.intakeChannel !== 'PORTAL' || ![c.ownerId, c.representativeId].includes(actor.id)) fail(403, 'Handover denied');
    const fee = await tx.fee.findUnique({ where: { caseId: id } });
    if (!fee || !feeVerified(fee.paymentState) || !(await latestDocument(tx, id, 'INSPECTION_FORM'))) fail(409, 'Payment and inspection form required');
    const target = transition(c.status, 'documentsHandedOver', c.intakeChannel);
    await event(tx, c, actor, 'documentsHandedOverForInspection', target, { external_visit_required: true });
    return { status: target };
  });
}
export async function returnInspectedPapers(actor: Actor, id: string) {
  requireRole(actor, ...ownerRoles);
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (c.intakeChannel !== 'PORTAL' || (actor.role !== 'REGISTRATION_OFFICER' && ![c.ownerId, c.representativeId].includes(actor.id))) fail(403, 'Return denied');
    if (!(await latestDocument(tx, id, 'INSPECTION_REPORT'))) fail(409, 'Inspection report upload required');
    const target = transition(c.status, 'inspectedPapersReturned', c.intakeChannel);
    await event(tx, c, actor, 'inspectedPapersReturned', target);
    return { status: target };
  });
}
export async function inspectionReport(actor: Actor, id: string, raw: unknown) {
  requireRole(actor, 'REGISTRATION_OFFICER');
  const data = z.object({ reference: z.string().trim().min(1).max(100), report_document_id: z.string().uuid(), result: z.enum(['PASSED', 'FAILED']) }).parse(raw);
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (!['CENTER_INTAKE', 'AWAITING_INSPECTION_REPORT', 'REINSPECTION_REQUIRED'].includes(c.status)) fail(409, 'Invalid inspection stage');
    const fee = await tx.fee.findUnique({ where: { caseId: id } });
    const report = await latestDocument(tx, id, 'INSPECTION_REPORT');
    if (!report || report.id !== data.report_document_id || report.validationResult !== 'VERIFIED') fail(422, 'Latest verified inspection report required');
    if (!fee || !feeVerified(fee.paymentState)) fail(409, 'Fee evidence unverified');
    await requireVerified(tx, c);
    if (data.result !== 'PASSED' && process.env.ENABLE_REINSPECTION !== 'true') fail(409, 'Reinspection policy unapproved');
    const target = data.result === 'PASSED' ? transition(c.status, 'inspectionPassed', c.intakeChannel) : 'REINSPECTION_REQUIRED';
    await tx.inspection.create({ data: { caseId: id, result: data.result, reference: data.reference, reportDocumentId: report.id, submittedBy: actor.id } });
    await event(tx, c, actor, 'validatedInspectionReportReceived', target, { report: report.id, result: data.result, reference: data.reference });
    return { status: target };
  });
}
export async function draft(actor: Actor, id: string) {
  requireRole(actor, 'REGISTRATION_OFFICER');
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    const target = transition(c.status, 'draftGenerated', c.intakeChannel);
    const version = c.certificateVersion + 1;
    const proposedRegistry = `SVR-${c.applicationNumber.slice(3)}`;
    const bytes = await buildCertificateDraftPdf({ applicationNumber: c.applicationNumber, vesselName: c.vesselName,
      tonnage: c.tonnage.toString(), reference: proposedRegistry, issuedAt: new Date(), version });
    const file = await saveGeneratedDocument(tx, c, actor, 'CERTIFICATE_DRAFT', version, bytes);
    const roles = ['REGISTRATION_OFFICER', ...Array(Math.max(1, Math.min(Number(process.env.SUPERVISOR_COUNT) || 1, 10))).fill('SUPERVISING_OFFICIAL'), 'SHIP_REGISTRAR'];
    await tx.registrationCase.update({ where: { id }, data: { certificateVersion: version } });
    for (let sequence = 0; sequence < roles.length; sequence++) await tx.approval.create({ data: { caseId: id, sequence, role: roles[sequence], certificateVersion: version } });
    await event(tx, c, actor, 'draftGenerated', target, { certificate_version: version, draft_document_id: file.id, draft_sha256: file.sha256 });
    return { status: target, certificate_version: version, draft_document_id: file.id };
  }, { timeout: 15000 });
}
export async function approvals(actor: Actor, id: string) {
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor);
    return (await tx.approval.findMany({ where: { caseId: id, certificateVersion: c.certificateVersion }, orderBy: { sequence: 'asc' } }))
      .map(step => ({ id: step.id, sequence: step.sequence, role: step.role, result: step.result,
        certificate_version: step.certificateVersion, decided_at: step.decidedAt, draft_sha256: step.draftSha256 }));
  });
}
export async function decide(actor: Actor, id: string, stepId: string, raw: unknown) {
  const data = z.object({ result: z.enum(['APPROVED', 'RETURNED']), comments: z.string().nullable().optional() }).parse(raw);
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    const step = await tx.approval.findUnique({ where: { id: stepId } });
    if (!step || step.caseId !== id || step.certificateVersion !== c.certificateVersion) fail(404, 'Approval step not found');
    if (actor.role !== step.role || (step.assignee && step.assignee !== actor.id)) fail(403, 'Approval not assigned');
    if (step.result !== 'PENDING') fail(409, 'Already decided');
    const prior = await tx.approval.findMany({ where: { caseId: id, certificateVersion: c.certificateVersion, sequence: { lt: step.sequence } } });
    if (prior.some(item => item.result !== 'APPROVED')) fail(409, 'Prior approval missing');
    const expected = ({ REGISTRATION_OFFICER: 'OFFICER_SIGNATURE', SUPERVISING_OFFICIAL: 'SUPERVISOR_SIGNATURE', SHIP_REGISTRAR: 'REGISTRAR_SIGNATURE' } as Record<string, string>)[step.role];
    if (c.status !== expected) fail(409, 'Invalid approval stage');
    const draftFile = await latestDocument(tx, id, 'CERTIFICATE_DRAFT');
    if (!draftFile || draftFile.version !== c.certificateVersion) fail(409, 'Current draft PDF missing');
    const bytes = await readFile(storagePath(draftFile.storageKey));
    if (sha256(bytes) !== draftFile.sha256) fail(409, 'Draft PDF integrity check failed');
    if (prior.some(item => item.draftSha256 !== draftFile.sha256)) fail(409, 'Prior approval referenced a different draft');
    if (data.result === 'RETURNED' && (!data.comments || process.env.ENABLE_DIGITAL_SIGNATURES !== 'true')) fail(409, 'Return policy unapproved or comments missing');
    await tx.approval.update({ where: { id: stepId }, data: { result: data.result, comments: data.comments,
      decidedAt: new Date(), assignee: actor.id, draftSha256: draftFile.sha256 } });
    const next = await tx.approval.findFirst({ where: { caseId: id, certificateVersion: c.certificateVersion, sequence: { gt: step.sequence } }, orderBy: { sequence: 'asc' } });
    const target = data.result === 'RETURNED' ? 'CERTIFICATE_DRAFT' : next?.role === 'SUPERVISING_OFFICIAL' ? 'SUPERVISOR_SIGNATURE' : next?.role === 'SHIP_REGISTRAR' ? 'REGISTRAR_SIGNATURE' : 'READY_FOR_RELEASE';
    await event(tx, c, actor, 'approvalDecision', target, { step_id: stepId, result: data.result, certificate_version: c.certificateVersion, draft_sha256: draftFile.sha256 });
    return { status: target };
  });
}
export async function receiveApprovedDraft(actor: Actor, id: string) {
  requireRole(actor, 'REGISTRATION_OFFICER');
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    const steps = await tx.approval.findMany({ where: { caseId: id, certificateVersion: c.certificateVersion } });
    if (!steps.length || steps.some(step => step.result !== 'APPROVED')) fail(409, 'Approvals incomplete');
    const target = transition(c.status, 'officerReceivedApprovedDraft', c.intakeChannel);
    await event(tx, c, actor, 'officerReceivedApprovedDraft', target);
    return { status: target };
  });
}
function verificationOrigin() {
  const configured = process.env.APP_BASE_URL;
  if (!configured) fail(500, 'APP_BASE_URL is required for certificate verification');
  let url: URL;
  try { url = new URL(configured); } catch { fail(500, 'Invalid APP_BASE_URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail(500, 'Invalid APP_BASE_URL');
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(url.hostname)) fail(500, 'Certificate verification requires HTTPS');
  return url.origin;
}
export async function release(actor: Actor, id: string) {
  requireRole(actor, 'REGISTRATION_OFFICER');
  const origin = verificationOrigin();
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (c.status !== 'AWAITING_RELEASE') fail(409, 'Officer must receive approved draft first');
    const steps = await tx.approval.findMany({ where: { caseId: id, certificateVersion: c.certificateVersion }, orderBy: { sequence: 'asc' } });
    if (!steps.length || steps.some(step => step.result !== 'APPROVED' || !step.assignee || !step.decidedAt)) fail(409, 'Approvals incomplete');
    if (await tx.certificate.findUnique({ where: { caseId: id } })) fail(409, 'Certificate already issued');
    const draftFile = await latestDocument(tx, id, 'CERTIFICATE_DRAFT');
    if (!draftFile || draftFile.version !== c.certificateVersion || steps.some(step => step.draftSha256 !== draftFile.sha256)) fail(409, 'Approvals do not match current draft');
    const draftBytes = await readFile(storagePath(draftFile.storageKey));
    if (sha256(draftBytes) !== draftFile.sha256) fail(409, 'Draft PDF integrity check failed');
    const registry = `SVR-${c.applicationNumber.slice(3)}`, issuedAt = new Date(), certificateId = randomUUID();
    const verificationUrl = `${origin}/verify/${certificateId}`;
    const bytes = await buildCertificatePdf({ applicationNumber: c.applicationNumber, registryNumber: registry,
      vesselName: c.vesselName, tonnage: c.tonnage.toString(), certificateVersion: c.certificateVersion,
      approvalCount: steps.length, issuedAt, verificationUrl, draftSha256: draftFile.sha256,
      approvalRecords: steps.map(step => ({ role: step.role, actor: step.assignee!, decidedAt: step.decidedAt! })) });
    const key = `certificate-${certificateId}.pdf`;
    await mkdir(store(), { recursive: true });
    await writeFile(storagePath(key), bytes, { flag: 'wx' });
    await tx.certificate.create({ data: { id: certificateId, caseId: id, version: c.certificateVersion, registryNumber: registry,
      storageKey: key, sha256: sha256(bytes), issuedAt } });
    await tx.registrationCase.update({ where: { id }, data: { registryNumber: registry, releasedAt: issuedAt } });
    const target = transition(c.status, 'officerReleasedCertificate', c.intakeChannel);
    await event(tx, c, actor, 'officerReleasedCertificate', target, { certificate_version: c.certificateVersion, registry_number: registry, certificate_id: certificateId, retained_copy: key });
    return { status: target, registry_number: registry, certificate_version: c.certificateVersion, verification_url: verificationUrl };
  }, { timeout: 15000 });
}
export async function acknowledgeDelivery(actor: Actor, id: string, raw: unknown) {
  const data = z.object({ mode: z.enum(['PORTAL', 'IN_PERSON']), recipient_reference: z.string().trim().max(100).optional() }).parse(raw);
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (data.mode === 'PORTAL' && (c.intakeChannel !== 'PORTAL' || ![c.ownerId, c.representativeId].includes(actor.id))) fail(403, 'Applicant acknowledgement required');
    if (data.mode === 'IN_PERSON' && (c.intakeChannel !== 'EXTERNAL_CENTER' || actor.role !== 'REGISTRATION_OFFICER' || !data.recipient_reference)) fail(403, 'Officer and recipient reference required');
    const target = transition(c.status, 'deliveryAcknowledged', c.intakeChannel);
    const certificate = await tx.certificate.findUnique({ where: { caseId: id } });
    if (!certificate) fail(409, 'Released certificate missing');
    await tx.certificate.update({ where: { id: certificate.id }, data: { acknowledgedAt: new Date() } });
    await event(tx, c, actor, 'deliveryAcknowledged', target, { mode: data.mode, recipient_reference: data.recipient_reference || null });
    return { status: target };
  });
}
export async function audit(actor: Actor, id: string) {
  return db.$transaction(async tx => {
    await get(tx, id, actor);
    return (await tx.auditEvent.findMany({ where: { caseId: id }, orderBy: { createdAt: 'asc' } }))
      .map(item => ({ action: item.action, actor: item.actor, role: item.role, from_status: item.fromStatus,
        to_status: item.toStatus, detail: item.detail, created_at: item.createdAt }));
  });
}
export async function sla(actor: Actor, id: string) {
  return db.$transaction(async tx => {
    await get(tx, id, actor);
    const s = await tx.sla.findUnique({ where: { caseId: id } });
    return { target_working_days: [2, 3], started_at: s?.startedAt || null,
      pause_policy: process.env.SLA_PAUSE_NEEDS_INFORMATION === 'true' ? 'NEEDS_INFORMATION' : 'NONE',
      calendar: 'working days; holidays pending configuration' };
  });
}
export async function upload(actor: Actor, id: string, type: string, file: File) {
  if (!file) fail(422, 'File required');
  const precheck = await db.$transaction(tx => get(tx, id, actor, true));
  if (!ownerRoles.includes(actor.role) || !['DRAFT', 'NEEDS_INFORMATION', 'INSPECTION_IN_PROGRESS', 'AWAITING_INSPECTION_REPORT', 'CENTER_INTAKE', 'FINAL_REVIEW'].includes(precheck.status)) fail(403, 'Upload not permitted');
  if (![...requiredDocuments(precheck), 'INSPECTION_REPORT', 'OTHER'].includes(type)) fail(422, 'Unknown document type');
  if (file.size > 10_000_000) fail(422, 'PDF/JPEG/PNG under 10 MB required');
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length || bytes.length > 10_000_000) fail(422, 'PDF/JPEG/PNG under 10 MB required');
  const signature = bytes.subarray(0, 8);
  const media = signature.subarray(0, 5).toString() === '%PDF-' ? 'application/pdf'
    : signature[0] === 0xff && signature[1] === 0xd8 ? 'image/jpeg'
    : signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png' : null;
  if (!media) fail(422, 'Unsupported file contents');
  const key = randomUUID();
  await mkdir(store(), { recursive: true });
  await writeFile(storagePath(key), bytes, { flag: 'wx' });
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor, true);
    if (c.status !== precheck.status) fail(409, 'Case changed during upload');
    const last = await latestDocument(tx, id, type);
    const version = (last?.version || 0) + 1;
    const d = await tx.document.create({ data: { id: key, caseId: id, type, version, filename: basename(file.name || 'upload'),
      mediaType: media, sha256: sha256(bytes), storageKey: key } });
    await event(tx, c, actor, 'uploadDocument', c.status, { document_id: d.id, type, version });
    return { id: d.id, version };
  });
}
export async function download(actor: Actor, id: string, documentId?: string) {
  return db.$transaction(async tx => {
    const c = await get(tx, id, actor);
    if (documentId) {
      const d = await tx.document.findUnique({ where: { id: documentId } });
      if (!d || d.caseId !== id) fail(404, 'Document not found');
      if (d.type === 'CERTIFICATE_DRAFT' && !staff.includes(actor.role)) fail(403, 'Draft access denied');
      return { bytes: await readFile(storagePath(d.storageKey)), filename: d.filename, mediaType: d.mediaType };
    }
    const certificate = await tx.certificate.findUnique({ where: { caseId: id } });
    if (!certificate || certificate.caseId !== id) fail(404, 'Certificate not found');
    if (!['AWAITING_DELIVERY_ACK', 'COMPLETED'].includes(c.status)) fail(409, 'Certificate unreleased');
    const isPdf = certificate.storageKey.endsWith('.pdf');
    return { bytes: await readFile(storagePath(certificate.storageKey)), filename: `${c.registryNumber}.${isPdf ? 'pdf' : 'json'}`,
      mediaType: isPdf ? 'application/pdf' : 'application/json' };
  });
}
export async function downloadGenerated(actor: Actor, id: string, type: 'INSPECTION_FORM' | 'CERTIFICATE_DRAFT') {
  const document = await db.$transaction(async tx => {
    const c = await get(tx, id, actor);
    if (type === 'CERTIFICATE_DRAFT' && !staff.includes(actor.role)) fail(403, 'Draft access denied');
    return latestDocument(tx, c.id, type);
  });
  if (!document) fail(404, 'Generated document not found');
  return download(actor, id, document.id);
}
