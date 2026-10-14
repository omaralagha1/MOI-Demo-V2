'use client';

import { useEffect } from 'react';
import { rememberService } from '@/components/home/recent';

/** Records a service visit for the "recently used" shortcut on the homepage. */
export function RememberService({ slug }: { slug: string }) {
  useEffect(() => { rememberService(slug); }, [slug]);
  return null;
}
