import { getI18n } from '@/i18n';
import { getSessionUser } from '@/lib/session';
import { isStaffRole } from '@/lib/cases/model';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { LiveUpdatesProvider } from '@/components/live/LiveUpdatesProvider';

/** Staff shell. Each page performs its own guard (with an exact return path); this only decides whether to draw the shell. */
export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  await getI18n(params);
  const user = await getSessionUser();
  if (!user || !isStaffRole(user.role)) return <>{children}</>;
  return <LiveUpdatesProvider userId={user.id}><WorkspaceShell user={user}>{children}</WorkspaceShell></LiveUpdatesProvider>;
}
