import { currentActor } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import * as cases from '@/server/cases';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { assertSameOrigin } from '@/lib/request-security';
import { liveHub } from '@/server/live-updates';
export const runtime='nodejs';
type Context={params:Promise<{path?:string[]}>};
async function handle(request:Request,context:Context){
  try {
    if(request.method!=='GET')assertSameOrigin(request);
    const actor=await currentActor(),path=(await context.params).path||[],id=path[0],method=request.method;
    const url=new URL(request.url);
    let result:unknown;
    if(!id&&method==='GET')result=await cases.listCases(actor,url);
    else if(!id&&method==='POST')result=await cases.createCase(actor,await request.json());
    else if(id&&path.length===1&&method==='GET')result=await cases.detail(actor,id);
    else if(id&&path.length===1&&method==='PATCH')result=await cases.updateCase(actor,id,await request.json());
    else if(id&&path[1]==='submit'&&method==='POST')result=await cases.submit(actor,id);
    else if(id&&path[1]==='review'&&path[2]==='approve'&&method==='POST')result=await cases.review(actor,id,await request.json());
    else if(id&&path[1]==='review'&&path[2]==='request-info'&&method==='POST')result=await cases.requestInfo(actor,id,await request.json());
    else if(id&&path[1]==='fees'&&method==='GET')result=await cases.fees(actor,id);
    else if(id&&path[1]==='fees'&&path[2]==='assess'&&method==='POST')result=await cases.assessFee(actor,id,await request.json());
    else if(id&&path[1]==='payment-confirmations'&&method==='POST')result=await cases.confirmPayment(actor,id,await request.json());
    else if(id&&path[1]==='payment-simulation'&&method==='POST')result=await cases.simulatePayment(actor,id);
    else if(id&&path[1]==='inspection'&&path[2]==='handover'&&method==='POST')result=await cases.handoverForInspection(actor,id);
    else if(id&&path[1]==='inspection'&&path[2]==='return'&&method==='POST')result=await cases.returnInspectedPapers(actor,id);
    else if(id&&path[1]==='inspection-form'&&method==='GET')result=await cases.downloadGenerated(actor,id,'INSPECTION_FORM');
    else if(id&&path[1]==='inspection-reports'&&method==='POST')result=await cases.inspectionReport(actor,id,await request.json());
    else if(id&&path[1]==='certificate'&&path[2]==='draft'&&method==='POST')result=await cases.draft(actor,id);
    else if(id&&path[1]==='certificate'&&path[2]==='draft'&&method==='GET')result=await cases.downloadGenerated(actor,id,'CERTIFICATE_DRAFT');
    else if(id&&path[1]==='approvals'&&path.length===2&&method==='GET')result=await cases.approvals(actor,id);
    else if(id&&path[1]==='approvals'&&path[2]&&path[3]==='decision'&&method==='POST')result=await cases.decide(actor,id,path[2],await request.json());
    else if(id&&path[1]==='documents'&&path[2]&&path[3]==='review'&&method==='POST')result=await cases.reviewDocument(actor,id,path[2],await request.json());
    else if(id&&path[1]==='approved-draft'&&path[2]==='receive'&&method==='POST')result=await cases.receiveApprovedDraft(actor,id);
    else if(id&&path[1]==='release'&&method==='POST')result=await cases.release(actor,id);
    else if(id&&path[1]==='delivery'&&path[2]==='acknowledge'&&method==='POST')result=await cases.acknowledgeDelivery(actor,id,await request.json());
    else if(id&&path[1]==='audit-events'&&method==='GET')result=await cases.audit(actor,id);
    else if(id&&path[1]==='sla'&&method==='GET')result=await cases.sla(actor,id);
    else if(id&&path[1]==='documents'&&path.length===2&&method==='POST'){
      const form=await request.formData();result=await cases.upload(actor,id,url.searchParams.get('type')||'',form.get('file') as File);
    }
    else if(id&&path[1]==='documents'&&path[2]&&method==='GET')result=await cases.download(actor,id,path[2]);
    else if(id&&path[1]==='certificate'&&path.length===2&&method==='GET')result=await cases.download(actor,id);
    else return Response.json({error:'Not found'},{status:404});
    // Push the change to other open pages without waiting for the next feed poll.
    if(method!=='GET')liveHub.kick();
    if(result&&typeof result==='object'&&'bytes' in result){const file=result as Awaited<ReturnType<typeof cases.download>>;return new Response(new Uint8Array(file.bytes),{headers:{'Content-Type':file.mediaType,'Content-Disposition':`attachment; filename="${file.filename.replaceAll('"','')}"`,'Cache-Control':'no-store'}});}
    return Response.json(result);
  }catch(error){
    if(error instanceof AppError)return Response.json({error:error.message},{status:error.status});
    if(error instanceof ZodError)return Response.json({error:'Invalid input',issues:error.issues},{status:422});
    if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')return Response.json({error:'Duplicate record'},{status:409});
    console.error('Case request failed',error instanceof Error?error.name:'Unknown error');
    return Response.json({error:'Internal error'},{status:500});
  }
}
export const GET=handle;
export const POST=handle;
export const PATCH=handle;
