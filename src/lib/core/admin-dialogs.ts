// What the admin portal's dialogs say: their titles, explanations and action buttons.

export type SingerDialogKind = 'approve' | 'edit-roles' | 'remove' | 'decline';
export type RoleDialogKind = 'new' | 'edit' | 'delete';
export type VoicePartDialogKind = 'new' | 'edit' | 'remove';

export type DialogCopy = {
  readonly title: string;
  readonly description: string;
  readonly submit: string;
};

export const singerCountLabel = (count: number): string =>
  count === 1 ? '1 Singer' : `${count.toString()} Singers`;

const rolesExplanation = 'A Singer holds every Permission from every Role they have.';

/** The wording for a dialog about one Singer. */
export const singerDialogCopy = (kind: SingerDialogKind, name: string): DialogCopy => {
  switch (kind) {
    case 'approve':
      return {
        title: `Approve ${name}`,
        description: `Pick their Roles to let them in. ${rolesExplanation}`,
        submit: 'Approve',
      };
    case 'edit-roles':
      return { title: `Roles for ${name}`, description: rolesExplanation, submit: 'Save Roles' };
    case 'decline':
      return {
        title: 'Decline this sign-up?',
        description: `${name} loses their sign-in. If they sign in again they will be waiting for approval afresh.`,
        submit: 'Decline',
      };
    case 'remove':
      return {
        title: `Remove ${name}?`,
        description:
          'They lose access straight away and their sign-in is deleted. If they sign in again they start as a Pending Singer.',
        submit: 'Remove',
      };
  }
};

/** The wording for a dialog about a Role; `holders` is how many Singers hold it. */
export const roleDialogCopy = (kind: RoleDialogKind, name: string, holders: number): DialogCopy => {
  switch (kind) {
    case 'new':
      return {
        title: 'New Role',
        description: 'Pick the Permissions this Role grants.',
        submit: 'Create Role',
      };
    case 'edit':
      return {
        title: `Edit ${name}`,
        description: 'Pick the Permissions this Role grants.',
        submit: 'Save Role',
      };
    case 'delete':
      return {
        title: `Delete the ${name} Role?`,
        description: `${singerCountLabel(holders)} will lose this Role. Permissions from their other Roles are kept. This cannot be undone.`,
        submit: 'Delete Role',
      };
  }
};

/** The wording for a dialog about a Voice Part; `singers` is how many have it as their default. */
export const voicePartDialogCopy = (
  kind: VoicePartDialogKind,
  name: string,
  singers: number,
): DialogCopy => {
  switch (kind) {
    case 'new':
      return {
        title: 'New Voice Part',
        description:
          'The short label is what fits on small screens, such as A1 for Alto 1. Change the suggestion if it clashes.',
        submit: 'Add Voice Part',
      };
    case 'edit':
      return {
        title: `Edit ${name}`,
        description:
          'Renaming a Voice Part does not change its short label. The short label is unique in the choir, and All is kept for the Combined Track.',
        submit: 'Save Voice Part',
      };
    case 'remove':
      return {
        title: `Remove ${name}?`,
        description:
          singers === 0
            ? 'No Singer has this as their default.'
            : `${singers === 1 ? '1 Singer has' : `${singers.toString()} Singers have`} this as their default and will be asked to choose again.`,
        submit: 'Remove Voice Part',
      };
  }
};
