import { redirect } from 'next/navigation';
import { currentActor } from './auth';
import { db } from './db';
import { isStaffRole } from './cases/model';

export type SessionUser = { id: string; role: string; displayName: string };

/** The signed-in user for Server Components, or null. Uses the same session checks as /api/auth/me. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const actor = await currentActor();
    const user = await db.user.findUnique({ where: { id: actor.id }, select: { id: true, role: true, displayName: true, active: true } });
    if (!user?.active) return null;
    return { id: user.id, role: user.role, displayName: user.displayName };
  } catch {
    return null;
  }
}

/** Page guard: send anonymous visitors to sign in, then back to `returnTo`. */
export async function requireUser(locale: string, returnTo: string) {
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Interface routing only; the API still enforces every permission server-side. */
export const homeFor = (locale: string, user: SessionUser) => (isStaffRole(user.role) ? `/${locale}/workspace` : `/${locale}/applications`);

/** Staff workspace pages. Applicants are sent to their own dashboard. */
export async function requireStaff(locale: string, path: string) {
  const user = await requireUser(locale, `/${locale}${path}`);
  if (!isStaffRole(user.role)) redirect(`/${locale}/applications`);
  return user;
}

/** Applicant pages. Staff are sent to the equivalent workspace page. */
export async function requireApplicant(locale: string, path: string, staffPath = '/workspace') {
  const user = await requireUser(locale, `/${locale}${path}`);
  if (isStaffRole(user.role)) redirect(`/${locale}${staffPath}`);
  return user;
}

/** Only allow same-site relative return paths after sign-in (no open redirects). */
export function safeReturnPath(locale: string, next: string | undefined | null) {
  if (!next || !next.startsWith(`/${locale}`) || next.startsWith('//') || next.includes('\\')) return null;
  return next;
}
