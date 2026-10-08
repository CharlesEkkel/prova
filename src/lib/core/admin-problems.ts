// Why an admin change was not made, and what the screens say about it.

export type AdminProblem = 'not-allowed' | 'name-taken' | 'invalid' | 'failed';

export const adminProblemMessages: Readonly<Record<AdminProblem, string>> = {
  'not-allowed': 'You do not have permission to do that.',
  'name-taken': 'A Role with that name already exists.',
  invalid: 'That change is not valid. Check the details and try again.',
  failed: 'That did not work. Try again in a moment.',
};
