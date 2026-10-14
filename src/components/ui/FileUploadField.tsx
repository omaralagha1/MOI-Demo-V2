'use client';

import { useId, useRef, useState, type DragEvent } from 'react';
import { AlertCircle, FileText, Loader2, UploadCloud, X } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { ACCEPT_ATTRIBUTE, ACCEPTED_UPLOADS, MAX_UPLOAD_BYTES } from '@/lib/cases/model';

const acceptedByName = /\.(pdf|jpe?g|png)$/i;

/**
 * Drag-and-drop file picker with preview. Mirrors the API's limits (PDF/JPEG/PNG, 10 MB);
 * the server still checks file signatures and size.
 */
export function FileUploadField({ label, onUpload, compact, disabled, submitLabel }: {
  label: string; onUpload: (file: File) => Promise<boolean>; compact?: boolean; disabled?: boolean; submitLabel?: string;
}) {
  const { t, fileSize } = useI18n();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const choose = (selected: File | undefined | null) => {
    setError(null); setPreview(null);
    if (!selected) { setFile(null); return; }
    if (!ACCEPTED_UPLOADS.includes(selected.type) && !acceptedByName.test(selected.name)) { setFile(null); setError(t.caseView.badType); return; }
    if (selected.size > MAX_UPLOAD_BYTES) { setFile(null); setError(t.caseView.tooLarge); return; }
    setFile(selected);
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(typeof reader.result === 'string' ? reader.result : null);
      reader.readAsDataURL(selected);
    }
  };
  const reset = () => { setFile(null); setPreview(null); setError(null); if (input.current) input.current.value = ''; };
  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try { if (await onUpload(file)) reset(); } finally { setBusy(false); }
  };
  const onDrop = (event: DragEvent) => { event.preventDefault(); setDragging(false); if (!disabled) choose(event.dataTransfer.files?.[0]); };

  return (
    <div className="upload-field">
      {!file ? (
        <div className={`dropzone ${compact ? 'dropzone-compact' : ''} ${dragging ? 'is-dragging' : ''} ${error ? 'is-invalid' : ''}`}
          onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
          <input ref={input} id={id} type="file" accept={ACCEPT_ATTRIBUTE} disabled={disabled} aria-label={`${label}: ${t.caseView.browse}`} aria-describedby={`${id}-rules${error ? ` ${id}-error` : ''}`} aria-invalid={error ? true : undefined} onChange={event => choose(event.target.files?.[0])} />
          <span className="dropzone-body">
            <UploadCloud size={compact ? 20 : 24} aria-hidden="true" />
            <span>{t.caseView.dropHere} <strong>{t.caseView.browse}</strong><span className="subtle" id={`${id}-rules`} style={{ display: 'block', fontSize: 'var(--text-xs)' }}>{t.caseView.fileRules}</span></span>
          </span>
        </div>
      ) : (
        <div className="file-preview">
          {preview ? <img className="file-thumb" src={preview} alt="" /> : <span className="file-thumb"><FileText size={20} aria-hidden="true" /></span>}
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="file-preview-name" style={{ display: 'block' }} title={file.name}>{file.name}</span>
            <span className="file-preview-meta">{fileSize(file.size)}</span>
          </span>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={reset} disabled={busy} aria-label={t.caseView.removeFile}><X size={18} aria-hidden="true" /></button>
          <button type="button" className="btn btn-sm btn-accent" onClick={upload} disabled={busy || disabled}>
            {busy ? <Loader2 className="spinner" aria-hidden="true" /> : <UploadCloud size={16} aria-hidden="true" />}
            {busy ? t.caseView.uploading : submitLabel || t.caseView.upload}
          </button>
        </div>
      )}
      {error && <p className="field-error" id={`${id}-error`} role="alert" style={{ marginTop: 'var(--space-2)' }}><AlertCircle size={16} aria-hidden="true" />{error}</p>}
    </div>
  );
}
