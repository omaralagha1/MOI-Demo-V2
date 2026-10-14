'use client';

import { useCallback, useEffect, useState } from 'react';
import { casesApi } from '@/lib/cases/api';
import type { AuditEvent, CaseSummary } from '@/lib/cases/model';
import { useLiveRefresh } from '@/components/live/LiveUpdatesProvider';

/** All cases visible to the signed-in user (the API scopes applicants to their own cases). */
export function useCaseList() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const load = useCallback(async () => {
    try { setCases(await casesApi.listAll()); setError(null); }
    catch (failure) { setError(failure); setCases(current => current ?? []); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // Keep lists, counts and dashboards current as cases change.
  useLiveRefresh(() => { load(); });
  return { cases, error, reload: load };
}

export type ActivityItem = AuditEvent & { case: CaseSummary };

const byUpdated = (a: CaseSummary, b: CaseSummary) => (b.updated_at || '').localeCompare(a.updated_at || '');

/** Recent audit events across the most recently updated cases (notifications feed). */
export function useRecentActivity(cases: CaseSummary[] | null, caseLimit = 5, eventLimit = 8) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  useEffect(() => {
    if (!cases) return;
    let cancelled = false;
    const recent = [...cases].sort(byUpdated).slice(0, caseLimit);
    Promise.all(recent.map(c => casesApi.events(c.id).then(events => events.map(event => ({ ...event, case: c }))).catch(() => [] as ActivityItem[])))
      .then(groups => {
        if (cancelled) return;
        setItems(groups.flat().filter(event => event.action !== 'uploadDocument').sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, eventLimit));
      });
    return () => { cancelled = true; };
  }, [cases, caseLimit, eventLimit]);
  return items;
}
