'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { intlLocale } from '@/i18n/config';
import { eventVisual } from '@/components/cases/CaseParts';
import { useLiveUpdates } from './LiveUpdatesProvider';

/** Relative time ("5 minutes ago") in the active language. */
function useRelativeTime() {
  const { locale } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const format = useMemo(() => new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' }), [locale]);
  return (iso: string) => {
    const seconds = Math.round((Date.parse(iso) - now) / 1000);
    const abs = Math.abs(seconds);
    if (abs < 45) return format.format(0, 'second');
    if (abs < 3600) return format.format(Math.round(seconds / 60), 'minute');
    if (abs < 86_400) return format.format(Math.round(seconds / 3600), 'hour');
    return format.format(Math.round(seconds / 86_400), 'day');
  };
}

/** Header bell: unread count, recent updates and requests awaiting the user, with live connection status. */
export function NotificationBell({ staff }: { staff: boolean }) {
  const live = useLiveUpdates();
  const { t, f, label, href, number } = useI18n();
  const relative = useRelativeTime();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'forYou'>('all');
  const [seenAtOpen, setSeenAtOpen] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const unread = live?.unread ?? 0;
  const previousUnread = useRef(unread);

  useEffect(() => {
    if (unread > previousUnread.current) { setPulse(true); const timer = setTimeout(() => setPulse(false), 1200); previousUnread.current = unread; return () => clearTimeout(timer); }
    previousUnread.current = unread;
  }, [unread]);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!live) return null;
  const n = t.notifications;
  const pending = live.items.filter(item => item.forYou && item.caseStatus === item.toStatus);
  const shown = tab === 'all' ? live.items : pending;
  const caseHref = (id: string) => href(staff ? `/workspace/applications/${id}` : `/applications/${id}`);
  const isUnread = (iso: string, forYou: boolean, pendingNow: boolean) => (seenAtOpen === null ? forYou && pendingNow : Date.parse(iso) > seenAtOpen);
  const statusText = { live: n.live, connecting: n.connecting, polling: n.polling, offline: n.offline }[live.status];

  const toggle = () => {
    if (!open) { setSeenAtOpen(live.lastSeen); live.markAllRead(); }
    setOpen(value => !value);
  };

  return (
    <div className="notif" ref={wrapper}>
      <button type="button" className={`notif-button ${pulse ? 'is-pulsing' : ''}`} aria-expanded={open} aria-controls={panelId}
        aria-label={unread ? f(n.buttonUnread, { count: number(unread) }) : n.button} onClick={toggle}>
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && <span className="notif-count" aria-hidden="true">{unread > 9 ? '9+' : number(unread)}</span>}
      </button>
      {open && (
        <div className="popover notif-panel" id={panelId} role="region" aria-label={n.title}>
          <div className="notif-head">
            <p className="popover-title" style={{ margin: 0 }}>{n.title}</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { live.markAllRead(); setSeenAtOpen(Date.now()); }}><CheckCheck size={16} aria-hidden="true" />{n.markAllRead}</button>
          </div>
          <div className="segmented notif-tabs" role="group" aria-label={n.title}>
            <button type="button" aria-pressed={tab === 'all'} onClick={() => setTab('all')}>{n.tabAll}</button>
            <button type="button" aria-pressed={tab === 'forYou'} onClick={() => setTab('forYou')}>{n.tabForYou}{pending.length > 0 && <span className="notif-tab-count">{number(pending.length)}</span>}</button>
          </div>
          {shown.length === 0 ? (
            <p className="notif-empty">{tab === 'all' ? n.empty : n.emptyForYou}</p>
          ) : (
            <ul className="notif-list">
              {shown.slice(0, 25).map(item => {
                const [Icon, tone] = eventVisual[item.action] || [Clock, 'neutral'];
                const pendingNow = item.forYou && item.caseStatus === item.toStatus;
                const fresh = isUnread(item.createdAt, item.forYou, pendingNow);
                return (
                  <li key={item.id}>
                    <Link href={caseHref(item.caseId)} className={`notif-item ${fresh ? 'is-unread' : ''}`} onClick={() => setOpen(false)}>
                      <span className={`timeline-icon tone-${tone}`}><Icon size={16} aria-hidden="true" /></span>
                      <span className="notif-body">
                        <span className="notif-title">
                          {label(t.auditActions, item.action)}
                          {pendingNow && <span className="badge tone-warning">{n.newRequest}</span>}
                        </span>
                        <span className="notif-meta"><bdi>{item.vesselName}</bdi> · <bdi dir="ltr" className="mono">{item.applicationNumber}</bdi></span>
                        <span className="notif-meta">{label(t.statuses, item.toStatus)} · {label(t.roles, item.role)} · <time dateTime={item.createdAt}>{relative(item.createdAt)}</time></span>
                      </span>
                      {fresh && <span className="notif-dot" aria-label={n.unread} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="notif-foot">
            <span className={`live-status is-${live.status}`}><span className="live-dot" aria-hidden="true" />{statusText}</span>
            <Link className="link-button" href={href(staff ? '/workspace/applications' : '/applications')} onClick={() => setOpen(false)}>{n.viewAll}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
