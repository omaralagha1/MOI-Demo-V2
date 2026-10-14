'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { BadgeCheck, ClipboardCheck, ExternalLink, FilePlus2, FileSearch, Inbox, LayoutDashboard, ListChecks, LogOut, Menu, Ship, Stamp, X, type LucideIcon } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { CaseSummary, ViewUser } from '@/lib/cases/model';
import { useCaseList } from '@/components/cases/useCaseList';
import { BrandMark } from '@/components/layout/BrandMark';
import { AccessibilityMenu } from '@/components/layout/AccessibilityMenu';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';
import { initials, signOut } from '@/components/layout/GovernmentHeader';
import { inView, type WorkspaceView } from './workspace-model';
import { NotificationBell } from '@/components/live/NotificationBell';

type WorkspaceData = { cases: CaseSummary[] | null; error: unknown; reload: () => Promise<void>; user: ViewUser };
const WorkspaceContext = createContext<WorkspaceData | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceShell');
  return value;
}

/** Enterprise shell for staff: sidebar navigation with live queue counts, compact top bar and content area. */
export function WorkspaceShell({ user, children }: { user: ViewUser; children: ReactNode }) {
  const { t, href, label, locale, number } = useI18n();
  const pathname = usePathname() || '';
  const search = useSearchParams();
  const { cases, error, reload } = useCaseList();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname, search]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const count = (view: WorkspaceView) => (cases ? cases.filter(c => inView(view, c, user.role)).length : null);
  const listPath = href('/workspace/applications');
  const currentView = pathname === listPath ? (search.get('view') || 'all') : null;
  const items: { label: string; href: string; icon: LucideIcon; active: boolean; count?: number | null; highlight?: boolean }[] = [
    { label: t.workspace.navDashboard, href: href('/workspace'), icon: LayoutDashboard, active: pathname === href('/workspace') },
    { label: t.workspace.navQueue, href: `${listPath}?view=queue`, icon: Inbox, active: currentView === 'queue', count: count('queue'), highlight: true },
    { label: t.workspace.navApplications, href: listPath, icon: ListChecks, active: currentView === 'all' || (pathname.startsWith(`${listPath}/`)), count: count('all') },
    { label: t.workspace.navVerification, href: `${listPath}?view=verification`, icon: FileSearch, active: currentView === 'verification', count: count('verification') },
    { label: t.workspace.navInspections, href: `${listPath}?view=inspections`, icon: Ship, active: currentView === 'inspections', count: count('inspections') },
    { label: t.workspace.navApprovals, href: `${listPath}?view=approvals`, icon: Stamp, active: currentView === 'approvals', count: count('approvals') },
    { label: t.workspace.navRegistry, href: href('/workspace/registry'), icon: BadgeCheck, active: pathname.startsWith(href('/workspace/registry')) },
    ...(user.role === 'REGISTRATION_OFFICER' ? [{ label: t.workspace.navNewIntake, href: href('/workspace/new'), icon: FilePlus2, active: pathname.startsWith(href('/workspace/new')) }] : []),
  ];

  return (
    <WorkspaceContext.Provider value={{ cases, error, reload, user }}>
      <div className="ws">
        <a className="skip-link" href="#main">{t.a11y.skipToContent}</a>
        <aside className={`ws-sidebar on-dark ${open ? 'is-open' : ''}`} id="ws-sidebar" aria-label={t.workspace.sections}>
          <div className="ws-brand">
            <BrandMark size={40} />
            <span><span className="ws-brand-name">{t.brand.platform}</span><span className="ws-brand-sub">{t.workspace.title}</span></span>
            <button type="button" className="ws-close btn btn-icon btn-sm btn-outline-light" onClick={() => setOpen(false)} aria-label={t.a11y.closeMenu}><X size={18} aria-hidden="true" /></button>
          </div>
          <nav className="ws-nav">
            <ul>
              {items.map(item => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={item.active ? 'page' : undefined} className={item.highlight && item.count ? 'has-alert' : ''}>
                    <item.icon size={20} aria-hidden="true" />
                    <span className="ws-nav-label">{item.label}</span>
                    {item.count !== undefined && item.count !== null && <span className="ws-count">{number(item.count)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ws-sidebar-foot">
            <Link href={href('/')} className="ws-public-link"><ExternalLink size={16} aria-hidden="true" />{t.workspace.navPublicSite}</Link>
            <p className="ws-environment">{t.notice.pilot}</p>
          </div>
        </aside>
        {open && <div className="ws-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

        <div className="ws-main">
          <header className="ws-topbar">
            <button type="button" className="btn btn-secondary btn-icon btn-sm ws-menu" aria-expanded={open} aria-controls="ws-sidebar" aria-label={t.a11y.openMenu} onClick={() => setOpen(true)}><Menu size={20} aria-hidden="true" /></button>
            <p className="ws-topbar-title"><ClipboardCheck size={18} aria-hidden="true" />{t.workspace.subtitle}</p>
            <div className="ws-topbar-tools">
              <NotificationBell staff />
              <AccessibilityMenu variant="light" />
              <LanguageSwitch className="utility-button is-light" />
              <div className="ws-user">
                <span className="avatar" aria-hidden="true">{initials(user.displayName)}</span>
                <span className="ws-user-text"><span className="ws-user-name">{user.displayName}</span><span className="ws-user-role">{label(t.roles, user.role)}</span></span>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => signOut(locale)} aria-label={t.nav.signOut} title={t.nav.signOut}><LogOut size={18} aria-hidden="true" className="flip-rtl" /></button>
              </div>
            </div>
          </header>
          <main id="main" tabIndex={-1} className="ws-content">{children}</main>
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
