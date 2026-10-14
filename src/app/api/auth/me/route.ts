import { currentActor } from '@/lib/auth';
import { db } from '@/lib/db';
export async function GET() {
  try { const actor = await currentActor(); const user = await db.user.findUnique({ where:{id:actor.id},select:{id:true,role:true,displayName:true,active:true} }); if (!user?.active) return Response.json({error:'Unauthorized'},{status:401}); return Response.json(user); }
  catch { return Response.json({error:'Unauthorized'},{status:401}); }
}
