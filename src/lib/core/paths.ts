// Every page address in Prova, and every way of building one. Components, routes and the gate take
// their paths from here and never write one out, so renaming or moving a page is one edit.
import type { PerformanceId } from './performances';
import type { SafePath } from './safe-path';

/** The pages, as paths on this site. */
export const paths = {
  home: '/',
  signIn: '/sign-in',
  signOut: '/sign-out',
  /** Where Google sends a person back to, with the one-time code that becomes their session. */
  authCallback: '/auth/callback',
  chooseVoicePart: '/choose-part',
  /** Where a Singer changes their own default Voice Part. */
  profile: '/profile',
  waiting: '/waiting',
  admin: '/admin',
  adminRoles: '/admin/roles',
  adminVoiceParts: '/admin/voice-parts',
  adminAppearance: '/admin/appearance',
} as const;

/** Reachable at every stage of sign-in: the manifest, Invite Links and the built assets. */
export const manifestPath = '/manifest.webmanifest';
export const invitePrefix = '/invite/';
export const appAssetsPrefix = '/_app/';
export const pdfjsPrefix = '/pdfjs/';
export const pdfjsWasmPath = `${pdfjsPrefix}wasm/`;

/** The query parameter that carries where a person was headed through sign-in. */
export const nextParam = 'next';
/** The query parameter that carries why sign-in did not finish. */
export const signInErrorParam = 'error';
/** The query parameter that opens a Performance's Overview on whatever page it is added to. */
export const overviewParam = 'overview';

/** Form actions: the names a page's `actions` are registered under and its forms post to. */
export const formActions = {
  signIn: { google: 'google' },
  singers: { setRoles: 'setRoles', remove: 'remove' },
  roles: { create: 'create', update: 'update', delete: 'delete' },
  voiceParts: { add: 'add', update: 'update', reorder: 'reorder', remove: 'remove' },
  appearance: { set: 'set', reset: 'reset' },
} as const;

/** The address of a named form action on the current page. */
export const actionPath = (name: string): string => `?/${name}`;

/** `path` (which may already have a query), carrying `next` along unless that is just home. */
export const pathWithNext = (path: string, next: SafePath): string => {
  if (next === paths.home) return path;
  const query = new URLSearchParams({ [nextParam]: next }).toString();
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
};

/** The sign-in screen showing why sign-in did not finish, still carrying where they were headed. */
export const signInErrorPath = (problem: string, headedFor: SafePath): string =>
  pathWithNext(`${paths.signIn}?${signInErrorParam}=${problem}`, headedFor);

/** A link that opens a Performance's Overview on the current page. */
export const overviewLink = (id: PerformanceId): string =>
  `?${new URLSearchParams({ [overviewParam]: id }).toString()}`;

/** Whether `pathname` is exactly this page. */
export const isCurrentPage = (pathname: string, path: string): boolean => pathname === path;

/** Whether `pathname` is this page or anything below it. Home holds only itself. */
export const isInSection = (pathname: string, path: string): boolean =>
  path === paths.home ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
