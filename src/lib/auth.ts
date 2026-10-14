import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { fail } from './errors';
import { db } from './db';

export type Actor = { id: string; role: string };
const secret = () => {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) fail(500, 'Session secret is not configured');
  return new TextEncoder().encode(value);
};
export async function sessionToken(actor: Actor) {
  return new SignJWT({ role: actor.role }).setProtectedHeader({ alg: 'HS256' }).setSubject(actor.id).setIssuedAt().setExpirationTime('8h').sign(secret());
}
export async function currentActor(): Promise<Actor> {
  const token = (await cookies()).get('maritime_session')?.value;
  if (!token) fail(401, 'Sign in required');
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.role !== 'string') fail(401, 'Invalid session');
    const user = await db.user.findUnique({where:{id:payload.sub},select:{id:true,role:true,active:true}});
    if(!user?.active || user.role!==payload.role) fail(401,'Invalid session');
    return { id: user.id, role: user.role };
  } catch { fail(401, 'Invalid session'); }
}
export function requireRole(actor: Actor, ...roles: string[]) {
  if (!roles.includes(actor.role)) fail(403, 'Role not permitted');
}
