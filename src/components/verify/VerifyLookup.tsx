'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { Field } from '@/components/ui/Field';

const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Accepts a verification ID or a full /verify/<id> link (as encoded in the certificate QR code). */
export function VerifyLookup() {
  const { t, href } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const id = value.trim().match(uuid)?.[0];
    if (!id) { setError(t.verify.lookupInvalid); return; }
    router.push(href(`/verify/${id.toLowerCase()}`));
  };
  return (
    <form onSubmit={submit} className="verify-form" noValidate>
      <Field id="verify-id" label={t.verify.lookupLabel} hint={t.verify.lookupHint} error={error} required requiredLabel={t.common.required}>
        <input className="input input-ltr" value={value} autoComplete="off" spellCheck={false} onChange={event => { setValue(event.target.value); setError(null); }} />
      </Field>
      <button className="btn btn-lg btn-block"><ShieldCheck size={18} aria-hidden="true" />{t.verify.lookupSubmit}</button>
    </form>
  );
}
