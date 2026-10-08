import { describe, expect, it } from 'vitest';
import { adminTabs, isActive, mainNavigation, type NavItem } from './navigation';

const itemWith = (items: readonly NavItem[], key: NavItem['key']): NavItem => {
  const found = items.find((item) => item.key === key);
  if (found === undefined) throw new Error(`no ${key} item`);
  return found;
};

describe('mainNavigation', () => {
  it('is Home, and Admin only for a Singer who may open the admin portal', () => {
    expect(mainNavigation(false).map(({ label }) => label)).toEqual(['Home']);
    expect(mainNavigation(true).map(({ label }) => label)).toEqual(['Home', 'Admin']);
  });

  it('points Home at the home page and Admin at the admin portal', () => {
    expect(mainNavigation(true).map(({ path }) => path)).toEqual(['/', '/admin']);
  });
});

describe('adminTabs', () => {
  it('are Singers and Roles', () => {
    expect(adminTabs.map(({ label, path }) => [label, path])).toEqual([
      ['Singers', '/admin'],
      ['Roles', '/admin/roles'],
    ]);
  });
});

describe('isActive', () => {
  const home = itemWith(mainNavigation(true), 'home');
  const admin = itemWith(mainNavigation(true), 'admin');
  const singers = itemWith(adminTabs, 'admin-singers');
  const roles = itemWith(adminTabs, 'admin-roles');

  it('lights Admin for the portal and every page in it, and Home only for home', () => {
    expect(isActive(admin, '/admin/roles')).toBe(true);
    expect(isActive(admin, '/')).toBe(false);
    expect(isActive(home, '/')).toBe(true);
    expect(isActive(home, '/admin')).toBe(false);
  });

  it('lights exactly one admin tab', () => {
    expect([singers, roles].map((tab) => isActive(tab, '/admin'))).toEqual([true, false]);
    expect([singers, roles].map((tab) => isActive(tab, '/admin/roles'))).toEqual([false, true]);
  });
});
