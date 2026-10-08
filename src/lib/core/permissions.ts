// The Permissions a Role can grant. See Access in CONTEXT.md.
export const permissions = [
  'read',
  'append',
  'update',
  'delete',
  'manage-users',
  'manage-admins',
] as const;
export type Permission = (typeof permissions)[number];

/** How each Permission is named on screen. The names in `CONTEXT.md` are the keys. */
export const permissionLabels: Readonly<Record<Permission, string>> = {
  read: 'Read',
  append: 'Append',
  update: 'Update',
  delete: 'Delete',
  'manage-users': 'Manage users',
  'manage-admins': 'Manage admins',
};

/** What each Permission lets a Singer do, as shown beside it in the admin portal. */
export const permissionDescriptions: Readonly<Record<Permission, string>> = {
  read: 'See and play Pieces, Practice Tracks, Scores and Performances. Without it a Singer stays Pending.',
  append:
    'Add new Pieces, Practice Tracks, Scores and Performances, but never alter existing ones.',
  update: 'Edit names, labels and Performance tags, and reorder a Performance’s Pieces.',
  delete: 'Delete Pieces, Practice Tracks, Scores and Performances.',
  'manage-users':
    'Run the admin portal: approve Singers, manage Roles, remove Singers and set the Colour Theme.',
  'manage-admins': 'Grant or revoke manage-users, and manage Singers who hold it. Owners only.',
};

/** The Permissions a custom Role can be built from: never manage-admins, which only Owners hold. */
export const rolePermissions: readonly Permission[] = permissions.filter(
  (permission) => permission !== 'manage-admins',
);
