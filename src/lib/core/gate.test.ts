import { describe, expect, it } from 'vitest';
import { accessStage, resolveGate, safeNextPath, type Stage } from './gate';

describe('accessStage', () => {
  it('is signed-out for someone with no session', () => {
    expect(accessStage({ signedIn: false, hasVoicePart: false, permissions: [] })).toBe(
      'signed-out',
    );
  });

  it('asks a new Singer for their Voice Part before anything else, even with access', () => {
    expect(accessStage({ signedIn: true, hasVoicePart: false, permissions: ['read'] })).toBe(
      'needs-voice-part',
    );
  });

  it('is pending for a Singer with a Voice Part but no read', () => {
    expect(accessStage({ signedIn: true, hasVoicePart: true, permissions: [] })).toBe('pending');
    expect(accessStage({ signedIn: true, hasVoicePart: true, permissions: ['append'] })).toBe(
      'pending',
    );
  });

  it('is ready for a Singer with a Voice Part and read', () => {
    expect(
      accessStage({ signedIn: true, hasVoicePart: true, permissions: ['read', 'append'] }),
    ).toBe('ready');
  });
});

describe('safeNextPath', () => {
  it.each([
    ['/piece/3', '/piece/3'],
    ['/repertoire?sort=title#top', '/repertoire?sort=title#top'],
    ['/', '/'],
  ])('keeps the same-site path %s', (raw, expected) => {
    expect(safeNextPath(raw)).toBe(expected);
  });

  it.each([
    ['nothing', null],
    ['empty', ''],
    ['an absolute URL', 'https://evil.example/steal'],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash trick', '/\\evil.example'],
    ['a dot segment hiding a protocol-relative URL', '/.//evil.example'],
    ['a parent segment hiding a protocol-relative URL', '/..//evil.example'],
    ['a nested parent segment hiding a protocol-relative URL', '/a/..//evil.example'],
    ['a dot segment hiding a backslash trick', '/./\\evil.example'],
    ['a path with no leading slash', 'piece/3'],
    ['a javascript URL', 'javascript:alert(1)'],
    ['a path with a newline', '/ok\nSet-Cookie: x=1'],
    ['a gate page, which would loop', '/sign-in'],
    ['a gate page with a query', '/waiting?x=1'],
    ['the callback', '/auth/callback'],
  ])('falls back to home for %s', (_label, raw) => {
    expect(safeNextPath(raw)).toBe('/');
  });
});

type Case = readonly [Stage, string, ReturnType<typeof resolveGate>];

const allow = { kind: 'allow' } as const;
const redirectTo = (to: string) => ({ kind: 'redirect', to }) as const;

describe('resolveGate', () => {
  const cases: readonly Case[] = [
    // Signed out: only the public pages.
    ['signed-out', '/sign-in', allow],
    ['signed-out', '/auth/callback', allow],
    ['signed-out', '/invite/abc123', allow],
    ['signed-out', '/manifest.webmanifest', allow],
    ['signed-out', '/sign-out', allow],
    ['signed-out', '/_app/immutable/entry.js', allow],
    ['signed-out', '/', redirectTo('/sign-in')],
    ['signed-out', '/piece/3?x=1', redirectTo('/sign-in?next=%2Fpiece%2F3%3Fx%3D1')],
    ['signed-out', '/waiting', redirectTo('/sign-in')],
    ['signed-out', '/choose-part', redirectTo('/sign-in')],
    // A new Singer chooses their part first, keeping where they were headed.
    ['needs-voice-part', '/choose-part', allow],
    ['needs-voice-part', '/auth/callback', allow],
    ['needs-voice-part', '/invite/abc123', allow],
    ['needs-voice-part', '/piece/3', redirectTo('/choose-part?next=%2Fpiece%2F3')],
    ['needs-voice-part', '/sign-in', redirectTo('/choose-part')],
    ['needs-voice-part', '/waiting', redirectTo('/choose-part')],
    // A Pending Singer sees only the waiting screen.
    ['pending', '/waiting', allow],
    ['pending', '/auth/callback', allow],
    ['pending', '/sign-out', allow],
    ['needs-voice-part', '/sign-out', allow],
    ['pending', '/invite/abc123', allow],
    ['pending', '/', redirectTo('/waiting')],
    ['pending', '/piece/3', redirectTo('/waiting')],
    ['pending', '/sign-in', redirectTo('/waiting')],
    ['pending', '/choose-part', redirectTo('/waiting')],
    // A Singer with access gets the app, and is moved on from the gate pages.
    ['ready', '/', allow],
    ['ready', '/piece/3', allow],
    ['ready', '/invite/abc123', allow],
    ['ready', '/sign-in', redirectTo('/')],
    ['ready', '/waiting', redirectTo('/')],
    ['ready', '/choose-part', redirectTo('/')],
    ['ready', '/sign-in?next=%2Fpiece%2F3', redirectTo('/piece/3')],
    ['ready', '/choose-part?next=%2Fpiece%2F3', redirectTo('/piece/3')],
    ['ready', '/sign-in?next=https%3A%2F%2Fevil.example', redirectTo('/')],
    ['ready', '/sign-in?next=%2F.%2F%2Fevil.example', redirectTo('/')],
  ];

  it.each(cases)('for %s at %s', (stage, path, expected) => {
    expect(resolveGate(stage, path)).toEqual(expected);
  });
});
