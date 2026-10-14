import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';

export type CertificatePdfInput = {
  applicationNumber: string;
  registryNumber: string;
  vesselName: string;
  tonnage: string;
  certificateVersion: number;
  approvalCount: number;
  issuedAt: Date;
  verificationUrl: string;
  draftSha256?: string;
  approvalRecords?: { role: string; actor: string; decidedAt: Date }[];
};

export type WorkflowPdfInput = {
  applicationNumber: string;
  vesselName: string;
  tonnage: string;
  reference: string;
  issuedAt: Date;
  version?: number;
};

const navy = rgb(0.055, 0.16, 0.23);
const teal = rgb(0.035, 0.44, 0.49);
const muted = rgb(0.36, 0.44, 0.49);
const line = rgb(0.84, 0.89, 0.91);
const paper = rgb(0.975, 0.985, 0.99);

function fittedSize(font: PDFFont, value: string, preferred: number, width: number) {
  let size = preferred;
  while (size > 10 && font.widthOfTextAtSize(value, size) > width) size -= 0.5;
  return size;
}

export async function buildCertificatePdf(input: CertificatePdfInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontDir = join(process.cwd(), 'assets', 'fonts');
  const arabicBytes = await readFile(join(fontDir, 'NotoSansArabic.ttf'));
  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const arabic = await pdf.embedFont(arabicBytes, { subset: true });
  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, color: paper });
  page.drawRectangle({ x: 0, y: height - 153, width, height: 153, color: navy });
  page.drawRectangle({ x: 0, y: height - 159, width, height: 6, color: teal });
  page.drawText('MARITIME SERVICES PLATFORM', { x: 46, y: height - 43, size: 10, font: latin, color: rgb(0.62, 0.86, 0.88) });
  page.drawText('Small vessel registration', { x: 46, y: height - 88, size: 25, font: latin, color: rgb(1, 1, 1) });
  const arTitle = 'تسجيل سفينة صغيرة';
  page.drawText(arTitle, { x: width - 46 - arabic.widthOfTextAtSize(arTitle, 16), y: height - 125, size: 16, font: arabic, color: rgb(0.83, 0.94, 0.95) });

  page.drawText('REGISTRATION CERTIFICATE RECORD', { x: 46, y: 641, size: 17, font: latin, color: navy });
  page.drawRectangle({ x: 46, y: 588, width: width - 92, height: 34, color: rgb(1, 0.94, 0.82), borderColor: rgb(0.89, 0.68, 0.31), borderWidth: 1 });
  page.drawText('DEMO RECORD - NOT AN OFFICIAL CERTIFICATE', { x: 62, y: 599, size: 11, font: latin, color: rgb(0.47, 0.28, 0.05) });

  page.drawRectangle({ x: 46, y: 505, width: width - 92, height: 64, color: rgb(0.9, 0.96, 0.97), borderColor: line, borderWidth: 1 });
  page.drawText('REGISTRY REFERENCE', { x: 62, y: 545, size: 9, font: latin, color: muted });
  page.drawText(input.registryNumber, { x: 62, y: 519, size: fittedSize(latin, input.registryNumber, 20, 460), font: latin, color: navy });

  const field = (label: string, value: string, x: number, y: number, fieldWidth = 220) => {
    page.drawText(label, { x, y: y + 24, size: 9, font: latin, color: muted });
    const chosen = /[\u0600-\u06ff]/.test(value) ? arabic : latin;
    const size = fittedSize(chosen, value, 14, fieldWidth);
    page.drawText(value, { x, y, size, font: chosen, color: navy });
  };
  field('VESSEL NAME', input.vesselName, 62, 452, 220);
  field('DECLARED TONNAGE', `${input.tonnage} (unit unconfirmed)`, 319, 452, 215);
  page.drawLine({ start: { x: 46, y: 428 }, end: { x: width - 46, y: 428 }, thickness: 1, color: line });
  field('APPLICATION NUMBER', input.applicationNumber, 62, 391, 220);
  field('CERTIFICATE VERSION', String(input.certificateVersion), 319, 391, 215);
  page.drawLine({ start: { x: 46, y: 367 }, end: { x: width - 46, y: 367 }, thickness: 1, color: line });
  field('RECORDED AT (UTC)', input.issuedAt.toISOString().replace('T', ' ').slice(0, 19), 62, 330, 220);
  field('WORKFLOW APPROVALS', String(input.approvalCount), 319, 330, 215);

  page.drawRectangle({ x: 46, y: 133, width: width - 92, height: 165, color: rgb(1, 1, 1), borderColor: line, borderWidth: 1 });
  const qr = await QRCode.toBuffer(input.verificationUrl, { type: 'png', errorCorrectionLevel: 'M', margin: 1, width: 480, color: { dark: '#10394B', light: '#FFFFFF' } });
  const qrImage = await pdf.embedPng(qr);
  page.drawImage(qrImage, { x: 60, y: 149, width: 133, height: 133 });
  page.drawText('VERIFY THIS RECORD', { x: 213, y: 259, size: 12, font: latin, color: navy });
  page.drawText('Scan the QR code or open the link below.', { x: 213, y: 237, size: 10, font: latin, color: muted });
  const urlSize = fittedSize(latin, input.verificationUrl, 9, 318);
  page.drawText(input.verificationUrl, { x: 213, y: 212, size: urlSize, font: latin, color: teal });
  page.drawText('Verification checks the platform record and file integrity.', { x: 213, y: 178, size: 8.4, font: latin, color: muted });
  page.drawText('It does not establish legal registration or signature validity.', { x: 213, y: 163, size: 8.4, font: latin, color: muted });

  page.drawLine({ start: { x: 46, y: 107 }, end: { x: width - 46, y: 107 }, thickness: 1, color: line });
  page.drawText('Procedure A.4.1/1  |  Small vessel under 150 tons', { x: 46, y: 85, size: 9, font: latin, color: muted });
  page.drawText('Demo workflow artifact  -  retain with application record', { x: 46, y: 69, size: 9, font: latin, color: muted });
  page.drawText('DEMO', { x: 130, y: 385, size: 90, font: latin, color: rgb(0.13, 0.47, 0.52), rotate: degrees(29), opacity: 0.08 });
  if (input.approvalRecords?.length) {
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const records = input.approvalRecords;
    for (let start = 0; start < records.length; start += 6) {
      const trail = pdf.addPage([595.28, 841.89]);
      trail.drawRectangle({ x: 0, y: 0, width, height, color: paper });
      trail.drawRectangle({ x: 0, y: 744, width, height: 98, color: navy });
      trail.drawText('RECORDED WORKFLOW APPROVALS', { x: 45, y: 787, size: 18, font: bold, color: rgb(1, 1, 1) });
      trail.drawText(input.registryNumber, { x: 45, y: 760, size: 11, font: latin, color: rgb(0.72, 0.9, 0.91) });
      trail.drawText('DEMO ATTESTATIONS - NOT LEGAL DIGITAL SIGNATURES', { x: 45, y: 709, size: 12, font: bold, color: rgb(0.53, 0.28, 0.06) });
      trail.drawText('Each decision was recorded against the same immutable draft PDF fingerprint.', { x: 45, y: 683, size: 10, font: latin, color: muted });
      let y = 632;
      records.slice(start, start + 6).forEach((record, index) => {
      trail.drawRectangle({ x: 45, y: y - 34, width: 505, height: 66, color: index % 2 ? rgb(0.96, 0.98, 0.99) : rgb(0.91, 0.96, 0.97) });
      trail.drawText(`${start + index + 1}. ${record.role.replaceAll('_', ' ')}`, { x: 58, y: y + 9, size: 10, font: bold, color: navy });
      trail.drawText(`Actor: ${record.actor}`, { x: 58, y: y - 8, size: 9, font: latin, color: muted });
      trail.drawText(`Recorded: ${record.decidedAt.toISOString().slice(0, 19)} UTC`, { x: 58, y: y - 23, size: 9, font: latin, color: muted });
      y -= 78;
      });
      trail.drawText('Approved draft SHA-256', { x: 45, y: 130, size: 10, font: bold, color: navy });
      trail.drawText(input.draftSha256 || 'Not recorded', { x: 45, y: 111, size: 9, font: latin, color: muted });
      trail.drawText('This page records system decisions only. No cryptographic signer certificate is attached.', { x: 45, y: 67, size: 9, font: latin, color: muted });
    }
  }
  pdf.setTitle(`Demo certificate record ${input.registryNumber}`);
  pdf.setSubject('Small vessel registration workflow record - not an official certificate');
  pdf.setCreator('Maritime Services Platform');
  return Buffer.from(await pdf.save());
}

