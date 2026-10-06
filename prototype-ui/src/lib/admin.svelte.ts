// PROTOTYPE: in-memory members, Roles and Invite Links for the admin portal.
import { TODAY, type VoicePart } from './data.svelte';
import { roles, type Permission, type Role } from './access.svelte';

export type Member = { id: string; name: string; email: string; part: VoicePart; roleIds: string[]; pending?: { via: string } };
export const members = $state<Member[]>([
  { id: 'u1', name: 'Sam Okafor', email: 'sam@example.org', part: 'Alto', roleIds: ['admin'] },
  { id: 'u2', name: 'Priya Nair', email: 'priya@example.org', part: 'Soprano', roleIds: ['editor'] },
  { id: 'u3', name: 'Tom Becker', email: 'tom@example.org', part: 'Tenor', roleIds: ['reader'] },
  { id: 'u4', name: 'Wei Zhang', email: 'wei@example.org', part: 'Bass', roleIds: ['contributor'] },
  { id: 'u5', name: 'Jo Alvarez', email: 'jo@example.org', part: 'Alto', roleIds: [], pending: { via: 'direct sign-up' } },
  { id: 'u6', name: 'Mia Rossi', email: 'mia@example.org', part: 'Soprano', roleIds: [], pending: { via: 'direct sign-up' } }
]);

export type Invite = { id: string; label: string; code: string; roleIds: string[]; expires: string | null; cap: number | null; used: number; revoked: boolean };
export const invites = $state<Invite[]>([
  { id: 'i1', label: 'Autumn intake', code: 'k7Qp2xLm', roleIds: ['reader'], expires: '2026-11-01', cap: 20, used: 6, revoked: false },
  { id: 'i2', label: 'Committee', code: 'hT9wZb41', roleIds: ['editor'], expires: null, cap: 5, used: 2, revoked: false },
  { id: 'i3', label: 'Summer workshop', code: 's3Rn8dYc', roleIds: ['reader'], expires: '2026-06-30', cap: null, used: 14, revoked: false },
  { id: 'i4', label: 'Old committee link', code: 'zP0qLw5e', roleIds: ['contributor'], expires: null, cap: 3, used: 1, revoked: true }
]);

export type InviteStatus = 'active' | 'revoked' | 'expired' | 'used up';
export const inviteStatus = (i: Invite): InviteStatus =>
  i.revoked ? 'revoked' : i.expires && i.expires < TODAY ? 'expired' : i.cap !== null && i.used >= i.cap ? 'used up' : 'active';
export const inviteUrl = (i: Invite) => `prova.example/join/${i.code}`;

let seq = 0;
const nid = (p: string) => `${p}-new${++seq}`;
const code = () => Math.random().toString(36).slice(2, 10);

export const adminCount = () => members.filter((m) => !m.pending && m.roleIds.includes('admin')).length;

export function approveMember(id: string, roleIds: string[]) {
  const m = members.find((x) => x.id === id);
  if (m) {
    m.roleIds = roleIds;
    delete m.pending;
  }
}
export function declineMember(id: string) {
  const i = members.findIndex((x) => x.id === id);
  if (i >= 0) members.splice(i, 1);
}
export function removeMember(id: string) {
  const i = members.findIndex((x) => x.id === id);
  if (i >= 0) members.splice(i, 1);
}
export function setMemberRoles(id: string, roleIds: string[]) {
  const m = members.find((x) => x.id === id);
  if (m) m.roleIds = roleIds;
}

export function saveRole(id: string | null, name: string, permissions: Permission[]) {
  if (id) {
    const r = roles.find((x) => x.id === id);
    if (r) Object.assign(r, { name, permissions });
  } else roles.push({ id: nid('role'), name, permissions });
}
export function deleteRole(id: string) {
  const i = roles.findIndex((r) => r.id === id);
  if (i < 0) return;
  roles.splice(i, 1);
  members.forEach((m) => (m.roleIds = m.roleIds.filter((r) => r !== id)));
  invites.forEach((v) => (v.roleIds = v.roleIds.filter((r) => r !== id)));
}
export const membersWithRole = (id: string) => members.filter((m) => m.roleIds.includes(id)).length;

export function createInvite(label: string, roleIds: string[], expiresInDays: number | null, cap: number | null) {
  const expires = expiresInDays === null ? null : new Date(new Date(TODAY).getTime() + expiresInDays * 86_400_000).toISOString().slice(0, 10);
  invites.unshift({ id: nid('i'), label, code: code(), roleIds, expires, cap, used: 0, revoked: false });
}
export function revokeInvite(id: string) {
  const i = invites.find((x) => x.id === id);
  if (i) i.revoked = true;
}

export const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;
export type { Role };
