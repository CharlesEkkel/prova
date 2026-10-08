// Backend contract seam: Owners are derived live from the configured owner emails.
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  addOwnerEmail,
  adminRoleId,
  anonClient,
  rolesHeldBy,
  serviceClient,
  signInNewSinger,
} from './support';

const allSix = ['append', 'delete', 'manage-admins', 'manage-users', 'read', 'update'];
const adminSet = ['append', 'delete', 'manage-users', 'read', 'update'];

const permissionsOf = async (singer: Awaited<ReturnType<typeof signInNewSinger>>) =>
  (await singer.client.rpc('my_permissions')).data?.toSorted();

describe('an Owner', () => {
  it('holds every Permission while their verified email is an owner email', async () => {
    const owner = await signInNewSinger();
    await addOwnerEmail(owner.email);

    expect(await permissionsOf(owner)).toEqual(allSix);
  });

  it('matches the owner email ignoring case', async () => {
    const owner = await signInNewSinger({ email: `Mixed-${randomUUID()}@Example.test` });
    await addOwnerEmail(owner.email.toUpperCase());

    expect(await permissionsOf(owner)).toEqual(allSix);
  });

  it('is not an Owner when Google did not verify the email', async () => {
    const unverified = await signInNewSinger({ emailVerified: false });
    await addOwnerEmail(unverified.email);

    expect(await permissionsOf(unverified)).toEqual([]);
  });

  it('is demoted to Admin when their email is removed, on the next request', async () => {
    const owner = await signInNewSinger();
    const remove = await addOwnerEmail(owner.email);
    expect(await permissionsOf(owner)).toEqual(allSix);

    await remove();

    expect(await permissionsOf(owner)).toEqual(adminSet);
    expect(await rolesHeldBy(owner)).toEqual([await adminRoleId()]);
  });

  it('takes effect at once when the email is added for a Singer who already exists', async () => {
    const singer = await signInNewSinger();
    expect(await permissionsOf(singer)).toEqual([]);

    await addOwnerEmail(singer.email);

    expect(await permissionsOf(singer)).toEqual(allSix);
  });

  it('supports more than one owner email', async () => {
    const [first, second] = await Promise.all([signInNewSinger(), signInNewSinger()]);
    await addOwnerEmail(first.email);
    await addOwnerEmail(second.email);

    expect([await permissionsOf(first), await permissionsOf(second)]).toEqual([allSix, allSix]);
  });

  it('is given Admin at first sign-in when their email is already an owner email', async () => {
    const email = `early-${randomUUID()}@example.test`;
    await addOwnerEmail(email);

    const owner = await signInNewSinger({ email });

    expect(await rolesHeldBy(owner)).toEqual([await adminRoleId()]);
  });
});

describe('set_owner_emails', () => {
  const currentEmails = async (): Promise<readonly string[]> => {
    const { data } = await serviceClient().from('owner_emails').select('email');
    return (data ?? []).map(({ email }) => email);
  };

  it('replaces the list, is safe to repeat, and keeps the Admin Role of a removed Owner', async () => {
    const owner = await signInNewSinger();
    const others = await currentEmails();
    const setList = (emails: readonly string[]) =>
      serviceClient().rpc('set_owner_emails', { emails: [...emails] });

    expect(
      (await setList([...others, owner.email.toUpperCase(), ` ${owner.email} `])).error,
    ).toBeNull();
    expect((await setList([...others, owner.email])).error).toBeNull();
    expect(await currentEmails()).toContain(owner.email);
    expect(await permissionsOf(owner)).toEqual(allSix);
    expect((await currentEmails()).filter((email) => email === owner.email)).toHaveLength(1);

    expect((await setList(others)).error).toBeNull();
    expect(await currentEmails()).not.toContain(owner.email);
    expect(await permissionsOf(owner)).toEqual(adminSet);
  });

  it('cannot be called by a signed-in Singer or a visitor', async () => {
    const singer = await signInNewSinger();

    const asSinger = await singer.client.rpc('set_owner_emails', { emails: [singer.email] });
    const asVisitor = await anonClient().rpc('set_owner_emails', { emails: [singer.email] });

    expect([asSinger.error, asVisitor.error]).not.toContain(null);
    expect(await permissionsOf(singer)).toEqual([]);
  });

  it('cannot be bypassed by writing the owner emails through the API', async () => {
    const singer = await signInNewSinger();

    const { error } = await singer.client.from('owner_emails').insert({ email: singer.email });

    expect(error).not.toBeNull();
    expect(await permissionsOf(singer)).toEqual([]);
  });
});
