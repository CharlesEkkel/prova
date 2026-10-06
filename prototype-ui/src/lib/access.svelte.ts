// PROTOTYPE: Roles and Permissions (see CONTEXT.md). `access.viewAs` lets the prototype preview the UI as a
// given Role; real Singers hold several Roles and the Permissions are the union.
export type Permission = 'read' | 'append' | 'update' | 'delete' | 'manage-users';

export const PERMISSIONS: { key: Permission; label: string; hint: string }[] = [
  { key: 'read', label: 'Read', hint: 'Listen to Practice Tracks and view Scores' },
  { key: 'append', label: 'Append', hint: 'Add new Pieces, Practice Tracks and Scores. Never alters existing ones' },
  { key: 'update', label: 'Update', hint: 'Edit names, labels and Performance tags only' },
  { key: 'delete', label: 'Delete', hint: 'Remove Pieces, Practice Tracks, Scores and Performances' },
  { key: 'manage-users', label: 'Manage users', hint: 'Approve sign-ups, assign Roles, create Invite Links' }
];

export type Role = { id: string; name: string; permissions: Permission[]; locked?: boolean };

export const roles = $state<Role[]>([
  { id: 'admin', name: 'Admin', permissions: ['read', 'append', 'update', 'delete', 'manage-users'], locked: true },
  { id: 'editor', name: 'Editor', permissions: ['read', 'append', 'update'] },
  { id: 'contributor', name: 'Contributor', permissions: ['read', 'append'] },
  { id: 'reader', name: 'Reader', permissions: ['read'] }
]);

export const access = $state({ viewAs: 'admin' });

export const permissionsOf = (roleIds: string[]): Permission[] => [...new Set(roles.filter((r) => roleIds.includes(r.id)).flatMap((r) => r.permissions))];
export const can = (p: Permission) => permissionsOf([access.viewAs]).includes(p);
/** an Invite Link may never grant `delete` or `manage-users`, so Roles holding either cannot be put on one */
export const grantableByLink = (r: Role) => !r.permissions.includes('delete') && !r.permissions.includes('manage-users');
