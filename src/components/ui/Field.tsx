import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

type ControlProps = { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; required?: boolean };

/** Label, hint and inline error wired to the control with ids and aria attributes. */
export function Field({ id, label, hint, error, required, optionalLabel, requiredLabel, children, className = '' }: {
  id: string; label: ReactNode; hint?: ReactNode; error?: string | null; required?: boolean; optionalLabel?: string; requiredLabel?: string; children: ReactElement<ControlProps>; className?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const control = isValidElement(children) ? cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required }) : children;
  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={id}>
        {label}
        {required && <span className="field-required" aria-hidden="true">*</span>}
        {required && requiredLabel && <span className="sr-only">({requiredLabel})</span>}
        {!required && optionalLabel && <span className="field-optional">({optionalLabel})</span>}
      </label>
      {hint && <p className="field-hint" id={hintId}>{hint}</p>}
      {control}
      {error && <p className="field-error" id={errorId}><AlertCircle size={16} aria-hidden="true" />{error}</p>}
    </div>
  );
}
