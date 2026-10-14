import type { Actor } from '@/lib/auth';
import { db } from '@/lib/db';
import { canSee, toNotification, type FeedRow, type Notification } from '@/lib/cases/notifications';
import { STAFF_ROLES } from '@/lib/cases/model';

/**
 * Change feed for live page updates and notifications.
 *
 * Every workflow action writes an audit event in the same transaction as the change, so the audit table is the
 * source of truth. One poller per server process reads recent events and fans them out to connected browsers.
 * It re-reads a trailing window (longer than the slowest workflow transaction) and de-duplicates by id, so events
 * from transactions that commit late are not missed. `kick()` triggers an immediate read after API mutations.
 */
const INTERVAL_MS = 2_000;
const LOOKBACK_MS = 30_000;
const caseFields = { ownerId: true, representativeId: true, applicationNumber: true, vesselName: true, status: true, intakeChannel: true } as const;
const select = { id: true, caseId: true, actor: true, role: true, action: true, fromStatus: true, toStatus: true, createdAt: true, case: { select: caseFields } } as const;

type Subscriber = { actor: Actor; deliver: (items: Notification[]) => void };

class LiveHub {
  private subscribers = new Set<Subscriber>();
  private seen = new Map<string, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private primed = false;
  private running = false;
  private again = false;

  subscribe(subscriber: Subscriber) {
    this.subscribers.add(subscriber);
    if (!this.timer) {
      this.timer = setInterval(() => void this.poll(), INTERVAL_MS);
      void this.poll();
    }
    return () => {
      this.subscribers.delete(subscriber);
      if (!this.subscribers.size && this.timer) { clearInterval(this.timer); this.timer = null; this.primed = false; this.seen.clear(); }
    };
  }

  /** Read the feed now (called after successful API mutations in this process). */
  kick() { if (this.subscribers.size) void this.poll(); }

  private async poll() {
    if (this.running) { this.again = true; return; }
    this.running = true;
    try {
      const since = Date.now() - LOOKBACK_MS;
      const rows: FeedRow[] = await db.auditEvent.findMany({ where: { createdAt: { gte: new Date(since) } }, orderBy: { createdAt: 'asc' }, take: 500, select });
      const fresh = rows.filter(row => !this.seen.has(row.id));
      for (const row of fresh) this.seen.set(row.id, row.createdAt.getTime());
      for (const [id, at] of this.seen) if (at < since - 5_000) this.seen.delete(id);
      // The first read only records what already exists; clients load history separately.
      if (!this.primed) { this.primed = true; return; }
      if (!fresh.length) return;
      for (const subscriber of this.subscribers) {
        const items = fresh.filter(row => canSee(row, subscriber.actor)).map(row => toNotification(row, subscriber.actor));
        if (items.length) {
          try { subscriber.deliver(items); } catch { /* a closed stream unsubscribes itself */ }
        }
      }
    } catch (error) {
      console.error('Live update feed read failed', error instanceof Error ? error.name : 'Unknown error');
    } finally {
      this.running = false;
      if (this.again) { this.again = false; void this.poll(); }
    }
  }
}

const shared = globalThis as unknown as { kmsLiveHub?: LiveHub };
/** One hub per server process, shared by every route handler (and kept across dev hot reloads). */
export const liveHub = shared.kmsLiveHub ??= new LiveHub();

/** Most recent events the user is allowed to see, newest first. */
export async function recentNotifications(actor: Actor, limit = 30): Promise<Notification[]> {
  const where = STAFF_ROLES.has(actor.role) ? {} : { case: { OR: [{ ownerId: actor.id }, { representativeId: actor.id }] } };
  const rows: FeedRow[] = await db.auditEvent.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 100), select });
  return rows.map(row => toNotification(row, actor));
}
