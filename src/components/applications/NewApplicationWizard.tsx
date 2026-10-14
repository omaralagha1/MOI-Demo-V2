'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Building2, FileCheck2, Landmark, Pencil, Ship, User } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { casesApi } from '@/lib/cases/api';
import { TONNAGE_LIMIT, type ViewUser } from '@/lib/cases/model';
import { requiredDocuments } from '@/server/workflow';
import { Field } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { ErrorAlert } from '@/components/cases/errors';
import { Spinner } from '@/components/cases/CaseParts';
import { WizardSteps } from './WizardSteps';

type Draft = { intake_channel: 'PORTAL' | 'EXTERNAL_CENTER'; party_category: 'PERSON' | 'COMPANY'; representative_id: string; vessel_name: string; tonnage: string; foreign_flag: boolean };
type Errors = Partial<Record<keyof Draft, string>>;

export function NewApplicationWizard({ user, staff }: { user: ViewUser; staff?: boolean }) {
  const { t, f, label, href, number } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const summary = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({ intake_channel: 'PORTAL', party_category: 'PERSON', representative_id: '', vessel_name: '', tonnage: '', foreign_flag: false });
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [creating, setCreating] = useState(false);
  const w = t.wizard;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => { setDraft(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: undefined })); };

  /** Mirrors createSchema in src/server/cases.ts; the API validates again. */
  const validate = (target: number): Errors => {
    const found: Errors = {};
    if (target === 0) {
      if (user.role === 'AUTHORIZED_REPRESENTATIVE' && !draft.representative_id.trim()) found.representative_id = w.representativeRequired;
      if (draft.representative_id.length > 100) found.representative_id = f(w.errorMaxLength, { max: 100 });
    }
    if (target === 1) {
      if (!draft.vessel_name.trim()) found.vessel_name = f(w.errorRequired, { field: w.vesselName });
      else if (draft.vessel_name.trim().length > 200) found.vessel_name = f(w.errorMaxLength, { max: 200 });
      const value = Number(draft.tonnage);
      if (!draft.tonnage.trim()) found.tonnage = f(w.errorRequired, { field: w.tonnage });
      else if (!Number.isFinite(value) || value <= 0) found.tonnage = w.errorTonnagePositive;
      else if (value >= TONNAGE_LIMIT) found.tonnage = w.errorTonnageMax;
      else if (Math.round(value * 100) !== value * 100) found.tonnage = w.errorTonnageDecimals;
    }
    return found;
  };

  const next = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(step);
    setErrors(found);
    if (Object.keys(found).length) { requestAnimationFrame(() => summary.current?.focus()); return; }
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  };

  const create = async () => {
    setCreating(true); setSubmitError(null);
    try {
      const created = await casesApi.create({
        vessel_name: draft.vessel_name.trim(), tonnage: draft.tonnage, party_category: draft.party_category, foreign_flag: draft.foreign_flag,
        representative_id: draft.representative_id.trim() || null, intake_channel: draft.intake_channel,
      });
      toast(w.created);
      router.push(href(staff ? `/workspace/applications/${created.id}` : `/applications/${created.id}`));
    } catch (error) { setSubmitError(error); setCreating(false); }
  };

  const documents = requiredDocuments({
    ownershipKind: 'OWNERSHIP_EVIDENCE', partyCategory: draft.party_category, representativeId: draft.representative_id.trim() || null,
    foreignFlag: draft.foreign_flag, intakeChannel: draft.intake_channel,
  } as Parameters<typeof requiredDocuments>[0]);

  const errorList = Object.entries(errors).filter(([, message]) => message) as [keyof Draft, string][];

  return (
    <div className="wizard">
      <div className="card card-pad wizard-card"><WizardSteps current={step} /></div>
      <form className="card card-pad wizard-body" onSubmit={step < 2 ? next : event => { event.preventDefault(); create(); }} noValidate>
        {errorList.length > 0 && (
          <div ref={summary} tabIndex={-1} className="error-summary" role="alert">
            <Alert tone="danger" title={w.errorSummary}>
              <ul className="inline-list">{errorList.map(([key, message]) => <li key={key}><a href={`#wizard-${key}`}>{message}</a></li>)}</ul>
            </Alert>
          </div>
        )}

        {step === 0 && (
          <>
            <fieldset className="form-section">
              <legend className="form-section-title">{w.routeLegend}</legend>
              <div className="choice-grid">
                {(['PORTAL', 'EXTERNAL_CENTER'] as const).map(value => (
                  <label key={value} className="choice">
                    <input type="radio" name="intake_channel" value={value} checked={draft.intake_channel === value} onChange={() => set('intake_channel', value)} id={value === 'PORTAL' ? 'wizard-intake_channel' : undefined} />
                    <span>{value === 'PORTAL' ? <Landmark size={20} aria-hidden="true" className="choice-icon" /> : <Ship size={20} aria-hidden="true" className="choice-icon" />}
                      <span className="choice-title">{value === 'PORTAL' ? w.routePortal : w.routeCenter}</span>
                      <span className="choice-body">{value === 'PORTAL' ? w.routePortalHint : w.routeCenterHint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="form-section">
              <legend className="form-section-title">{w.partyLegend}</legend>
              <div className="choice-grid">
                {(['PERSON', 'COMPANY'] as const).map(value => (
                  <label key={value} className="choice">
                    <input type="radio" name="party_category" value={value} checked={draft.party_category === value} onChange={() => set('party_category', value)} />
                    <span>{value === 'PERSON' ? <User size={20} aria-hidden="true" className="choice-icon" /> : <Building2 size={20} aria-hidden="true" className="choice-icon" />}
                      <span className="choice-title">{value === 'PERSON' ? w.partyPerson : w.partyCompany}</span>
                      <span className="choice-body">{value === 'PERSON' ? w.partyPersonHint : w.partyCompanyHint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="form-section">
              <Field id="wizard-representative_id" label={w.representative} hint={w.representativeHint} error={errors.representative_id} required={user.role === 'AUTHORIZED_REPRESENTATIVE'} optionalLabel={t.common.optional} requiredLabel={t.common.required}>
                <input className="input input-ltr" value={draft.representative_id} maxLength={100} autoComplete="off" onChange={event => set('representative_id', event.target.value)} />
              </Field>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="form-section">
            <div className="form-grid">
              <Field id="wizard-vessel_name" label={w.vesselName} hint={w.vesselNameHint} error={errors.vessel_name} required requiredLabel={t.common.required}>
                <input className="input" value={draft.vessel_name} maxLength={200} autoComplete="off" onChange={event => set('vessel_name', event.target.value)} />
              </Field>
              <Field id="wizard-tonnage" label={w.tonnage} hint={w.tonnageHint} error={errors.tonnage} required requiredLabel={t.common.required}>
                <input className="input input-ltr" type="number" inputMode="decimal" min="0.01" max="149.99" step="0.01" value={draft.tonnage} onChange={event => set('tonnage', event.target.value)} />
              </Field>
            </div>
            <label className="check choice" style={{ marginTop: 'var(--space-6)' }}>
              <input type="checkbox" checked={draft.foreign_flag} onChange={event => set('foreign_flag', event.target.checked)} id="wizard-foreign_flag" />
              <span><span className="choice-title">{w.foreignFlag}</span><span className="choice-body">{w.foreignFlagHint}</span></span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="review-grid">
            <section className="form-section" aria-labelledby="review-title">
              <div className="form-section-head" style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                <h2 className="form-section-title" id="review-title">{w.reviewTitle}</h2>
              </div>
              <dl className="dl dl-inline">
                <div><dt>{w.routeLegend}</dt><dd>{label(t.channels, draft.intake_channel)} <button type="button" className="link-button edit-link" onClick={() => setStep(0)}><Pencil size={14} aria-hidden="true" />{t.common.edit}</button></dd></div>
                <div><dt>{w.partyLegend}</dt><dd>{label(t.partyCategories, draft.party_category)}</dd></div>
                <div><dt>{w.representative}</dt><dd>{draft.representative_id.trim() ? <bdi dir="ltr">{draft.representative_id.trim()}</bdi> : t.common.none}</dd></div>
                <div><dt>{w.vesselName}</dt><dd><bdi>{draft.vessel_name.trim()}</bdi> <button type="button" className="link-button edit-link" onClick={() => setStep(1)}><Pencil size={14} aria-hidden="true" />{t.common.edit}</button></dd></div>
                <div><dt>{w.tonnage}</dt><dd><span className="num">{number(draft.tonnage)}</span> <span className="subtle" style={{ fontWeight: 400 }}>({t.caseView.tonnageUnit})</span></dd></div>
                <div><dt>{t.caseView.foreignFlag}</dt><dd>{draft.foreign_flag ? t.common.yes : t.common.no}</dd></div>
              </dl>
            </section>
            <section className="form-section review-docs" aria-labelledby="review-docs-title">
              <h2 className="form-section-title" id="review-docs-title">{w.reviewDocuments}</h2>
              <p className="form-section-desc">{w.reviewDocumentsHint}</p>
              <ul className="check-list">{documents.map(type => <li key={type}><FileCheck2 size={18} aria-hidden="true" />{label(t.documentTypes, type)}</li>)}</ul>
            </section>
            <Alert tone="info">{w.draftNote}</Alert>
            {submitError ? <ErrorAlert error={submitError} /> : null}
          </div>
        )}

        <div className="form-actions wizard-actions">
          {step > 0 ? <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)} disabled={creating}><ArrowLeft size={18} aria-hidden="true" className="flip-rtl" />{t.common.back}</button> : <span />}
          {step < 2
            ? <button type="submit" className="btn btn-lg">{t.common.next}<ArrowRight size={18} aria-hidden="true" className="flip-rtl" /></button>
            : <button type="submit" className="btn btn-lg btn-accent" disabled={creating}>{creating ? <Spinner /> : <FileCheck2 size={18} aria-hidden="true" />}{creating ? w.creating : w.create}</button>}
        </div>
      </form>
    </div>
  );
}
