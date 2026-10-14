import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle2, Lock } from 'lucide-react';
import { getDictionary, getI18n, isLocale } from '@/i18n';
import { getSessionUser, homeFor, safeReturnPath } from '@/lib/session';
import { BrandMark } from '@/components/layout/BrandMark';
import { LoginForm } from '@/components/auth/LoginForm';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).auth.title } : {};
}

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { t, locale } = await getI18n(params);
  const { next } = await searchParams;
  const returnTo = safeReturnPath(locale, typeof next === 'string' ? next : null);
  const user = await getSessionUser();
  if (user) redirect(returnTo || homeFor(locale, user));
  return (
    <div className="auth-page">
      <div className="container auth-grid">
        <section className="auth-panel on-dark" aria-hidden="false">
          <BrandMark size={56} />
          <p className="auth-panel-state">{t.brand.state}</p>
          <h2 className="auth-panel-title">{t.auth.panelTitle}</h2>
          <ul className="auth-points">{t.auth.panelPoints.map(point => <li key={point}><CheckCircle2 size={20} aria-hidden="true" />{point}</li>)}</ul>
        </section>
        <section className="card auth-card" aria-labelledby="login-title">
          <span className="icon-tile icon-tile-lg"><Lock size={24} aria-hidden="true" /></span>
          <h1 className="page-title" id="login-title">{t.auth.title}</h1>
          <p className="muted">{t.auth.subtitle}</p>
          <LoginForm next={returnTo} />
          <p className="field-hint auth-note">{t.auth.accountsNote}</p>
        </section>
      </div>
    </div>
  );
}
