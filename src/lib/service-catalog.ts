import { normalizeSearch } from '@/i18n/format';

/**
 * Registry of services that exist on the platform. Add an entry only when the service is implemented
 * and approved; names and descriptions live in the i18n dictionaries under `services.<slug>`.
 */
export type CategoryId = 'vessel-registration' | 'applications' | 'certificates';
export type ServiceIcon = 'ship' | 'list-checks' | 'badge-check';
export type ServiceSlug = 'small-vessel-registration' | 'application-tracking' | 'certificate-verification';

export type ServiceEntry = {
  slug: ServiceSlug;
  code?: string;
  category: CategoryId;
  icon: ServiceIcon;
  /** Transactional services have a detail page with requirements; tools link straight to the function. */
  kind: 'transaction' | 'tool';
  requiresSignIn: boolean;
  /** Path (without locale) the card opens. */
  path: string;
  /** Path that starts the service. */
  startPath: string;
  featured?: boolean;
  /** Bilingual search terms, so Arabic queries work in the English interface and vice versa. */
  terms: string[];
};

export const categories: { id: CategoryId; icon: ServiceIcon }[] = [
  { id: 'vessel-registration', icon: 'ship' },
  { id: 'applications', icon: 'list-checks' },
  { id: 'certificates', icon: 'badge-check' },
];

export const services: ServiceEntry[] = [
  {
    slug: 'small-vessel-registration',
    code: 'A.4.1/1',
    category: 'vessel-registration',
    icon: 'ship',
    kind: 'transaction',
    requiresSignIn: true,
    path: '/services/small-vessel-registration',
    startPath: '/applications/new',
    featured: true,
    terms: ['small vessel registration', 'register vessel', 'boat', 'ship', 'registry', 'certificate', 'tonnage', 'A.4.1/1', 'A411',
      'تسجيل سفينة صغيرة', 'تسجيل السفن', 'سفينة', 'قارب', 'طراد', 'قيد', 'شهادة تسجيل', 'حمولة'],
  },
  {
    slug: 'application-tracking',
    category: 'applications',
    icon: 'list-checks',
    kind: 'tool',
    requiresSignIn: true,
    path: '/applications',
    startPath: '/applications',
    terms: ['track application', 'application status', 'my applications', 'requests', 'متابعة الطلب', 'حالة الطلب', 'طلباتي', 'معاملة'],
  },
  {
    slug: 'certificate-verification',
    category: 'certificates',
    icon: 'badge-check',
    kind: 'tool',
    requiresSignIn: false,
    path: '/verify',
    startPath: '/verify',
    terms: ['verify certificate', 'qr', 'certificate check', 'validation', 'التحقق من الشهادة', 'رمز QR', 'تحقق', 'شهادة'],
  },
];

export const findService = (slug: string) => services.find(service => service.slug === slug);

/** Rank services against a query using localized names/summaries plus bilingual terms. */
export function searchServices(query: string, text: (service: ServiceEntry) => { name: string; summary: string }) {
  const q = normalizeSearch(query);
  if (!q) return services;
  const tokens = q.split(/\s+/).filter(Boolean);
  return services
    .map(service => {
      const { name, summary } = text(service);
      const fields = { name: normalizeSearch(name), summary: normalizeSearch(summary), terms: normalizeSearch(`${service.terms.join(' ')} ${service.code || ''}`) };
      let score = 0;
      for (const token of tokens) {
        if (fields.name.includes(token)) score += 6;
        else if (fields.terms.includes(token)) score += 4;
        else if (fields.summary.includes(token)) score += 2;
        else return { service, score: 0 };
      }
      if (fields.name.startsWith(q)) score += 4;
      return { service, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(result => result.service);
}
