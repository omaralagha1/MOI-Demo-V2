import { getI18n } from '@/i18n';
import { getSessionUser } from '@/lib/session';
import { GovernmentHeader } from '@/components/layout/GovernmentHeader';
import { GovernmentFooter } from '@/components/layout/GovernmentFooter';
import { LiveUpdatesProvider } from '@/components/live/LiveUpdatesProvider';

/** Citizen-facing shell: government header, main content and footer. */
export default async function PublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const i18n = await getI18n(params);
  const user = await getSessionUser();
  const site = (
    <div className="site">
      <a className="skip-link" href="#main">{i18n.t.a11y.skipToContent}</a>
      <GovernmentHeader user={user ? { displayName: user.displayName, role: user.role } : null} />
      <main id="main" tabIndex={-1} className="site-main">{children}</main>
      <GovernmentFooter i18n={i18n} />
    </div>
  );
  // Signed-in users get live page updates and the notification bell.
  return user ? <LiveUpdatesProvider userId={user.id}>{site}</LiveUpdatesProvider> : site;
}
