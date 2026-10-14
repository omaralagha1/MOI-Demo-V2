import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { requireStaff } from '@/lib/session';
import { CREATOR_ROLES } from '@/lib/cases/model';
import { NewApplicationWizard } from '@/components/applications/NewApplicationWizard';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).workspace.newIntakeTitle } : {};
}

/** Back-office intake (registration officers create cases on behalf of applicants, as the API allows). */
export default async function NewIntakePage({ params }: { params: Promise<{ locale: string }> }) {
  const { t, locale, href } = await getI18n(params);
  const user = await requireStaff(locale, '/workspace/new');
  if (!CREATOR_ROLES.has(user.role)) redirect(href('/workspace'));
  return (
    <div className="ws-page ws-narrow">
      <div className="ws-page-head">
        <div>
          <p className="page-eyebrow">{t.services['small-vessel-registration'].name} · A.4.1/1</p>
          <h1 className="ws-page-title">{t.workspace.newIntakeTitle}</h1>
          <p className="muted">{t.wizard.officerSubtitle}</p>
        </div>
      </div>
      <NewApplicationWizard user={user} staff />
    </div>
  );
}
