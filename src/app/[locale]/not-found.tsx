'use client';

import Link from 'next/link';
import { Compass } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { BrandMark } from '@/components/layout/BrandMark';

export default function LocaleNotFound() {
  const { t, href } = useI18n();
  return (
    <main className="not-found">
      <BrandMark size={56} />
      <span className="icon-tile icon-tile-lg"><Compass size={28} aria-hidden="true" /></span>
      <h1 className="page-title">{t.notFound.title}</h1>
      <p className="muted">{t.notFound.body}</p>
      <Link className="btn btn-lg" href={href('/')}>{t.notFound.home}</Link>
    </main>
  );
}
