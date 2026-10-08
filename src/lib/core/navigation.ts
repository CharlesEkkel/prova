// The navigation the shell and the admin portal show: what each item is called, where it goes, and
// when it counts as the current one. Pages come from `paths`.
import { safeNextPath } from './gate';
import { isCurrentPage, isInSection, paths, pathWithNext } from './paths';
import { homePath } from './safe-path';

export type NavItem = {
  readonly key:
    'home' | 'admin' | 'admin-singers' | 'admin-roles' | 'admin-voice-parts' | 'admin-appearance';
  readonly label: string;
  readonly path: string;
  /** `section` stays lit for every page below its path, `page` only for the page itself. */
  readonly match: 'page' | 'section';
};

const home: NavItem = { key: 'home', label: 'Home', path: paths.home, match: 'page' };
const admin: NavItem = { key: 'admin', label: 'Admin', path: paths.admin, match: 'section' };

/** The sidebar's main links; Admin only for a Singer who may open the admin portal. */
export const mainNavigation = (showAdmin: boolean): readonly NavItem[] =>
  showAdmin ? [home, admin] : [home];

/** The admin portal's tabs. */
export const adminTabs: readonly NavItem[] = [
  { key: 'admin-singers', label: 'Singers', path: paths.admin, match: 'page' },
  { key: 'admin-roles', label: 'Roles', path: paths.adminRoles, match: 'page' },
  { key: 'admin-voice-parts', label: 'Voice Parts', path: paths.adminVoiceParts, match: 'page' },
  { key: 'admin-appearance', label: 'Appearance', path: paths.adminAppearance, match: 'page' },
];

/** Whether this item is the one for the page being shown. */
export const isActive = (item: NavItem, pathname: string): boolean =>
  item.match === 'section' ? isInSection(pathname, item.path) : isCurrentPage(pathname, item.path);

/**
 * Where the user menu's "Change default Voice Part" goes: the profile, carrying the page it was
 * opened from so saving returns there. From the profile itself it returns home instead.
 */
export const changeVoicePartLink = (pathname: string, search: string): string =>
  pathWithNext(
    paths.profile,
    pathname === paths.profile ? homePath : safeNextPath(pathname + search),
  );
