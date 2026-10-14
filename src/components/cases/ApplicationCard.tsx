'use client';

import Link from 'next/link';
import { ArrowRight, Ship } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { nextStepKey, responsibleRole, stageIndex, type CaseSummary, type ViewUser } from '@/lib/cases/model';
import { Ltr } from '@/components/ui/primitives';
import { CaseStatusBadge } from './CaseParts';

/** Application summary card with status, compact stage progress and the next step. */
export function ApplicationCard({ c, user, href }: { c: CaseSummary; user: ViewUser; href: string }) {
  const { t, f, label, date, number } = useI18n();
  const stage = stageIndex(c.status);
  const done = c.status === 'COMPLETED';
  const role = responsibleRole(c);
  const mine = role === 'APPLICANT' && [c.owner_id, c.representative_id].includes(user.id);
  const progress = done ? 6 : stage;
  return (
    <Link href={href} className={`card card-interactive app-card ${mine && !done ? 'needs-action' : ''}`}>
      <div className="app-card-top">
        <span className="icon-tile"><Ship size={20} aria-hidden="true" /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="app-card-title"><bdi>{c.vessel_name}</bdi></p>
          <p className="app-card-meta"><Ltr mono>{c.application_number}</Ltr> · <span className="num">{number(c.tonnage)}</span></p>
        </div>
        <CaseStatusBadge status={c.status} />
      </div>
      <div className="mini-progress" aria-hidden="true">
        {t.caseView.stages.map((stageName, index) => <span key={stageName} className={index < progress ? 'is-done' : index === progress ? 'is-current' : ''} />)}
      </div>
      <p className="sr-only">{t.caseView.currentStage}: {t.caseView.stages[Math.min(stage, 5)]}</p>
      <p className="app-card-next">{mine && !done && <span className="badge tone-warning">{t.caseView.yourAction}</span>} {label(t.nextSteps, nextStepKey(c))}</p>
      <div className="app-card-foot">
        <span className="subtle">{c.updated_at ? f(t.dashboard.updated, { date: date(c.updated_at) }) : label(t.channels, c.intake_channel)}</span>
        <span className="link-button">{t.common.open}<ArrowRight size={16} aria-hidden="true" className="flip-rtl" /></span>
      </div>
    </Link>
  );
}
