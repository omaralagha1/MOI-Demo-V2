'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n/provider';
import { isListed, type Notification } from '@/lib/cases/notifications';
import { useToast } from '@/components/ui/Toast';

type Listener = (items: Notification[]) => void;
export type LiveStatus = 'connecting' | 'live' | 'polling' | 'offline';
type LiveContext = {
  items: Notification[];
  unread: number;
  lastSeen: number | null;
  status: LiveStatus;
  markAllRead: () => void;
  subscribe: (listener: Listener) => () => void;
};

const Context = createContext<LiveContext | null>(null);
const LIST_URL = '/api/v1/maritime/notifications?limit=40';
const STREAM_URL = '/api/v1/maritime/notifications/stream';
const POLL_MS = 10_000;

/**
 * One live connection per tab for signed-in users. Pages subscribe to refresh their data when a related case changes;
 * the notification bell reads the list. Falls back to polling when streaming is unavailable (for example behind a proxy).
 */
export function LiveUpdatesProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { t, f, label } = useI18n();
  const toast = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const known = useRef(new Set<string>());
  const listeners = useRef(new Set<Listener>());
  const seenKey = `kms-notifications-seen:${userId}`;

  useEffect(() => {
    try { const stored = Number(localStorage.getItem(seenKey)); if (stored) setLastSeen(stored); } catch { /* per-browser convenience only */ }
  }, [seenKey]);

  /** Merge items; returns those not seen before in this tab. */
  const merge = useCallback((incoming: Notification[]) => {
    const fresh = incoming.filter(item => !known.current.has(item.id));
    if (!fresh.length) return fresh;
    for (const item of fresh) known.current.add(item.id);
    setItems(current => [...fresh, ...current].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 60));
    return fresh;
  }, []);

  const announce = useCallback((fresh: Notification[]) => {
    if (!fresh.length) return;
    listeners.current.forEach(listener => { try { listener(fresh); } catch { /* listener errors stay local */ } });
    const request = fresh.find(item => item.forYou && !item.mine);
    if (request) toast(f(t.notifications.newRequestToast, { action: label(t.auditActions, request.action), application: request.applicationNumber }));
  }, [toast, f, t, label]);

  useEffect(() => {
    let source: EventSource | null = null;
    let poller: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let failures = 0;

    const load = async () => {
      const response = await fetch(LIST_URL, { cache: 'no-store' });
      if (response.status === 401) { cancelled = true; setStatus('offline'); return null; }
      if (!response.ok) throw new Error('Notifications unavailable');
      return (await response.json()) as Notification[];
    };
    const startPolling = () => {
      if (poller || cancelled) return;
      setStatus('polling');
      poller = setInterval(async () => {
        try { const list = await load(); if (list) announce(merge(list)); }
        catch { setStatus('offline'); }
      }, POLL_MS);
    };
    const connect = () => {
      if (cancelled || typeof EventSource === 'undefined') { startPolling(); return; }
      source = new EventSource(STREAM_URL);
      source.addEventListener('ready', () => { failures = 0; setStatus('live'); });
      source.addEventListener('update', event => {
        try { announce(merge(JSON.parse((event as MessageEvent).data) as Notification[])); } catch { /* malformed event */ }
      });
      source.onerror = () => {
        if (cancelled) return;
        failures += 1;
        // The browser retries on its own; after repeated failures (or a permanent close) switch to polling.
        if (source?.readyState === EventSource.CLOSED || failures >= 3) { source?.close(); source = null; startPolling(); }
        else setStatus('connecting');
      };
    };

    load().then(list => { if (list && !cancelled) { merge(list); connect(); } }).catch(() => { if (!cancelled) startPolling(); });
    return () => { cancelled = true; source?.close(); if (poller) clearInterval(poller); };
  }, [merge, announce]);

  const listed = useMemo(() => items.filter(isListed), [items]);
  // Before the bell is first opened in this browser, count only updates still waiting on the user.
  const unread = lastSeen === null
    ? listed.filter(item => item.forYou && item.caseStatus === item.toStatus).length
    : listed.filter(item => Date.parse(item.createdAt) > lastSeen).length;

  const markAllRead = useCallback(() => {
    const now = Date.now();
    setLastSeen(now);
    try { localStorage.setItem(seenKey, String(now)); } catch { /* storage unavailable */ }
  }, [seenKey]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => { listeners.current.delete(listener); };
  }, []);

  const value = useMemo(() => ({ items: listed, unread, lastSeen, status, markAllRead, subscribe }), [listed, unread, lastSeen, status, markAllRead, subscribe]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useLiveUpdates = () => useContext(Context);

/**
 * Call `onChange` (debounced) when live updates arrive. With `caseId`, only changes to that case count.
 * Does nothing outside a LiveUpdatesProvider (for example when signed out).
 */
export function useLiveRefresh(onChange: (items: Notification[]) => void, caseId?: string | null) {
  // Depend only on the stable subscribe function: the context value changes with every notification.
  const subscribe = useLiveUpdates()?.subscribe;
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    if (!subscribe) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let batch: Notification[] = [];
    const unsubscribe = subscribe(items => {
      const relevant = caseId === undefined ? items : items.filter(item => item.caseId === caseId);
      if (!relevant.length) return;
      batch.push(...relevant);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { const ready = batch; batch = []; callback.current(ready); }, 350);
    });
    return () => { unsubscribe(); if (timer) clearTimeout(timer); };
  }, [subscribe, caseId]);
}
