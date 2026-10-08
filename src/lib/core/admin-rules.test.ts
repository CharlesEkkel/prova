import { describe, expect, it } from 'vitest';
import {
  canChangeRole,
  canGrantRole,
  canOfferPermission,
  isPendingSinger,
  canChangeSinger,
  hasNoRead,
  mayOpenAdmin,
  type RoleSummary,
  type SingerSummary,
} from './admin-rules';

const role = (overrides: Partial<RoleSummary> = {}): RoleSummary => ({
  isBuiltin: false,
  permissions: ['read'],
  ...overrides,
});
const singer = (overrides: Partial<SingerSummary> = {}): SingerSummary => ({
  isOwner: false,
  permissions: ['read'],
  ...overrides,
});

describe('mayOpenAdmin', () => {
  it('needs manage-users', () => {
    expect(mayOpenAdmin(['read', 'manage-users'])).toBe(true);
    expect(mayOpenAdmin(['read'])).toBe(false);
    expect(mayOpenAdmin([])).toBe(false);
  });
});

describe('canChangeRole', () => {
  it('is never allowed for a built-in Role', () => {
    expect(canChangeRole(['manage-users', 'manage-admins'], role({ isBuiltin: true }))).toBe(false);
  });

  it('is allowed with manage-users for a Role without manage-users', () => {
    expect(canChangeRole(['manage-users'], role({ permissions: ['read', 'append'] }))).toBe(true);
  });

  it('needs manage-admins for a Role that includes manage-users', () => {
    const powerful = role({ permissions: ['read', 'manage-users'] });
    expect(canChangeRole(['manage-users'], powerful)).toBe(false);
    expect(canChangeRole(['manage-users', 'manage-admins'], powerful)).toBe(true);
  });

  it('is refused without manage-users', () => {
    expect(canChangeRole(['read'], role())).toBe(false);
  });
});

describe('canChangeSinger', () => {
  it('is never allowed for an Owner', () => {
    expect(canChangeSinger(['manage-users', 'manage-admins'], singer({ isOwner: true }))).toBe(
      false,
    );
  });

  it('needs manage-admins for a Singer who holds manage-users', () => {
    const admin = singer({ permissions: ['read', 'manage-users'] });
    expect(canChangeSinger(['manage-users'], admin)).toBe(false);
    expect(canChangeSinger(['manage-users', 'manage-admins'], admin)).toBe(true);
  });

  it('is allowed with manage-users for an ordinary Singer', () => {
    expect(canChangeSinger(['manage-users'], singer())).toBe(true);
  });

  it('is refused without manage-users', () => {
    expect(canChangeSinger([], singer())).toBe(false);
  });
});

describe('hasNoRead', () => {
  it('flags a Role whose holders would stay Pending', () => {
    expect(hasNoRead(['append'])).toBe(true);
    expect(hasNoRead(['read', 'append'])).toBe(false);
  });
});

describe('canGrantRole', () => {
  it('never offers a Role holding manage-admins, such as Owner', () => {
    const owner = role({ isBuiltin: true, permissions: ['read', 'manage-users', 'manage-admins'] });
    expect(canGrantRole(['manage-users', 'manage-admins'], owner)).toBe(false);
  });

  it('offers a Role holding manage-users only to someone with manage-admins', () => {
    const admin = role({ isBuiltin: true, permissions: ['read', 'manage-users'] });
    expect(canGrantRole(['manage-users'], admin)).toBe(false);
    expect(canGrantRole(['manage-users', 'manage-admins'], admin)).toBe(true);
  });

  it('offers an ordinary Role to anyone who may open the portal', () => {
    expect(canGrantRole(['manage-users'], role())).toBe(true);
  });
});

describe('canOfferPermission', () => {
  it('never offers manage-admins, and manage-users only with manage-admins', () => {
    expect(canOfferPermission(['manage-users', 'manage-admins'], 'manage-admins')).toBe(false);
    expect(canOfferPermission(['manage-users'], 'manage-users')).toBe(false);
    expect(canOfferPermission(['manage-users', 'manage-admins'], 'manage-users')).toBe(true);
    expect(canOfferPermission(['manage-users'], 'append')).toBe(true);
  });
});

describe('isPendingSinger', () => {
  it('is a Singer without read', () => {
    expect(isPendingSinger([])).toBe(true);
    expect(isPendingSinger(['read'])).toBe(false);
  });
});
