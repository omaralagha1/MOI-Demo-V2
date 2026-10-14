import { currentActor } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { recentNotifications } from '@/server/live-updates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Recent workflow updates visible to the signed-in user (newest first). */
export async function GET(request: Request) {
  try {
    const actor = await currentActor();
    const limit = Number(new URL(request.url).searchParams.get('limit') || 30) || 30;
    return Response.json(await recentNotifications(actor, limit), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status });
    console.error('Notification list failed', error instanceof Error ? error.name : 'Unknown error');
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
