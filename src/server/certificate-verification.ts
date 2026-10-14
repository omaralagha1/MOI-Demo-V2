import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db } from '@/lib/db';

export async function verifyCertificate(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const record = await db.certificate.findUnique({ where: { id }, include: { case: { select: { status: true, vesselName: true } } } });
  if (!record) return null;
  let intact = false;
  if (record.storageKey.endsWith('.pdf') && record.storageKey === record.storageKey.split(/[\\/]/).at(-1)) {
    try {
      const bytes = await readFile(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ process.env.FILE_STORE || './private_uploads', record.storageKey));
      intact = bytes.subarray(0, 5).toString() === '%PDF-' && createHash('sha256').update(bytes).digest('hex') === record.sha256;
    } catch { intact = false; }
  }
  if (!['AWAITING_DELIVERY_ACK', 'COMPLETED'].includes(record.case.status) || !intact) return { verified: false as const, record_type: 'DEMO_WORKFLOW_CERTIFICATE' };
  return {
    verified: true as const,
    registry_number: record.registryNumber,
    vessel_name: record.case.vesselName,
    certificate_version: record.version,
    recorded_at: record.issuedAt.toISOString(),
    record_type: 'DEMO_WORKFLOW_CERTIFICATE',
  };
}