async function buildWorkflowPdf(input: WorkflowPdfInput, kind: 'INSPECTION FORM' | 'CERTIFICATE DRAFT') {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const arabic = await pdf.embedFont(await readFile(join(process.cwd(), 'assets', 'fonts', 'NotoSansArabic.ttf')), { subset: true });
  const page = pdf.addPage([595.28, 841.89]);
  page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: paper });
  page.drawRectangle({ x: 0, y: 708, width: 595.28, height: 134, color: navy });
  page.drawText('MARITIME SERVICES PLATFORM', { x: 45, y: 806, size: 10, font: latin, color: rgb(0.72, 0.9, 0.91) });
  page.drawText(kind === 'INSPECTION FORM' ? 'Small vessel inspection form' : 'Small vessel certificate draft', { x: 45, y: 765, size: 23, font: bold, color: rgb(1, 1, 1) });
  page.drawText('DEMO WORKFLOW DOCUMENT - NOT AN OFFICIAL FORM', { x: 45, y: 672, size: 11, font: bold, color: rgb(0.55, 0.29, 0.05) });
  const fields: [string, string][] = [
    ['REFERENCE', input.reference], ['APPLICATION', input.applicationNumber],
    ['VESSEL', input.vesselName], ['DECLARED TONNAGE', `${input.tonnage} (unit unconfirmed)`],
    ['CREATED (UTC)', input.issuedAt.toISOString().slice(0, 19)],
  ];
  if (input.version) fields.push(['DRAFT VERSION', String(input.version)]);
  let y = 612;
  for (const [label, value] of fields) {
    page.drawText(label, { x: 48, y, size: 9, font: bold, color: muted });
    const chosen = /[\u0600-\u06ff]/.test(value) ? arabic : latin;
    page.drawText(value, { x: 48, y: y - 25, size: fittedSize(chosen, value, 14, 495), font: chosen, color: navy });
    page.drawLine({ start: { x: 45, y: y - 40 }, end: { x: 550, y: y - 40 }, thickness: 1, color: line });
    y -= 76;
  }
  if (kind === 'INSPECTION FORM') {
    page.drawText('EXTERNAL INSPECTION', { x: 48, y: 186, size: 12, font: bold, color: navy });
    page.drawText('Take this referral and supporting documents to an external inspection center.', { x: 48, y: 163, size: 10, font: latin, color: muted });
    page.drawText('The center must provide its own inspection report. This form records no approval.', { x: 48, y: 145, size: 10, font: latin, color: muted });
  } else {
    page.drawText('APPROVAL COPY', { x: 48, y: 126, size: 12, font: bold, color: navy });
    page.drawText('Each approver reviews this exact draft. Recorded decisions are demo attestations.', { x: 48, y: 105, size: 10, font: latin, color: muted });
  }
  page.drawText('Procedure A.4.1/1  |  Demo workflow only', { x: 48, y: 62, size: 9, font: latin, color: muted });
  pdf.setTitle(`${kind} ${input.reference}`);
  return Buffer.from(await pdf.save());
}

export function buildInspectionFormPdf(input: WorkflowPdfInput) { return buildWorkflowPdf(input, 'INSPECTION FORM'); }
export function buildCertificateDraftPdf(input: WorkflowPdfInput) { return buildWorkflowPdf(input, 'CERTIFICATE DRAFT'); }
