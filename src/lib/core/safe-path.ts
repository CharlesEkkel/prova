// Same-site paths: where a `next` link or cookie may send a person on to, never another site.

declare const safePathBrand: unique symbol;

/** A path, query and hash on this site, from `sameSitePath`. */
export type SafePath = string & { readonly [safePathBrand]: true };

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- validation boundary: only called on '/' and on paths sameSitePath has checked
const brand = (path: string): SafePath => path as SafePath;

export const homePath: SafePath = brand('/');

const dummyOrigin = 'http://prova.invalid';

/** Parses a path against a dummy origin, so only its path, query and hash matter. */
export const onDummyOrigin = (path: string): URL => new URL(path, dummyOrigin);

const hasControlCharacter = (text: string): boolean =>
  Array.from({ length: text.length }, (_, index) => text.charCodeAt(index)).some(
    (code) => code < 0x20 || code === 0x7f,
  );

/** `//host` and `/\host` both leave the site. */
const leavesSite = (path: string): boolean => path.startsWith('//') || path.startsWith('/\\');

/** The path, query and hash of `raw` if it stays on this site, otherwise null. */
export const sameSitePath = (raw: string): SafePath | null => {
  if (!raw.startsWith('/') || leavesSite(raw) || hasControlCharacter(raw)) return null;
  const url = onDummyOrigin(raw);
  // Dot segments normalise away, so `/.//evil.example` parses to the pathname `//evil.example`.
  if (url.origin !== dummyOrigin || leavesSite(url.pathname)) return null;
  return brand(`${url.pathname}${url.search}${url.hash}`);
};
