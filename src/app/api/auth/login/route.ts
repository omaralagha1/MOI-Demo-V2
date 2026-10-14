import { db } from '@/lib/db';
import { sessionToken } from '@/lib/auth';
import { fail, AppError } from '@/lib/errors';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { assertSameOrigin } from '@/lib/request-security';
const credentials = z.object({ email: z.email(), password: z.string().min(1) });
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const data = credentials.parse(await request.json());
    const user = await db.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user || !user.active || !(await compare(data.password, user.passwordHash))) fail(401, 'Invalid credentials');
    const response = Response.json({ id: user.id, role: user.role, displayName: user.displayName });
    response.headers.append('Set-Cookie', `maritime_session=${await sessionToken({ id:user.id,role:user.role })}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`);
    return response;
  } catch (error) { return Response.json({ error: error instanceof AppError ? error.message : 'Invalid request' }, { status: error instanceof AppError ? error.status : 400 }); }
}
