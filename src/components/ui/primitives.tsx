import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, CircleDot, Clock, FilePen, Info, Inbox, Stamp, XCircle, type LucideIcon } from 'lucide-react';
import type { Tone } from '@/lib/cases/model';

/* Hook-free presentational primitives, usable from Server and Client Components. */

const toneIcons: Record<Tone, LucideIcon> = {
  neutral: FilePen, info: CircleDot, progress: Clock, warning: AlertTriangle, danger: XCircle, approval: Stamp, success: CheckCircle2,
};

/** Status chip: colour plus icon plus text, so state is never conveyed by colour alone. */
export function StatusBadge({ tone, children, size, icon = true }: { tone: Tone; children: ReactNode; size?: 'lg'; icon?: boolean }) {
  const Icon = toneIcons[tone];
  return <span className={`badge tone-${tone} ${size === 'lg' ? 'badge-lg' : ''}`}>{icon && <Icon aria-hidden="true" />}{children}</span>;
}

export function Breadcrumbs({ label, items }: { label: string; items: { label: string; href?: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label={label}>
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {index > 0 && <ChevronRight size={14} aria-hidden="true" className="flip-rtl" />}
            {item.href && index < items.length - 1 ? <Link href={item.href}>{item.label}</Link> : <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ eyebrow, title, subtitle, breadcrumbs, actions, children }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; breadcrumbs?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-header">
      <div className="container">
        {breadcrumbs}
        <div className="page-header-inner">
          <div>
            {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
            {children}
          </div>
          {actions && <div className="page-actions">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action, id, as: Heading = 'h2' }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; id?: string; as?: 'h2' | 'h3' }) {
  return (
    <div className="section-header">
      <div>
        <Heading className="section-title" id={id}>{title}</Heading>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function KpiStatCard({ label, value, icon: Icon, href, emphasis, tile = '' }: { label: string; value: ReactNode; icon: LucideIcon; href?: string; emphasis?: boolean; tile?: string }) {
  const body = (
    <>
      <span className={`icon-tile ${tile}`}><Icon size={22} aria-hidden="true" /></span>
      <span>
        <span className="kpi-value">{value}</span>
        <span className="kpi-label" style={{ display: 'block' }}>{label}</span>
      </span>
    </>
  );
  const className = `card kpi ${emphasis ? 'kpi-emphasis' : ''}`;
  return href ? <Link className={`${className} card-interactive`} href={href}>{body}</Link> : <div className={className}>{body}</div>;
}

export function EmptyState({ title, body, icon: Icon = Inbox, action, compact }: { title: ReactNode; body?: ReactNode; icon?: LucideIcon; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={`empty-state ${compact ? 'empty-state-compact' : ''}`}>
      <span className="icon-tile"><Icon size={24} aria-hidden="true" /></span>
      <p className="empty-state-title">{title}</p>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

const alertIcons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };
export function Alert({ tone = 'info', title, children, role }: { tone?: keyof typeof alertIcons; title?: ReactNode; children?: ReactNode; role?: 'alert' | 'status' }) {
  const Icon = alertIcons[tone];
  return (
    <div className={`alert alert-${tone}`} role={role}>
      <Icon size={20} aria-hidden="true" />
      <div className="alert-body">
        {title && <strong className="alert-title">{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export function Skeleton({ lines = 3, title = true }: { lines?: number; title?: boolean }) {
  return (
    <div aria-hidden="true">
      {title && <div className="skeleton skeleton-title" />}
      {Array.from({ length: lines }, (_, index) => <div key={index} className="skeleton skeleton-line" style={{ width: `${92 - index * 14}%` }} />)}
    </div>
  );
}

/** Keeps IDs and references left-to-right inside Arabic text. */
export function Ltr({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return <bdi dir="ltr" className={`ltr ${mono ? 'mono' : ''}`}>{children}</bdi>;
}
