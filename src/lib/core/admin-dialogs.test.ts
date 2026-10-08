import { describe, expect, it } from 'vitest';
import { roleDialogCopy, singerCountLabel, singerDialogCopy } from './admin-dialogs';

describe('singerCountLabel', () => {
  it('counts Singers with the right plural', () => {
    expect(['0', '1', '2'].map((n) => singerCountLabel(Number(n)))).toEqual([
      '0 Singers',
      '1 Singer',
      '2 Singers',
    ]);
  });
});

describe('singerDialogCopy', () => {
  it('names the Singer in each confirmation and offers the right action', () => {
    expect(singerDialogCopy('approve', 'Ada')).toMatchObject({
      title: 'Approve Ada',
      submit: 'Approve',
    });
    expect(singerDialogCopy('edit-roles', 'Ada')).toMatchObject({
      title: 'Roles for Ada',
      submit: 'Save Roles',
    });
    expect(singerDialogCopy('remove', 'Ada')).toMatchObject({
      title: 'Remove Ada?',
      submit: 'Remove',
    });
    expect(singerDialogCopy('decline', 'Ada')).toMatchObject({
      title: 'Decline this sign-up?',
      submit: 'Decline',
    });
  });

  it('says what removing and declining lose, and that signing in again starts fresh', () => {
    expect(singerDialogCopy('remove', 'Ada').description).toMatch(/sign in again.*Pending Singer/);
    expect(singerDialogCopy('decline', 'Ada').description).toMatch(/Ada loses their sign-in/);
  });
});

describe('roleDialogCopy', () => {
  it('titles each Role dialog and names the action', () => {
    expect(roleDialogCopy('new', 'Choir', 0)).toMatchObject({
      title: 'New Role',
      submit: 'Create Role',
    });
    expect(roleDialogCopy('edit', 'Choir', 2)).toMatchObject({
      title: 'Edit Choir',
      submit: 'Save Role',
    });
    expect(roleDialogCopy('delete', 'Choir', 2)).toMatchObject({
      title: 'Delete the Choir Role?',
      submit: 'Delete Role',
    });
  });

  it('warns how many Singers a deletion affects', () => {
    expect(roleDialogCopy('delete', 'Choir', 1).description).toMatch(/^1 Singer will lose/);
    expect(roleDialogCopy('delete', 'Choir', 0).description).toMatch(/^0 Singers will lose/);
  });
});
