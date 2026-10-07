// The sign-in gate: where a person belongs, given how far through sign-in they are. Pure; the
// shell reads the session and the database, then asks this where to send the request.

export const permissions = ['read', 'append', 'update', 'delete', 'manage-users'] as const;
export type Permission = (typeof permissions)[number];

/** What the shell knows about a signed-in person. The Singer and Voice Part are the shell's types. */
export type Standing<Singer, Part> = {
  readonly singer: Singer;
  readonly voicePart: Part | null;
  readonly permissions: readonly Permission[];
};

/** How far through sign-in a person is, carrying only what is known at that stage. */
export type Access<Singer, Part> =
  | { readonly stage: 'signed-out' }
  | {
      readonly stage: 'needs-voice-part';
      readonly singer: Singer;
      readonly permissions: readonly Permission[];
    }
  | {
      readonly stage: 'pending' | 'ready';
      readonly singer: Singer;
      readonly permissions: readonly Permission[];
      readonly voicePart: Part;
    };

export type Stage = Access<unknown, unknown>['stage'];

export type GateDecision =
  { readonly kind: 'allow' } | { readonly kind: 'redirect'; readonly to: string };

export const signedOut = { stage: 'signed-out' } as const;

/** A new Singer chooses their Voice Part first. After that, a Singer without `read` is Pending. */
export const accessOf = <Singer, Part>({
  singer,
  voicePart,
  permissions,
}: Standing<Singer, Part>): Access<Singer, Part> =>
  voicePart === null
    ? { stage: 'needs-voice-part', singer, permissions }
    : { stage: permissions.includes('read') ? 'ready' : 'pending', singer, permissions, voicePart };

/** Where Google sends a person back to, with the one-time code that becomes their session. */
export const callbackPath = '/auth/callback';

const gatePageOf: Readonly<Record<Exclude<Stage, 'ready'>, string>> = {
  'signed-out': '/sign-in',
  'needs-voice-part': '/choose-part',
  pending: '/waiting',
};

const gatePages: readonly string[] = Object.values(gatePageOf);

const homeOf = (stage: Stage): string => (stage === 'ready' ? '/' : gatePageOf[stage]);

/** Reachable at every stage: sign-in plumbing, sign-out, Invite Links, the manifest and built assets. */
const isAlwaysPublic = (pathname: string): boolean =>
  pathname === callbackPath ||
  pathname === '/sign-out' ||
  pathname === '/manifest.webmanifest' ||
  pathname.startsWith('/invite/') ||
  pathname.startsWith('/_app/') ||
  pathname.startsWith('/pdfjs/');

const placeholderOrigin = 'http://prova.invalid';

const hasControlCharacter = (text: string): boolean =>
  Array.from({ length: text.length }, (_, index) => text.charCodeAt(index)).some(
    (code) => code < 0x20 || code === 0x7f,
  );

/**
 * Where to go after sign-in or choosing a Voice Part. Only a same-site path is accepted, never a
 * gate page (which would loop) or the callback; anything else means home.
 */
export const safeNextPath = (raw: string | null): string => {
  if (raw === null || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\'))
    return '/';
  if (hasControlCharacter(raw)) return '/';
  const url = new URL(raw, placeholderOrigin);
  if (url.origin !== placeholderOrigin) return '/';
  // Dot segments normalise away, so `/.//evil.example` parses to the pathname `//evil.example`.
  if (url.pathname.startsWith('//')) return '/';
  if (gatePages.includes(url.pathname) || url.pathname === callbackPath) return '/';
  return `${url.pathname}${url.search}${url.hash}`;
};

const redirect = (to: string): GateDecision => ({ kind: 'redirect', to });

/** Keeps where the person was headed, unless that is just home. */
const withNext = (page: string, headedFor: string): string => {
  const next = safeNextPath(headedFor);
  return next === '/' ? page : `${page}?next=${encodeURIComponent(next)}`;
};

/** Decides what to do with a request, from the person's stage and the path they asked for. */
export const resolveGate = (stage: Stage, pathAndSearch: string): GateDecision => {
  const url = new URL(pathAndSearch, placeholderOrigin);
  if (isAlwaysPublic(url.pathname)) return { kind: 'allow' };

  if (stage === 'ready') {
    return gatePages.includes(url.pathname)
      ? redirect(safeNextPath(url.searchParams.get('next')))
      : { kind: 'allow' };
  }

  if (url.pathname === gatePageOf[stage]) return { kind: 'allow' };

  const keepsDestination = stage !== 'pending' && !gatePages.includes(url.pathname);
  return redirect(keepsDestination ? withNext(homeOf(stage), pathAndSearch) : homeOf(stage));
};
