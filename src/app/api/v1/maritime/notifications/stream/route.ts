import { currentActor } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { liveHub } from '@/server/live-updates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 20_000;
/** Streams end periodically so the browser reconnects and the session is checked again. */
const MAX_STREAM_MS = 10 * 60_000;

/** Server-Sent Events stream of workflow updates visible to the signed-in user. */
export async function GET(request: Request) {
  let actor;
  try { actor = await currentActor(); }
  catch (error) { return Response.json({ error: error instanceof AppError ? error.message : 'Unauthorized' }, { status: error instanceof AppError ? error.status : 401 }); }

  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(chunk)); } catch { cleanup(); }
      };
      const unsubscribe = liveHub.subscribe({ actor, deliver: items => write(`event: update\ndata: ${JSON.stringify(items)}\n\n`) });
      const heartbeat = setInterval(() => write(': ping\n\n'), HEARTBEAT_MS);
      const expiry = setTimeout(() => cleanup(), MAX_STREAM_MS);
      cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe(); clearInterval(heartbeat); clearTimeout(expiry);
        request.signal.removeEventListener('abort', cleanup);
        try { controller.close(); } catch { /* already closed */ }
      };
      request.signal.addEventListener('abort', cleanup);
      write('retry: 3000\n\nevent: ready\ndata: {}\n\n');
    },
    cancel() { cleanup(); },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      // no-transform keeps response compression from buffering the stream.
      'Cache-Control': 'no-cache, no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
