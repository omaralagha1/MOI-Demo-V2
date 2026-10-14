import type { Metadata } from 'next';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { requireStaff } from '@/lib/session';
import { WorkspaceDashboard } from '@/components/workspace/WorkspaceDashboard';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).workspace.title } : {};
}

export default async function WorkspacePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  await requireStaff(locale, '/workspace');
  return <WorkspaceDashboard />;
}
