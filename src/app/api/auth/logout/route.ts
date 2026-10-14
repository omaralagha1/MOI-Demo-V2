import { assertSameOrigin } from '@/lib/request-security';
import { AppError } from '@/lib/errors';
export async function POST(request:Request) {
  try{assertSameOrigin(request);}catch(error){return Response.json({error:error instanceof AppError?error.message:'Forbidden'},{status:403});}
  const response = Response.json({ ok: true });
  response.headers.set('Set-Cookie','maritime_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  return response;
}
