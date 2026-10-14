import type { Metadata } from 'next';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { categories, type CategoryId } from '@/lib/service-catalog';
import { Breadcrumbs, PageHeader } from '@/components/ui/primitives';
import { ServiceCatalog } from '@/components/catalog/ServiceCatalog';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).catalog.title } : {};
}

export default async function ServicesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; category?: string }> }) {
  const { t, href } = await getI18n(params);
  const { q, category } = await searchParams;
  const initialCategory = categories.some(item => item.id === category) ? (category as CategoryId) : null;
  return (
    <>
      <PageHeader
        breadcrumbs={<Breadcrumbs label={t.a11y.breadcrumb} items={[{ label: t.nav.home, href: href('/') }, { label: t.nav.services }]} />}
        title={t.catalog.title}
        subtitle={t.catalog.subtitle}
      />
      <div className="container section-tight">
        <ServiceCatalog initialQuery={typeof q === 'string' ? q.slice(0, 100) : ''} initialCategory={initialCategory} />
      </div>
    </>
  );
}
