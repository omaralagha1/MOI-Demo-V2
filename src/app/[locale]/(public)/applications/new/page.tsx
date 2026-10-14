import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { requireApplicant } from '@/lib/session';
import { CREATOR_ROLES } from '@/lib/cases/model';
import { Breadcrumbs, PageHeader } from '@/components/ui/primitives';
import { NewApplicationWizard } from '@/components/applications/NewApplicationWizard';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).wizard.title } : {};
}

export default async function NewApplicationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t, href, locale } = await getI18n(params);
  const user = await requireApplicant(locale, '/applications/new', '/workspace/new');
  if (!CREATOR_ROLES.has(user.role)) redirect(href('/applications'));
  return (
    <>
      <PageHeader
        breadcrumbs={<Breadcrumbs label={t.a11y.breadcrumb} items={[{ label: t.nav.home, href: href('/') }, { label: t.nav.myApplications, href: href('/applications') }, { label: t.wizard.title }]} />}
        eyebrow={t.services['small-vessel-registration'].name}
        title={t.wizard.title}
        subtitle={t.wizard.subtitle}
      />
      <div className="container container-narrow section-tight">
        <NewApplicationWizard user={user} />
      </div>
    </>
  );
}
