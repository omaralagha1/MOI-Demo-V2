import type { Metadata } from 'next';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { requireApplicant } from '@/lib/session';
import { ApplicantCaseView } from '@/components/applications/ApplicantCaseView';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).caseView.summary } : {};
}

export default async function ApplicationPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale } = await getI18n(params);
  const { id } = await params;
  const user = await requireApplicant(locale, `/applications/${id}`, `/workspace/applications/${id}`);
  return <ApplicantCaseView id={id} user={user} />;
}
