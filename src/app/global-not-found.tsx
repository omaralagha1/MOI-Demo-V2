import './styles.css';
import type { Metadata } from 'next';
import { ar } from '@/i18n/dictionaries/ar';
import { en } from '@/i18n/dictionaries/en';
import { BrandMark } from '@/components/layout/BrandMark';

export const metadata: Metadata = { title: `${en.notFound.title} · ${en.meta.siteName}` };

/** 404 for URLs outside any locale. The language is unknown, so the page is bilingual (Arabic first). */
export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main className="not-found">
          <BrandMark size={56} />
          <h1 className="page-title">{ar.notFound.title}</h1>
          <p className="muted">{ar.notFound.body}</p>
          <a className="btn btn-lg" href="/ar">{ar.notFound.home}</a>
          <div lang="en" dir="ltr" className="not-found-alt">
            <h2>{en.notFound.title}</h2>
            <p className="muted">{en.notFound.body}</p>
            <a className="btn btn-secondary" href="/en">{en.notFound.home}</a>
          </div>
        </main>
      </body>
    </html>
  );
}
