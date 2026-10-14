'use client';

import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { authApi } from '@/lib/cases/api';
import { isStaffRole } from '@/lib/cases/model';
import { Field } from '@/components/ui/Field';
import { ErrorAlert } from '@/components/cases/errors';
import { Spinner } from '@/components/cases/CaseParts';

/** Sign-in against the existing /api/auth/login endpoint. A full navigation follows so the server sees the new session. */
export function LoginForm({ next }: { next: string | null }) {
  const { t, href } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      const user = await authApi.login(email, password);
      window.location.assign(next || (isStaffRole(user.role) ? href('/workspace') : href('/applications')));
    } catch (failure) { setError(failure); setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="login-form" noValidate={false}>
      {error ? <ErrorAlert error={error} /> : null}
      <Field id="login-email" label={t.auth.email} required requiredLabel={t.common.required}>
        <input className="input input-ltr" type="email" autoComplete="username" inputMode="email" value={email} onChange={event => setEmail(event.target.value)} />
      </Field>
      <div className="field">
        <label className="field-label" htmlFor="login-password">{t.auth.password}<span className="field-required" aria-hidden="true">*</span><span className="sr-only">({t.common.required})</span></label>
        <span className="input-group">
          <input id="login-password" className="input input-ltr" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} style={{ paddingInlineEnd: '3.5rem' }} />
          <button type="button" className="btn btn-ghost btn-icon btn-sm input-action" onClick={() => setShow(value => !value)} aria-label={show ? t.auth.hidePassword : t.auth.showPassword} aria-pressed={show}>
            {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </span>
      </div>
      <button className="btn btn-lg btn-block" disabled={busy}>{busy ? <Spinner /> : <LogIn size={18} aria-hidden="true" className="flip-rtl" />}{busy ? t.auth.submitting : t.auth.submit}</button>
    </form>
  );
}
