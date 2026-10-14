'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowRight, FileText, Search } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { normalizeSearch } from '@/i18n/format';
import { casesApi } from '@/lib/cases/api';
import type { CaseSummary } from '@/lib/cases/model';
import { searchServices, services } from '@/lib/service-catalog';
import { serviceIcons } from './ServiceCard';

type Option = { id: string; kind: 'service' | 'application' | 'all'; title: string; subtitle?: string; href: string; icon?: keyof typeof serviceIcons };

/**
 * Search-first service discovery (combobox pattern). Matches services in both languages and, for
 * signed-in users, their own applications by number or vessel name.
 */
export function ServiceSearch({ signedIn, staff, variant = 'hero', autoFocus }: { signedIn: boolean; staff?: boolean; variant?: 'hero' | 'inline'; autoFocus?: boolean }) {
  const { t, f, href, label } = useI18n();
  const router = useRouter();
  const inputId = useId();
  const listId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [apps, setApps] = useState<CaseSummary[] | null>(null);

  const loadApps = () => { if (signedIn && !apps) casesApi.list({ limit: 100 }).then(setApps).catch(() => setApps([])); };

  const options = useMemo<Option[]>(() => {
    const q = query.trim();
    const found = searchServices(q, service => t.services[service.slug]).map<Option>(service => ({
      id: `svc-${service.slug}`, kind: 'service', title: t.services[service.slug].name, subtitle: t.categories[service.category].name, href: href(service.path), icon: service.icon,
    }));
    const n = normalizeSearch(q);
    const matches = n.length >= 2 && apps ? apps.filter(c => normalizeSearch(`${c.application_number} ${c.vessel_name}`).includes(n)).slice(0, 4).map<Option>(c => ({
      id: `app-${c.id}`, kind: 'application', title: c.vessel_name, subtitle: `${c.application_number} · ${label(t.statuses, c.status)}`, href: href(staff ? `/workspace/applications/${c.id}` : `/applications/${c.id}`),
    })) : [];
    const all: Option[] = q ? [{ id: 'all', kind: 'all', title: f(t.search.seeAll, { query: q }), href: `${href('/services')}?q=${encodeURIComponent(q)}` }] : [];
    return [...found, ...matches, ...all];
  }, [query, apps, t, f, href, label, staff]);

  useEffect(() => { setActive(-1); }, [query]);
  useEffect(() => {
    const onClick = (event: MouseEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (option?: Option) => {
    setOpen(false);
    if (option) router.push(option.href);
    else router.push(query.trim() ? `${href('/services')}?q=${encodeURIComponent(query.trim())}` : href('/services'));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => Math.min(index + 1, options.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, -1)); }
    else if (event.key === 'Escape') { if (open) { event.preventDefault(); setOpen(false); setActive(-1); } }
    else if (event.key === 'Enter') { event.preventDefault(); go(open && active >= 0 ? options[active] : undefined); }
  };

  const serviceOptions = options.filter(option => option.kind === 'service');
  const appOptions = options.filter(option => option.kind === 'application');
  const allOption = options.find(option => option.kind === 'all');
  const indexOf = (option: Option) => options.indexOf(option);
  const renderOption = (option: Option) => {
    const index = indexOf(option);
    const Icon = option.icon ? serviceIcons[option.icon] : option.kind === 'application' ? FileText : Search;
    return (
      <li key={option.id} id={`${listId}-${index}`} role="option" aria-selected={active === index} className={`search-option ${active === index ? 'is-active' : ''} ${option.kind === 'all' ? 'is-all' : ''}`}
        onMouseDown={event => event.preventDefault()} onClick={() => go(option)} onMouseEnter={() => setActive(index)}>
        <span className="search-option-icon"><Icon size={18} aria-hidden="true" /></span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span className="search-option-title"><bdi>{option.title}</bdi></span>
          {option.subtitle && <span className="search-option-sub"><bdi>{option.subtitle}</bdi></span>}
        </span>
        <ArrowRight size={16} aria-hidden="true" className="flip-rtl search-option-arrow" />
      </li>
    );
  };

  return (
    <div className={`service-search service-search-${variant}`} ref={wrapper}>
      <form role="search" onSubmit={event => { event.preventDefault(); go(open && active >= 0 ? options[active] : undefined); }}>
        <label htmlFor={inputId} className="sr-only">{t.search.label}</label>
        <div className="search-field">
          <Search size={22} aria-hidden="true" className="search-field-icon" />
          <input
            id={inputId} className="search-input" type="text" dir="auto" autoComplete="off" spellCheck={false} placeholder={t.search.placeholder} value={query} autoFocus={autoFocus}
            role="combobox" aria-expanded={open && options.length > 0} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
            aria-describedby={`${listId}-hint`}
            onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => { setOpen(true); loadApps(); }} onKeyDown={onKeyDown}
          />
          <button type="submit" className="btn btn-accent search-submit"><Search size={18} aria-hidden="true" /><span className="search-submit-label">{t.search.submit}</span></button>
        </div>
        <p id={`${listId}-hint`} className="sr-only">{t.search.hint}</p>
      </form>
      <p className="sr-only" role="status" aria-live="polite">{open && query ? f(t.search.resultsAnnouncement, { count: options.length }) : ''}</p>
      {open && (
        <ul id={listId} role="listbox" aria-label={t.search.label} className="search-panel">
          {serviceOptions.length > 0 && <li role="presentation" className="search-group">{t.search.servicesGroup}</li>}
          {serviceOptions.map(renderOption)}
          {serviceOptions.length === 0 && query.trim() && <li role="presentation" className="search-empty">{t.search.noResults}</li>}
          {appOptions.length > 0 && <li role="presentation" className="search-group">{t.search.applicationsGroup}</li>}
          {appOptions.map(renderOption)}
          {allOption && renderOption(allOption)}
        </ul>
      )}
    </div>
  );
}

export const allServiceCount = services.length;
