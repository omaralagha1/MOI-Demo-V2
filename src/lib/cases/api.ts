import type { Approval, AuditEvent, CaseDetail, CaseSummary, Fee, Sla } from './model';

/** Browser client for the existing REST API (docs/API_DOCUMENTATION.md). */
export const CASES_BASE = '/api/v1/maritime/small-vessel-registrations';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(path, options); }
  catch { throw new ApiError(0, 'Network error'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, (data as { error?: string }).error || 'Request failed');
  return data as T;
}

const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const casesApi = {
  list: (params: { limit?: number; offset?: number; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    if (params.status) query.set('status', params.status);
    return api<CaseSummary[]>(`${CASES_BASE}${query.size ? `?${query}` : ''}`);
  },
  /** Pages through the list endpoint (100 per request, the API maximum). */
  async listAll(max = 1000) {
    const all: CaseSummary[] = [];
    for (let offset = 0; offset < max; offset += 100) {
      const page = await casesApi.list({ limit: 100, offset });
      all.push(...page);
      if (page.length < 100) break;
    }
    return all;
  },
  detail: (id: string) => api<CaseDetail>(`${CASES_BASE}/${id}`),
  events: (id: string) => api<AuditEvent[]>(`${CASES_BASE}/${id}/audit-events`),
  approvals: (id: string) => api<Approval[]>(`${CASES_BASE}/${id}/approvals`),
  fees: (id: string) => api<Fee>(`${CASES_BASE}/${id}/fees`),
  sla: (id: string) => api<Sla>(`${CASES_BASE}/${id}/sla`),
  create: (body: Record<string, unknown>) => api<CaseSummary>(CASES_BASE, json(body)),
  action: (id: string, suffix: string, body?: object) =>
    api<{ status?: string; missing?: string[] }>(`${CASES_BASE}/${id}/${suffix}`, body ? json(body) : { method: 'POST' }),
  upload: (id: string, type: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api<{ id: string; version: number }>(`${CASES_BASE}/${id}/documents?type=${encodeURIComponent(type)}`, { method: 'POST', body: form });
  },
};

export const fileUrls = {
  document: (id: string, documentId: string) => `${CASES_BASE}/${id}/documents/${documentId}`,
  inspectionForm: (id: string) => `${CASES_BASE}/${id}/inspection-form`,
  draft: (id: string) => `${CASES_BASE}/${id}/certificate/draft`,
  certificate: (id: string) => `${CASES_BASE}/${id}/certificate`,
};

export const authApi = {
  login: (email: string, password: string) => api<{ id: string; role: string; displayName: string }>('/api/auth/login', json({ email, password })),
  logout: () => api<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
};
