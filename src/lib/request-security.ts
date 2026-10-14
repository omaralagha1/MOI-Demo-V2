import { fail } from './errors';
export function assertSameOrigin(request:Request){
  const origin=request.headers.get('origin');
  if(!origin)fail(403,'Origin required');
  const host=request.headers.get('host');
  if(!host)fail(403,'Host required');
  const source=new URL(origin);
  // Next.js may normalize Request.url to localhost even when the browser
  // reached the server through 127.0.0.1 or an approved proxy hostname.
  if(source.host!==host||source.protocol!==new URL(request.url).protocol||!['http:','https:'].includes(source.protocol))fail(403,'Cross-origin request denied');
}
