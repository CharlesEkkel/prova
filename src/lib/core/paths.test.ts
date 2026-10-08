import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  actionPath,
  appAssetsPrefix,
  invitePrefix,
  manifestPath,
  pdfjsPrefix,
  isCurrentPage,
  isInSection,
  overviewLink,
  pathWithNext,
  paths,
  signInErrorPath,
} from './paths';
import { performanceIdOf } from './performances';
import { sameSitePath } from './safe-path';

const next = (raw: string) => {
  const path = sameSitePath(raw);
  if (path === null) throw new Error(`${raw} is not a same-site path`);
  return path;
};

describe('pathWithNext', () => {
  it('leaves a path alone when the destination is just home', () => {
    expect(pathWithNext(paths.signIn, next('/'))).toBe('/sign-in');
  });

  it('carries where the person was headed, escaping it', () => {
    expect(pathWithNext(paths.signIn, next('/piece/3?tab=score'))).toBe(
      '/sign-in?next=%2Fpiece%2F3%3Ftab%3Dscore',
    );
  });

  it('adds to a query the path already has', () => {
    expect(pathWithNext('/sign-in?error=failed', next('/piece/3'))).toBe(
      '/sign-in?error=failed&next=%2Fpiece%2F3',
    );
  });
});

describe('signInErrorPath', () => {
  it('shows the problem on the sign-in screen, still carrying the destination', () => {
    expect(signInErrorPath('cancelled', next('/'))).toBe('/sign-in?error=cancelled');
    expect(signInErrorPath('failed', next('/piece/3'))).toBe(
      '/sign-in?error=failed&next=%2Fpiece%2F3',
    );
  });
});

describe('overviewLink', () => {
  it('opens a Performance Overview with a query parameter on the current page', () => {
    const id = performanceIdOf('5d34142f-5d7d-4ea8-9e80-2d9b7a5e4c11');
    if (id === null) throw new Error('the id is valid');
    expect(overviewLink(id)).toBe('?overview=5d34142f-5d7d-4ea8-9e80-2d9b7a5e4c11');
  });
});

describe('actionPath', () => {
  it('addresses a named form action of the current page', () => {
    expect(actionPath('setRoles')).toBe('?/setRoles');
  });
});

describe('isCurrentPage and isInSection', () => {
  it('matches a page exactly', () => {
    expect(isCurrentPage('/admin', paths.admin)).toBe(true);
    expect(isCurrentPage('/admin/roles', paths.admin)).toBe(false);
  });

  it('matches a page and everything below it, but not a lookalike', () => {
    expect(isInSection('/admin', paths.admin)).toBe(true);
    expect(isInSection('/admin/roles', paths.admin)).toBe(true);
    expect(isInSection('/administrator', paths.admin)).toBe(false);
    expect(isInSection('/', paths.admin)).toBe(false);
  });

  it('treats home as only the home page, never a section that holds everything', () => {
    expect(isInSection('/admin', paths.home)).toBe(false);
    expect(isInSection('/', paths.home)).toBe(true);
  });
});

describe('where paths are written', () => {
  const sourceRoot = join(import.meta.dirname, '..', '..');
  const sourceFiles = (dir: string): readonly string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? sourceFiles(path) : [path];
    });

  it('is only paths.ts: everything else builds them from there', () => {
    const own = join(sourceRoot, 'lib', 'core', 'paths.ts');
    const written = [
      ...Object.values(paths).filter((path) => path !== paths.home),
      manifestPath,
      invitePrefix,
      appAssetsPrefix,
      pdfjsPrefix,
    ];
    const offenders = sourceFiles(sourceRoot)
      .filter((file) => /\.(ts|svelte)$/.test(file) && file !== own && !file.endsWith('.test.ts'))
      .filter((file) => !file.endsWith('database.types.ts'))
      .flatMap((file) => {
        const text = readFileSync(file, 'utf8');
        return written
          .filter((path) => [`'${path}'`, `"${path}"`, `\`${path}\``].some((q) => text.includes(q)))
          .map((path) => `${file.slice(sourceRoot.length)} writes ${path}`);
      });

    expect(offenders).toEqual([]);
  });
});
