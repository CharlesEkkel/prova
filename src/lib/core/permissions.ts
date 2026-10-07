// The Permissions a Role can grant. See Access in CONTEXT.md.
export const permissions = ['read', 'append', 'update', 'delete', 'manage-users'] as const;
export type Permission = (typeof permissions)[number];
