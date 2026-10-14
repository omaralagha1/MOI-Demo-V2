import type { Metadata } from 'next';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { requireApplicant } from '@/lib/session';
import { ApplicantDashboard } from '@/components/applications/ApplicantDashboard';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).dashboard.title } : {};
}

export default async function ApplicationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  const user = await requireApplicant(locale, '/applications', '/workspace/applications');
  return <ApplicantDashboard user={user} />;
}
