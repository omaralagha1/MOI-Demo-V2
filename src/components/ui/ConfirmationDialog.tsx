'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

export type DialogRequest = {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  /** When set, the dialog asks for a required text reason and passes it to onConfirm. */
  reason?: { label: string; hint?: string };
  onConfirm: (reason?: string) => void | Promise<void>;
};

/**
 * Accessible confirmation built on the native <dialog> element (modal focus trap, Escape to close,
 * focus returned to the opener). Replaces window.confirm / window.prompt.
 */
export function ConfirmationDialog({ request, onClose }: { request: DialogRequest | null; onClose: () => void }) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const [reason, setReason] = useState('');
  const titleId = useId();
  const reasonId = useId();

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (request && !node.open) { opener.current = document.activeElement; setReason(''); node.showModal(); }
    if (!request && node.open) node.close();
  }, [request]);

  const close = () => {
    onClose();
    if (opener.current instanceof HTMLElement) opener.current.focus();
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!request) return;
    if (request.reason && !reason.trim()) return;
    const current = request;
    close();
    await current.onConfirm(current.reason ? reason.trim() : undefined);
  };

  return (
    <dialog ref={dialog} className="dialog" aria-labelledby={titleId} onClose={() => request && close()}>
      {request && (
        <form onSubmit={submit}>
          <div className="dialog-body">
            <div className="dialog-head">
              <span className={`icon-tile ${request.tone === 'danger' ? 'icon-tile-warning' : ''}`}>{request.tone === 'danger' ? <AlertTriangle size={22} aria-hidden="true" /> : <HelpCircle size={22} aria-hidden="true" />}</span>
              <div>
                <h2 className="dialog-title" id={titleId}>{request.title}</h2>
                {request.body && <div className="dialog-text">{request.body}</div>}
              </div>
            </div>
            {request.reason && (
              <div className="field">
                <label className="field-label" htmlFor={reasonId}>{request.reason.label}<span className="field-required" aria-hidden="true">*</span></label>
                {request.reason.hint && <p className="field-hint" id={`${reasonId}-hint`}>{request.reason.hint}</p>}
                <textarea id={reasonId} className="textarea" required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} aria-describedby={request.reason.hint ? `${reasonId}-hint` : undefined} autoFocus />
              </div>
            )}
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={close}>{t.common.cancel}</button>
            <button type="submit" className={`btn ${request.tone === 'danger' ? 'btn-danger' : ''}`} disabled={!!request.reason && !reason.trim()}>{request.confirmLabel}</button>
          </div>
        </form>
      )}
    </dialog>
  );
}
