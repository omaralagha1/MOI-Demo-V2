import { responsibleRole, STAFF_ROLES } from './model';

/** A workflow change as delivered to one user's browser (live feed and notification list). */
export type Notification = {
  id: string;
  caseId: string;
  applicationNumber: string;
  vesselName: string;
  action: string;
  fromStatus: string | null;
  toStatus: string;
  /** The case's status when the notification was produced. */
  caseStatus: string;
  role: string;
  createdAt: string;
  /** The recipient performed this action themselves. */
  mine: boolean;
  /** The action moved the case into a stage where the recipient (by role or ownership) acts next. */
  forYou: boolean;
};

/** Audit row joined with the case fields needed for routing and access checks. */
export type FeedRow = {
  id: string; caseId: string; actor: string; role: string; action: string; fromStatus: string | null; toStatus: string; createdAt: Date;
  case: { ownerId: string; representativeId: string | null; applicationNumber: string; vesselName: string; status: string; intakeChannel: string };
};
type Recipient = { id: string; role: string };

/** Same visibility rule as the case API: staff see every case, others only cases they own or represent. */
export function canSee(row: Pick<FeedRow, 'case'>, recipient: Recipient) {
  return STAFF_ROLES.has(recipient.role) || row.case.ownerId === recipient.id || row.case.representativeId === recipient.id;
}

export function toNotification(row: FeedRow, recipient: Recipient): Notification {
  const next = responsibleRole({ status: row.toStatus, intake_channel: row.case.intakeChannel, owner_id: row.case.ownerId });
  const isOwner = row.case.ownerId === recipient.id || row.case.representativeId === recipient.id;
  const awaitsRecipient = next === 'APPLICANT' ? isOwner && !STAFF_ROLES.has(recipient.role) : next !== null && next === recipient.role;
  return {
    id: row.id, caseId: row.caseId, applicationNumber: row.case.applicationNumber, vesselName: row.case.vesselName,
    action: row.action, fromStatus: row.fromStatus, toStatus: row.toStatus, caseStatus: row.case.status, role: row.role,
    createdAt: row.createdAt.toISOString(), mine: row.actor === recipient.id,
    forYou: row.fromStatus !== row.toStatus && awaitsRecipient,
  };
}

/** Actions worth surfacing in the notification bell (uploads still refresh open pages, but are not listed). */
export const isListed = (notification: Notification) => !notification.mine && notification.action !== 'uploadDocument';
