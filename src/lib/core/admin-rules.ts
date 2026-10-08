// What the admin portal lets a Singer do, given the Permissions they hold. The database enforces
// the same rules; these only decide what to show enabled. See Access in CONTEXT.md.
import type { Permission } from './permissions';

export type RoleSummary = {
  readonly isBuiltin: boolean;
  readonly permissions: readonly Permission[];
};

export type SingerSummary = {
  readonly isOwner: boolean;
  readonly permissions: readonly Permission[];
};

export const mayOpenAdmin = (held: readonly Permission[]): boolean => held.includes('manage-users');

/** Anything that grants, revokes or touches manage-users needs manage-admins as well. */
const mayTouch = (held: readonly Permission[], permissions: readonly Permission[]): boolean =>
  !permissions.includes('manage-users') || held.includes('manage-admins');

/** Whether the Role can be edited or deleted: built-in Roles are locked. */
export const canChangeRole = (held: readonly Permission[], role: RoleSummary): boolean =>
  mayOpenAdmin(held) && !role.isBuiltin && mayTouch(held, role.permissions);

/** Whether the Singer can be removed or have their Roles changed: never an Owner. */
export const canChangeSinger = (held: readonly Permission[], singer: SingerSummary): boolean =>
  mayOpenAdmin(held) && !singer.isOwner && mayTouch(held, singer.permissions);

/** A Role without `read` leaves its holders Pending. */
export const hasNoRead = (permissions: readonly Permission[]): boolean =>
  !permissions.includes('read');
