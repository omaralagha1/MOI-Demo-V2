'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutDashboard, ListChecks, LogIn, LogOut, Menu, X } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { authApi } from '@/lib/cases/api';
import { isStaffRole } from '@/lib/cases/model';
import { BrandMark } from './BrandMark';
import { AccessibilityMenu } from './AccessibilityMenu';
import { LanguageSwitch } from './LanguageSwitch';
import { NotificationBell } from '@/components/live/NotificationBell';

export type HeaderUser = { displayName: string; role: string } | null;

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

export async function signOut(locale: string) {
  try { await authApi.logout(); } finally { window.location.assign(`/${locale}`); }
}

export function GovernmentHeader({ user }: { user: HeaderUser }) {
  const { t, locale, href } = useI18n();
  const pathname = usePathname() || href('/');
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const account = useRef<HTMLDivElement>(null);
  const staff = !!user && isStaffRole(user.role);

  const items = [
    { label: t.nav.home, path: '/', match: (p: string) => p === href('/') },
    { label: t.nav.services, path: '/services', match: (p: string) => p.startsWith(href('/services')) },
    { label: t.nav.myApplications, path: staff ? '/workspace/applications' : '/applications', match: (p: string) => p.startsWith(href('/applications')) },
    ...(staff ? [{ label: t.nav.vesselRegistry, path: '/workspace/registry', match: (p: string) => p.startsWith(href('/workspace/registry')) }] : []),
    { label: t.nav.help, path: '/help', match: (p: string) => p.startsWith(href('/help')) },
  ];

  useEffect(() => { setMenuOpen(false); setAccountOpen(false); }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!accountOpen && !menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setAccountOpen(false); setMenuOpen(false); } };
    const onClick = (event: MouseEvent) => { if (accountOpen && !account.current?.contains(event.target as Node)) setAccountOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [accountOpen, menuOpen]);

  const signInHref = `${href('/login')}?next=${encodeURIComponent(pathname)}`;
  const accountHome = staff ? href('/workspace') : href('/applications');

  return (
    <>
    <div className="gov-topbar on-dark">
      <div className="container gov-topbar-inner">
        <p className="gov-state">
          <span className="flag-stripe" aria-hidden="true" />
          <span>{t.brand.state}</span>
        </p>
        <p className="pilot-note">{t.notice.pilot}</p>
        <div className="gov-utilities">
          <AccessibilityMenu />
          <LanguageSwitch />
        </div>
      </div>
    </div>
    <header className={`gov-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="gov-mainbar">
        <div className="container gov-mainbar-inner">
          <Link href={href('/')} className="brand" aria-label={t.brand.homeLabel}>
            <BrandMark size={44} />
            <span className="brand-text">
              <span className="brand-name">{t.brand.platform}</span>
              <span className="brand-tagline">{t.brand.tagline}</span>
            </span>
          </Link>

          <nav className="primary-nav" aria-label={t.a11y.mainNav}>
            <ul>
              {items.map(item => (
                <li key={item.path}>
                  <Link href={href(item.path)} aria-current={item.match(pathname) ? 'page' : undefined}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="gov-actions">
            {user && <NotificationBell staff={staff} />}
            {user ? (
              <div className="account" ref={account}>
                <button type="button" className="account-button" aria-expanded={accountOpen} aria-haspopup="true" onClick={() => setAccountOpen(value => !value)}>
                  <span className="avatar" aria-hidden="true">{initials(user.displayName)}</span>
                  <span className="account-name">{user.displayName}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
                {accountOpen && (
                  <div className="popover account-panel">
                    <p className="account-meta"><span className="subtle">{t.nav.signedInAs}</span><strong>{user.displayName}</strong><span className="badge tone-info">{t.roles[user.role as keyof typeof t.roles] ?? user.role}</span></p>
                    <Link className="menu-link" href={accountHome}>{staff ? <LayoutDashboard size={18} aria-hidden="true" /> : <ListChecks size={18} aria-hidden="true" />}{staff ? t.nav.workspace : t.nav.myApplications}</Link>
                    <button type="button" className="menu-link" onClick={() => signOut(locale)}><LogOut size={18} aria-hidden="true" className="flip-rtl" />{t.nav.signOut}</button>
                  </div>
                )}
              </div>
            ) : (
              <Link className="btn btn-sm sign-in-button" href={signInHref} aria-label={t.nav.signIn}><LogIn size={16} aria-hidden="true" className="flip-rtl" /><span>{t.nav.signIn}</span></Link>
            )}
            <button type="button" className="menu-toggle btn btn-secondary btn-icon btn-sm" aria-expanded={menuOpen} aria-controls="mobile-nav" aria-label={menuOpen ? t.a11y.closeMenu : t.a11y.openMenu} onClick={() => setMenuOpen(value => !value)}>
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      <div id="mobile-nav" className="mobile-nav" hidden={!menuOpen}>
        <nav aria-label={t.a11y.mainNav} className="container">
          <ul>
            {items.map(item => (
              <li key={item.path}><Link href={href(item.path)} aria-current={item.match(pathname) ? 'page' : undefined}>{item.label}</Link></li>
            ))}
          </ul>
          <div className="mobile-nav-footer">
            {user ? (
              <>
                <Link className="btn btn-secondary btn-block" href={accountHome}>{staff ? t.nav.workspace : t.nav.myApplications}</Link>
                <button type="button" className="btn btn-ghost btn-block" onClick={() => signOut(locale)}>{t.nav.signOut}</button>
              </>
            ) : (
              <Link className="btn btn-block" href={signInHref}>{t.nav.signIn}</Link>
            )}
            <AccessibilityMenu inline />
          </div>
        </nav>
      </div>
    </header>
    </>
  );
}
