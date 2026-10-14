import Link from 'next/link';
import type { I18n } from '@/i18n/runtime';
import { BrandMark } from './BrandMark';

export function GovernmentFooter({ i18n }: { i18n: I18n }) {
  const { t, href } = i18n;
  const links = [
    { label: t.nav.services, path: '/services' },
    { label: t.services['small-vessel-registration'].name, path: '/services/small-vessel-registration' },
    { label: t.nav.myApplications, path: '/applications' },
    { label: t.footer.verify, path: '/verify' },
    { label: t.nav.help, path: '/help' },
  ];
  return (
    <footer className="gov-footer on-dark">
      <svg className="footer-wave" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 40V18c120-14 240-14 360 0s240 14 360 0 240-14 360 0 240 14 360 0v22z" fill="currentColor" />
      </svg>
      <div className="container footer-grid">
        <section className="footer-brand" aria-labelledby="footer-about">
          <div className="footer-brand-row">
            <BrandMark size={48} />
            <div>
              <p className="footer-state">{t.brand.state}</p>
              <p className="footer-platform">{t.brand.platform}</p>
            </div>
          </div>
          <h2 id="footer-about" className="sr-only">{t.footer.aboutTitle}</h2>
          <p className="footer-text">{t.footer.aboutText}</p>
        </section>
        <nav aria-labelledby="footer-links">
          <h2 id="footer-links" className="footer-heading">{t.footer.linksTitle}</h2>
          <ul className="footer-list">
            {links.map(link => <li key={link.path}><Link href={href(link.path)}>{link.label}</Link></li>)}
          </ul>
        </nav>
        <section aria-labelledby="footer-authorities">
          <h2 id="footer-authorities" className="footer-heading">{t.authorities.title}</h2>
          <ul className="footer-list footer-authorities">
            <li><strong>{t.authorities.moi}</strong><span>{t.authorities.coastGuard}</span></li>
            <li><strong>{t.authorities.moc}</strong><span>{t.authorities.maritimeTransport}</span></li>
          </ul>
        </section>
      </div>
      <div className="container footer-bottom">
        <p>{t.notice.pilot}</p>
        <p>{t.footer.placeholderMark}</p>
      </div>
    </footer>
  );
}
