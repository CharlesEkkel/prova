// Backend contract seam, run on its own: scripts/apply-upload-limit.mjs sets the bucket's size limit
// from PUBLIC_UPLOAD_LIMIT_MIB. It changes the one bucket every Practice Track test uploads to, so
// this file runs after the others and puts the limit back to the default when it is done.
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';
import {
  defaultUploadLimitMiB,
  trackFilePath,
  uploadLimitBytes,
} from '../../src/lib/core/upload-rules';
import { bytesOfSize } from '../audio-fixtures';
import {
  grantRole,
  serviceClient,
  signInNewSinger,
  serviceRoleKey,
  url,
} from '../contract/support';

const run = promisify(execFile);
const bucket = 'practice-tracks';

const applyLimit = (limit: string) =>
  run('node', ['scripts/apply-upload-limit.mjs'], {
    env: {
      ...process.env,
      PUBLIC_SUPABASE_URL: url,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      PUBLIC_UPLOAD_LIMIT_MIB: limit,
    },
  });

const bucketNow = async () => {
  const { data, error } = await serviceClient().storage.getBucket(bucket);
  if (error) throw error;
  return data;
};

const pieces: string[] = [];
const files: string[] = [];

afterAll(async () => {
  await applyLimit(defaultUploadLimitMiB.toString());
  await serviceClient().storage.from(bucket).remove(files);
  await serviceClient().from('pieces').delete().in('id', pieces);
});

describe('the upload limit', () => {
  it('is set on the bucket from the deployment setting, and the types stay as the migration made them', async () => {
    const types = (await bucketNow()).allowed_mime_types;
    expect(types).toEqual(['audio/mpeg', 'audio/mp4']);

    await applyLimit('3');

    const bucketAfter = await bucketNow();
    expect(bucketAfter.file_size_limit).toBe(uploadLimitBytes(3));
    expect(bucketAfter.allowed_mime_types).toEqual(types);
    expect(bucketAfter.public).toBe(false);
  });

  it('is enforced by the bucket at the new size', async () => {
    const piece = await serviceClient()
      .from('pieces')
      .insert({ title: `Limit ${randomUUID().slice(0, 8)}`, composer: 'Anon' })
      .select('id')
      .single();
    if (piece.error) throw piece.error;
    pieces.push(piece.data.id);
    const singer = await signInNewSinger();
    await grantRole(singer, ['read', 'append']);
    await applyLimit('3');

    const upload = async (size: number) => {
      const path = trackFilePath(piece.data.id, randomUUID(), 'mp3');
      files.push(path);
      const ticket = await singer.client.storage.from(bucket).createSignedUploadUrl(path);
      if (ticket.error) throw ticket.error;
      return singer.client.storage
        .from(bucket)
        .uploadToSignedUrl(path, ticket.data.token, bytesOfSize(size), {
          contentType: 'audio/mpeg',
        });
    };

    expect((await upload(uploadLimitBytes(3))).error).toBeNull();
    expect((await upload(uploadLimitBytes(3) + 1)).error).not.toBeNull();
  });

  it('refuses a setting that is not a whole number of MiB, and changes nothing', async () => {
    await applyLimit('3');

    for (const bad of ['0', '-2', '2.5', 'ten']) {
      await expect(applyLimit(bad)).rejects.toThrow();
    }
    expect((await bucketNow()).file_size_limit).toBe(uploadLimitBytes(3));
  });

  it('uses 10 MiB when there is no setting', async () => {
    await applyLimit('3');

    await applyLimit('');

    expect((await bucketNow()).file_size_limit).toBe(uploadLimitBytes(defaultUploadLimitMiB));
  });
});
