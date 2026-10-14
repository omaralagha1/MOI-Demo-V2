'use client';

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/i18n/provider';
import { casesApi } from '@/lib/cases/api';
import type { Approval, AuditEvent, CaseDetail, Fee, Sla } from '@/lib/cases/model';
import { useToast } from '@/components/ui/Toast';
import { useLiveRefresh } from '@/components/live/LiveUpdatesProvider';

export type CaseBundle = { detail: CaseDetail; events: AuditEvent[]; approvals: Approval[]; fee: Fee; sla: Sla | null };

/** Loads one case with its history, approvals, fees and SLA, and runs workflow actions against the API. */
export function useCaseData(id: string) {
  const { t, f, label } = useI18n();
  const toast = useToast();
  const [data, setData] = useState<CaseBundle | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [detail, events, approvals, fee, sla] = await Promise.all([
        casesApi.detail(id), casesApi.events(id), casesApi.approvals(id), casesApi.fees(id), casesApi.sla(id).catch(() => null),
      ]);
      setData({ detail, events, approvals, fee, sla });
      setLoadError(null);
    } catch (error) { setLoadError(error); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Another user (or another tab) changed this case: reload it in place and say who changed what.
  useLiveRefresh(items => {
    load();
    const other = items.filter(item => !item.mine && !item.forYou).pop();
    if (other) toast(f(t.notifications.caseUpdated, { action: label(t.auditActions, other.action), role: label(t.roles, other.role) }));
  }, id);

  /** Run one action; on success reload the case and confirm politely, on failure show the reason inline. */
  const run = useCallback(async <T,>(key: string, task: () => Promise<T>, success?: string) => {
    setBusy(key); setActionError(null);
    try {
      const result = await task();
      await load();
      toast(success || t.common.actionRecorded);
      return result;
    } catch (error) {
      setActionError(error);
      if ((error as { status?: number }).status === 409) await load();
      return null;
    } finally { setBusy(null); }
  }, [load, toast, t]);

  const action = (suffix: string, body?: object, success?: string) => run(suffix, () => casesApi.action(id, suffix, body), success);
  const upload = async (type: string, file: File) =>
    (await run(`upload:${type}`, () => casesApi.upload(id, type, file), f(t.caseView.uploaded, { document: label(t.documentTypes, type) }))) !== null;

  return { data, loadError, actionError, clearActionError: () => setActionError(null), busy, reload: load, run, action, upload };
}
export type CaseController = ReturnType<typeof useCaseData>;
