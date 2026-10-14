import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { db } from '../src/lib/db';
import { buildCertificatePdf } from '../src/server/certificate-pdf';

async function main() {
  const id = process.argv[2];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Usage: npx tsx scripts/upgrade-legacy-certificate.ts <certificate UUID>');
  const base = process.env.APP_BASE_URL;
  if (!base) throw new Error('APP_BASE_URL is required');
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(url.hostname))) throw new Error('A public HTTPS origin is required');
  const origin = url.origin;
  const certificate = await db.certificate.findUnique({ where: { id }, include: { case: true } });
  if (!certificate) throw new Error('Certificate not found');
  if (certificate.case.status !== 'COMPLETED') throw new Error('Case is not completed');
  if (certificate.storageKey.endsWith('.pdf')) { console.log('Already a PDF'); return; }
  if (!certificate.storageKey.endsWith('.json') || basename(certificate.storageKey) !== certificate.storageKey) throw new Error('Unexpected legacy file path');
  const directory = process.env.FILE_STORE || './private_uploads';
  const original = await readFile(join(directory, certificate.storageKey));
  if (createHash('sha256').update(original).digest('hex') !== certificate.sha256) throw new Error('Legacy certificate hash mismatch');
  const approvalCount = await db.approval.count({ where: { caseId: certificate.caseId, certificateVersion: certificate.version, result: 'APPROVED' } });
  const bytes = await buildCertificatePdf({
    applicationNumber: certificate.case.applicationNumber,
    registryNumber: certificate.registryNumber,
    vesselName: certificate.case.vesselName,
    tonnage: certificate.case.tonnage.toString(),
    certificateVersion: certificate.version,
    approvalCount,
    issuedAt: certificate.issuedAt,
    verificationUrl: `${origin}/verify/${certificate.id}`,
  });
  const key = `certificate-${certificate.id}.pdf`;
  const path = join(directory, key);
  await writeFile(path, bytes, { flag: 'wx' });
  try {
    await db.$transaction(async tx => {
      const updated = await tx.certificate.updateMany({ where: { id, storageKey: certificate.storageKey, sha256: certificate.sha256 }, data: { storageKey: key, sha256: createHash('sha256').update(bytes).digest('hex') } });
      if (updated.count !== 1) throw new Error('Certificate changed during migration');
      await tx.auditEvent.create({ data: { caseId: certificate.caseId, actor: 'SYSTEM-MIGRATION', role: 'SYSTEM', action: 'legacyCertificateConvertedToPdf', fromStatus: 'COMPLETED', toStatus: 'COMPLETED', detail: { original_file: certificate.storageKey, certificate_id: id } } });
    });
  } catch (error) { await unlink(path); throw error; }
  console.log(`Converted ${id} to PDF; original ${certificate.storageKey} retained`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
