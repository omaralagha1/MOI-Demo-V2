import { APPROVAL_STATUSES, awaitsRole, DOCUMENT_REVIEW_STATUSES, stageIndex, type CaseSummary } from '@/lib/cases/model';

/** Work-queue views over the case list. Filters only; the API enforces what each role may do. */
export type WorkspaceView = 'queue' | 'all' | 'verification' | 'inspections' | 'approvals';
export const workspaceViews: WorkspaceView[] = ['queue', 'all', 'verification', 'inspections', 'approvals'];

export function inView(view: WorkspaceView, c: CaseSummary, role: string) {
  switch (view) {
    case 'queue': return awaitsRole(c, role);
    case 'verification': return DOCUMENT_REVIEW_STATUSES.has(c.status);
    case 'inspections': return stageIndex(c.status) === 3;
    case 'approvals': return APPROVAL_STATUSES.has(c.status);
    default: return true;
  }
}

export const isWorkspaceView = (value: string | null | undefined): value is WorkspaceView => !!value && (workspaceViews as string[]).includes(value);
