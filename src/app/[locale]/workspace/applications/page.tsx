import type { Metadata } from 'next';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { requireStaff } from '@/lib/session';
import { WorkspaceApplications } from '@/components/workspace/WorkspaceApplications';
import { isWorkspaceView } from '@/components/workspace/workspace-model';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).workspace.navApplications } : {};
}

export default async function WorkspaceApplicationsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ view?: string; stage?: string }> }) {
  const { locale } = await getI18n(params);
  const { view, stage } = await searchParams;
  const query = new URLSearchParams(Object.entries({ view, stage }).filter(([, value]) => typeof value === 'string') as [string, string][]);
  await requireStaff(locale, `/workspace/applications${query.size ? `?${query}` : ''}`);
  const stageNumber = typeof stage === 'string' && /^[0-5]$/.test(stage) ? Number(stage) : null;
  const selected = isWorkspaceView(view) ? view : 'all';
  return <WorkspaceApplications key={`${selected}-${stageNumber}`} view={selected} initialStage={stageNumber} />;
}
