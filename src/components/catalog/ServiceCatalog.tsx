'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Search, SearchX } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { categories, searchServices, services, type CategoryId } from '@/lib/service-catalog';
import { EmptyState } from '@/components/ui/primitives';
import { ServiceCard, serviceIcons } from '@/components/home/ServiceCard';

/** Searchable, filterable services directory. Filters are kept in the URL so results can be shared. */
export function ServiceCatalog({ initialQuery, initialCategory }: { initialQuery: string; initialCategory: CategoryId | null }) {
  const i18n = useI18n();
  const { t, f, number } = i18n;
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<CategoryId | null>(initialCategory);

  const sync = (nextQuery: string, nextCategory: CategoryId | null) => {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    if (nextCategory) params.set('category', nextCategory);
    router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
  };

  const results = useMemo(
    () => searchServices(query, service => t.services[service.slug]).filter(service => !category || service.category === category),
    [query, category, t],
  );

  return (
    <div className="catalog">
      <div className="catalog-controls card">
        <div className="input-group">
          <Search size={20} className="input-icon" aria-hidden="true" />
          <input className="input catalog-search" type="search" dir="auto" value={query} placeholder={t.catalog.searchPlaceholder} aria-label={t.catalog.searchPlaceholder}
            onChange={event => { setQuery(event.target.value); sync(event.target.value, category); }} />
        </div>
        <div className="chip-row" role="group" aria-label={t.catalog.allCategories}>
          <button type="button" className="chip" aria-pressed={!category} onClick={() => { setCategory(null); sync(query, null); }}>
            {t.catalog.allCategories}<span className="chip-count">{number(services.length)}</span>
          </button>
          {categories.map(item => {
            const Icon = serviceIcons[item.icon];
            return (
              <button key={item.id} type="button" className="chip" aria-pressed={category === item.id} onClick={() => { setCategory(item.id); sync(query, item.id); }}>
                <Icon size={16} aria-hidden="true" />{t.categories[item.id].name}<span className="chip-count">{number(services.filter(service => service.category === item.id).length)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="catalog-count" role="status" aria-live="polite">{f(t.catalog.showing, { count: number(results.length), total: number(services.length) })}</p>

      {results.length ? (
        <ul className="service-grid">
          {results.map(service => <li key={service.slug}><ServiceCard service={service} i18n={i18n} headingLevel="h2" /></li>)}
        </ul>
      ) : (
        <div className="card">
          <EmptyState icon={SearchX} title={t.catalog.noResults} action={<button type="button" className="btn btn-secondary" onClick={() => { setQuery(''); setCategory(null); sync('', null); }}>{t.catalog.clearFilters}</button>} />
        </div>
      )}
      <p className="more-services-inline subtle">{t.home.moreServices}</p>
    </div>
  );
}
