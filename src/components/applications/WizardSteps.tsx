'use client';

import type { CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

/** Five-step application progress: three form steps, document upload, then submission. */
export function WizardSteps({ current }: { current: number }) {
  const { t, f, number } = useI18n();
  const steps = t.wizard.steps;
  return (
    <div className="wizard-steps">
      <p className="wizard-step-count">{f(t.wizard.stepOf, { current: number(current + 1), total: number(steps.length) })}</p>
      <ol className="stepper" style={{ '--steps': steps.length } as CSSProperties} aria-label={t.wizard.title}>
        {steps.map((step, index) => (
          <li key={step} className={`stepper-item ${index < current ? 'is-done' : ''} ${index === current ? 'is-current' : ''}`} aria-current={index === current ? 'step' : undefined}>
            <span className="stepper-dot">{index < current ? <Check size={16} aria-hidden="true" /> : index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
