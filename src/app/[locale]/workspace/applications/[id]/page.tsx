import type { Metadata } from 'next';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { requireStaff } from '@/lib/session';
import { StaffCaseView } from '@/components/workspace/StaffCaseView';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).caseView.summary } : {};
}

export default async function WorkspaceCasePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale } = await getI18n(params);
  const { id } = await params;
  const user = await requireStaff(locale, `/workspace/applications/${id}`);
  return <StaffCaseView key={id} id={id} user={user} />;
}
