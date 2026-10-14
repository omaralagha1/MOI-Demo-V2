'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { ViewUser } from '@/lib/cases/model';
import { EmptyState, Ltr, Skeleton } from '@/components/ui/primitives';
import type { ActivityItem } from './useCaseList';

/** Recent status updates derived from the audit history of the user's cases. */
export function NotificationPanel({ items, user, caseHref, title, empty }: { items: ActivityItem[] | null; user: ViewUser; caseHref: (id: string) => string; title: string; empty: string }) {
  const { t, label, dateTime } = useI18n();
  return (
    <section className="card card-pad" aria-labelledby="notifications-title">
      <div className="card-head"><h2 className="card-title" id="notifications-title"><Bell size={20} aria-hidden="true" />{title}</h2></div>
      {!items ? <Skeleton lines={4} title={false} /> : !items.length ? <EmptyState compact title={empty} icon={Bell} /> : (
        <ul className="notification-list">
          {items.map((item, index) => (
            <li key={`${item.case.id}-${item.created_at}-${index}`}>
              <Link href={caseHref(item.case.id)} className="notification">
                <span className="notification-dot" aria-hidden="true" />
                <span style={{ minWidth: 0 }}>
                  <span className="notification-title">{label(t.auditActions, item.action)}{item.from_status !== item.to_status && <> · {label(t.statuses, item.to_status)}</>}</span>
                  <span className="notification-meta"><bdi>{item.case.vessel_name}</bdi> · <Ltr mono>{item.case.application_number}</Ltr></span>
                  <span className="notification-meta">{item.actor === user.id ? t.common.you : label(t.roles, item.role)} · <time dateTime={item.created_at}>{dateTime(item.created_at)}</time></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
