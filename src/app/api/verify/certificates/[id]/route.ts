import { verifyCertificate } from '@/server/certificate-verification';

export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await verifyCertificate(id);
  if (!result) return Response.json({ error: 'Certificate record not found' }, { status: 404 });
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
