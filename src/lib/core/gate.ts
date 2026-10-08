// The sign-in gate: where a person belongs, given how far through sign-in they are. Pure; the
// shell reads the session and the database, then asks this where to send the request.
import type { Permission } from './permissions';
import {
  appAssetsPrefix,
  invitePrefix,
  manifestPath,
  nextParam,
  pathWithNext,
  paths,
  pdfjsPrefix,
} from './paths';
import { homePath, onDummyOrigin, sameSitePath, type SafePath } from './safe-path';

/** What the shell knows about a signed-in person. The Singer and Voice Part are the shell's types. */
export type Standing<Singer, Part> = {
  readonly singer: Singer;
  readonly voicePart: Part | null;
  readonly permissions: readonly Permission[];
};

/** How far through sign-in a person is, carrying only what is known at that stage. */
export type Access<Singer, Part> =
  | { readonly stage: 'unknown' }
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
  | { readonly kind: 'allow' }
  | { readonly kind: 'redirect'; readonly to: string }
  | { readonly kind: 'unavailable' };

export const signedOut = { stage: 'signed-out' } as const;

/** Access could not be checked, for example because the database did not answer. */
export const accessUnknown = { stage: 'unknown' } as const;

/** A new Singer chooses their Voice Part first. After that, a Singer without `read` is Pending. */
export const accessOf = <Singer, Part>({
  singer,
  voicePart,
  permissions,
}: Standing<Singer, Part>): Access<Singer, Part> =>
  voicePart === null
    ? { stage: 'needs-voice-part', singer, permissions }
    : { stage: permissions.includes('read') ? 'ready' : 'pending', singer, permissions, voicePart };

const gatePageOf: Readonly<Record<Exclude<Stage, 'ready' | 'unknown'>, string>> = {
  'signed-out': paths.signIn,
  'needs-voice-part': paths.chooseVoicePart,
  pending: paths.waiting,
};

const gatePages: readonly string[] = Object.values(gatePageOf);

const isGatePage = (pathname: string): boolean => gatePages.includes(pathname);

const homeOf = (stage: Exclude<Stage, 'unknown'>): string =>
  stage === 'ready' ? homePath : gatePageOf[stage];

/** Reachable at every stage: sign-in plumbing, sign-out, Invite Links, the manifest and built assets. */
const isAlwaysPublic = (pathname: string): boolean =>
  pathname === paths.authCallback ||
  pathname === paths.signOut ||
  pathname === manifestPath ||
  pathname.startsWith(invitePrefix) ||
  pathname.startsWith(appAssetsPrefix) ||
  pathname.startsWith(pdfjsPrefix);

/** A gate page would loop, and the callback needs a fresh code from Google. */
const leadsBackIntoSignIn = (path: SafePath): boolean => {
  const { pathname } = onDummyOrigin(path);
  return isGatePage(pathname) || pathname === paths.authCallback;
};

/**
 * Where to go after sign-in or choosing a Voice Part. Only a same-site path is accepted, never a
 * gate page or the callback; anything else means home.
 */
export const safeNextPath = (raw: string | null): SafePath => {
  const path = raw === null ? null : sameSitePath(raw);
  return path === null || leadsBackIntoSignIn(path) ? homePath : path;
};

const redirect = (to: string): GateDecision => ({ kind: 'redirect', to });

/** Decides what to do with a request, from the person's stage and the path they asked for. */
export const resolveGate = (stage: Stage, pathAndSearch: string): GateDecision => {
  const url = onDummyOrigin(pathAndSearch);
  if (isAlwaysPublic(url.pathname)) return { kind: 'allow' };

  // Without knowing who is asking, only signing in can still work.
  if (stage === 'unknown') {
    return url.pathname === gatePageOf['signed-out'] ? { kind: 'allow' } : { kind: 'unavailable' };
  }

  if (stage === 'ready') {
    return isGatePage(url.pathname)
      ? redirect(safeNextPath(url.searchParams.get(nextParam)))
      : { kind: 'allow' };
  }

  if (url.pathname === gatePageOf[stage]) return { kind: 'allow' };

  const keepsDestination = stage !== 'pending' && !isGatePage(url.pathname);
  return redirect(
    keepsDestination ? pathWithNext(homeOf(stage), safeNextPath(pathAndSearch)) : homeOf(stage),
  );
};
