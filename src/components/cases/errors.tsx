'use client';

import { useI18n } from '@/i18n/provider';
import { ApiError } from '@/lib/cases/api';
import { Alert } from '@/components/ui/primitives';

/** Map API errors to localized text. Raw server text is kept as a secondary, language-tagged detail. */
export function useErrorText() {
  const { t, f, label, locale } = useI18n();
  return (error: unknown): { message: string; detail: string | null } => {
    if (!(error instanceof ApiError)) return { message: t.errors.generic, detail: null };
    if (error.status === 0) return { message: t.errors.network, detail: null };
    const raw = error.message;
    const verification = raw.match(/^Officer verification required: (.+)$/);
    if (verification) return { message: f(t.errors.verificationRequired, { documents: verification[1].split(', ').map(type => label(t.documentTypes, type)).join(locale === 'ar' ? '، ' : ', ') }), detail: null };
    const known: Record<string, string> = {
      'Stale version': t.errors.staleVersion,
      'Fee or verified inspection report missing': t.errors.feeOrReport,
      'Latest verified inspection report required': t.errors.reportRequired,
      'Verified center receipt required': t.errors.receiptRequired,
      'Unsupported file contents': t.errors.unsupportedFile,
      'PDF/JPEG/PNG under 10 MB required': t.caseView.fileRules,
      'Approvals incomplete': t.errors.approvalsIncomplete,
      'Case changed during upload': t.errors.caseChanged,
      'Invalid credentials': t.auth.invalid,
    };
    if (known[raw]) return { message: known[raw], detail: null };
    const byStatus = (t.errors as Record<string, string>)[String(error.status)] || t.errors.generic;
    return { message: byStatus, detail: raw && raw !== 'Request failed' && raw !== 'Internal error' ? raw : null };
  };
}

export function ErrorAlert({ error }: { error: unknown }) {
  const { t, f } = useI18n();
  const describe = useErrorText();
  if (!error) return null;
  const { message, detail } = describe(error);
  return (
    <Alert tone="danger" role="alert">
      {message}
      {detail && <span className="alert-detail">{f(t.errors.details, { message: '' })}<span lang="en" dir="ltr">{detail}</span></span>}
    </Alert>
  );
}
