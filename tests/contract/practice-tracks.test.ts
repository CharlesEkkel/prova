// Backend contract seam: who may upload, play, rename and delete Practice Tracks, what the bucket
// refuses, and that an upload can never replace or remove a file.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  defaultUploadLimitMiB,
  trackFilePath,
  trackLabelMaxLength,
  uploadLimitBytes,
} from '../../src/lib/core/practice-tracks';
import { bytesOfSize, silentMp3 } from '../audio-fixtures';
import {
  grantRole,
  serviceClient,
  signInNewAdmin,
  signInNewSinger,
  type TestSinger,
} from './support';

const bucket = 'practice-tracks';

/** Every Piece a test adds (its tracks go with it) and every file it stores, removed at the end. */
const pieces: string[] = [];
const files: string[] = [];
const voiceParts: string[] = [];

afterAll(async () => {
  const admin = serviceClient();
  await admin.storage.from(bucket).remove(files);
  await admin.from('pieces').delete().in('id', pieces);
  // After the Pieces, whose tracks keep a Voice Part from being deleted.
  await admin.from('voice_parts').delete().in('id', voiceParts);
});

const unique = (): string => randomUUID().slice(0, 8);

const singerHolding = async (...held: Parameters<typeof grantRole>[1][number][]) => {
  const singer = await signInNewSinger();
  if (held.length > 0) await grantRole(singer, held);
  return singer;
};

const newPiece = async (): Promise<string> => {
  const { data, error } = await serviceClient()
    .from('pieces')
    .insert({ title: `Piece ${unique()}`, composer: 'Anon' })
    .select('id')
    .single();
  if (error) throw error;
  pieces.push(data.id);
  return data.id;
};

let altoId = '';
let bassId = '';

beforeAll(async () => {
  const { data, error } = await serviceClient().from('voice_parts').select('id, name');
  if (error) throw error;
  altoId = data.find(({ name }) => name === 'Alto')?.id ?? '';
  bassId = data.find(({ name }) => name === 'Bass')?.id ?? '';
});

const mp3 = 'audio/mpeg';

/** Uploads the way the app does: a signed upload address first, then the bytes to it. */
const uploadAs = async (
  singer: Pick<TestSinger, 'client'>,
  piece: string,
  body: Uint8Array = silentMp3(1),
  contentType = mp3,
  extension = 'mp3',
) => {
  const path = trackFilePath(piece, randomUUID(), extension);
  const ticket = await singer.client.storage.from(bucket).createSignedUploadUrl(path);
  if (ticket.error) return { path, error: ticket.error };
  files.push(path);
  const sent = await singer.client.storage
    .from(bucket)
    .uploadToSignedUrl(path, ticket.data.token, body, { contentType });
  return { path, error: sent.error };
};

const registerAs = (
  singer: Pick<TestSinger, 'client'>,
  piece: string,
  path: string,
  extra: {
    readonly part?: string;
    readonly kind?: 'part-only' | 'part-predominant';
    readonly label?: string;
    readonly seconds?: number;
  } = {},
) =>
  singer.client.rpc('add_practice_track', {
    target_piece: piece,
    file_path: path,
    track_label: extra.label ?? '',
    ...(extra.part === undefined ? {} : { part: extra.part }),
    ...(extra.kind === undefined ? {} : { track_kind: extra.kind }),
    ...(extra.seconds === undefined ? {} : { track_seconds: extra.seconds }),
  });

/** A track added by a Singer with `append`, ready to be renamed, deleted or played. */
const existingTrack = async (piece: string) => {
  const adder = await singerHolding('read', 'append');
  const { path, error } = await uploadAs(adder, piece);
  if (error) throw error;
  const added = await registerAs(adder, piece, path);
  if (added.error) throw added.error;
  return { id: added.data, path };
};

const stored = async (id: string) =>
  (
    await serviceClient()
      .from('practice_tracks')
      .select('label, kind, voice_part_id, object_path, duration_seconds')
      .eq('id', id)
      .maybeSingle()
  ).data;

describe('uploading a Practice Track', () => {
  it('lets a Singer with append add a Combined Track and a part track, and a Singer with read play them', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');
    const reader = await singerHolding('read');

    const combined = await uploadAs(adder, piece);
    const part = await uploadAs(adder, piece);
    const addedCombined = await registerAs(adder, piece, combined.path, {
      label: '  Full   choir ',
      seconds: 61,
    });
    const addedPart = await registerAs(adder, piece, part.path, {
      part: altoId,
      kind: 'part-predominant',
      label: 'slow tempo',
    });

    expect(addedCombined.error).toBeNull();
    expect(addedPart.error).toBeNull();
    expect(await stored(addedCombined.data ?? '')).toEqual({
      label: 'Full choir',
      kind: null,
      voice_part_id: null,
      object_path: combined.path,
      duration_seconds: 61,
    });
    expect(await stored(addedPart.data ?? '')).toMatchObject({
      kind: 'part-predominant',
      voice_part_id: altoId,
    });

    const listed = await reader.client
      .from('practice_tracks')
      .select('id')
      .eq('piece_id', piece)
      .order('created_at');
    expect((listed.data ?? []).map(({ id }) => id)).toEqual([addedCombined.data, addedPart.data]);

    const link = await reader.client.storage.from(bucket).createSignedUrl(combined.path, 60);
    expect(link.error).toBeNull();
    const response = await fetch(link.data?.signedUrl ?? '', { headers: { range: 'bytes=0-9' } });
    expect(response.status).toBe(206);
    expect((await response.arrayBuffer()).byteLength).toBe(10);
  });

  it('counts the Practice Tracks in the Repertoire', async () => {
    const piece = await newPiece();
    const reader = await singerHolding('read');
    await existingTrack(piece);
    await existingTrack(piece);

    const { data } = await reader.client.rpc('repertoire', { only_piece: piece });

    expect(data?.[0]?.practice_tracks).toBe(2);
  });

  it('accepts M4A', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');

    const { error } = await uploadAs(adder, piece, silentMp3(1), 'audio/mp4', 'm4a');

    expect(error).toBeNull();
  });

  it.each([
    ['read, update and delete', ['read', 'update', 'delete'] as const],
    ['nothing at all', [] as const],
  ])('refuses a Singer holding %s', async (_held, held) => {
    const piece = await newPiece();
    const singer = await singerHolding(...held);

    const { error } = await uploadAs(singer, piece);

    expect(error).not.toBeNull();
  });

  it('refuses a wrong type at the bucket, however it is named', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');

    expect((await uploadAs(adder, piece, silentMp3(1), 'audio/wav')).error).not.toBeNull();
    expect((await uploadAs(adder, piece, silentMp3(1), 'application/pdf')).error).not.toBeNull();
    expect((await uploadAs(adder, piece, silentMp3(1), 'text/plain')).error).not.toBeNull();
  });

  it('takes a file of exactly the limit and refuses one byte more', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');
    const limit = uploadLimitBytes(defaultUploadLimitMiB);

    const atLimit = await uploadAs(adder, piece, bytesOfSize(limit));
    const over = await uploadAs(adder, piece, bytesOfSize(limit + 1));

    expect(atLimit.error).toBeNull();
    expect(over.error).not.toBeNull();
  });

  it('refuses a file path the app did not choose', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');

    for (const path of [`${piece}/notes.mp3`, `${piece}/${randomUUID()}.wav`, 'loose.mp3']) {
      const { error } = await adder.client.storage
        .from(bucket)
        .upload(path, silentMp3(1), { contentType: mp3 });
      expect(error).not.toBeNull();
    }
  });
});

describe('registering an upload', () => {
  it('needs append', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');
    const other = await singerHolding('read', 'update', 'delete');
    const { path } = await uploadAs(adder, piece);

    expect((await registerAs(other, piece, path)).error?.code).toBe('42501');
  });

  it('refuses a part track without a kind, and a Combined Track with one', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');
    const part = await uploadAs(adder, piece);
    const combined = await uploadAs(adder, piece);

    const noKind = await registerAs(adder, piece, part.path, { part: altoId });
    const kindOnCombined = await registerAs(adder, piece, combined.path, { kind: 'part-only' });

    expect([noKind.error?.code, noKind.error?.hint]).toEqual(['22023', 'kind']);
    expect([kindOnCombined.error?.code, kindOnCombined.error?.hint]).toEqual(['22023', 'kind']);
  });

  it('refuses an unknown Voice Part, and a label over its limit', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');
    const first = await uploadAs(adder, piece);
    const second = await uploadAs(adder, piece);

    const unknown = await registerAs(adder, piece, first.path, {
      part: randomUUID(),
      kind: 'part-only',
    });
    const long = await registerAs(adder, piece, second.path, {
      label: 'x'.repeat(trackLabelMaxLength + 1),
    });
    const atLimit = await registerAs(adder, piece, second.path, {
      label: 'x'.repeat(trackLabelMaxLength),
    });

    expect(unknown.error?.hint).toBe('voice-part');
    expect(long.error?.hint).toBe('label');
    expect(atLimit.error).toBeNull();
  });

  it('refuses a file that was never uploaded, another Piece’s file, someone else’s file and a file used twice', async () => {
    const piece = await newPiece();
    const elsewhere = await newPiece();
    const adder = await singerHolding('read', 'append');
    const stranger = await singerHolding('read', 'append');
    const mine = await uploadAs(adder, piece);
    const theirs = await uploadAs(stranger, piece);

    const never = await registerAs(adder, piece, trackFilePath(piece, randomUUID(), 'mp3'));
    const wrongPiece = await registerAs(adder, elsewhere, mine.path);
    const notMine = await registerAs(adder, piece, theirs.path);
    const first = await registerAs(adder, piece, mine.path);
    const again = await registerAs(adder, piece, mine.path);

    expect(never.error?.hint).toBe('file');
    expect(wrongPiece.error?.hint).toBe('file');
    expect(notMine.error?.hint).toBe('file');
    expect(first.error).toBeNull();
    expect(again.error?.code).toBe('23505');
  });

  it('says so when the Piece is gone', async () => {
    const adder = await singerHolding('read', 'append');

    const { error } = await registerAs(adder, randomUUID(), `${randomUUID()}/${randomUUID()}.mp3`);

    expect(error?.code).toBe('P0002');
  });
});

describe('append-only uploads', () => {
  it('lets append neither overwrite nor remove a file, nor change a track', async () => {
    const piece = await newPiece();
    const { id, path } = await existingTrack(piece);
    const adder = await singerHolding('read', 'append');
    const before = await stored(id);

    const overwrite = await adder.client.storage
      .from(bucket)
      .upload(path, silentMp3(2), { contentType: mp3, upsert: true });
    const replace = await adder.client.storage
      .from(bucket)
      .update(path, silentMp3(2), { contentType: mp3 });
    const remove = await adder.client.storage.from(bucket).remove([path]);
    const rename = await adder.client.rpc('rename_practice_track', {
      target: id,
      track_label: 'x',
    });
    const removeRow = await adder.client.rpc('delete_practice_track', { target: id });
    await adder.client.from('practice_tracks').update({ label: 'x' }).eq('id', id);
    await adder.client.from('practice_tracks').delete().eq('id', id);

    expect(overwrite.error).not.toBeNull();
    expect(replace.error).not.toBeNull();
    expect(remove.data ?? []).toEqual([]);
    expect(rename.error?.code).toBe('42501');
    expect(removeRow.error?.code).toBe('42501');
    expect(await stored(id)).toEqual(before);
    const bytes = await serviceClient().storage.from(bucket).download(path);
    expect((await bytes.data?.arrayBuffer())?.byteLength).toBe(silentMp3(1).byteLength);
  });

  it('lets update rename a label but never replace a file', async () => {
    const piece = await newPiece();
    const { id, path } = await existingTrack(piece);
    const editor = await singerHolding('read', 'update');

    const rename = await editor.client.rpc('rename_practice_track', {
      target: id,
      track_label: '  Rehearsal   3 ',
    });
    const overwrite = await editor.client.storage
      .from(bucket)
      .upload(path, silentMp3(2), { contentType: mp3, upsert: true });
    const replace = await editor.client.storage
      .from(bucket)
      .update(path, silentMp3(2), { contentType: mp3 });
    const tooLong = await editor.client.rpc('rename_practice_track', {
      target: id,
      track_label: 'x'.repeat(trackLabelMaxLength + 1),
    });

    expect(rename.error).toBeNull();
    expect((await stored(id))?.label).toBe('Rehearsal 3');
    expect((await stored(id))?.object_path).toBe(path);
    expect(overwrite.error).not.toBeNull();
    expect(replace.error).not.toBeNull();
    expect(tooLong.error?.hint).toBe('label');
  });

  it('says so when renaming a track that is gone', async () => {
    const editor = await singerHolding('read', 'update');

    const { error } = await editor.client.rpc('rename_practice_track', {
      target: randomUUID(),
      track_label: 'x',
    });

    expect(error?.code).toBe('P0002');
  });
});

describe('reading Practice Tracks', () => {
  it('shows a Singer without read neither the tracks nor the files', async () => {
    const piece = await newPiece();
    const { id, path } = await existingTrack(piece);
    const pending = await singerHolding();

    const listed = await pending.client.from('practice_tracks').select('id').eq('id', id);
    const link = await pending.client.storage.from(bucket).createSignedUrl(path, 60);
    const download = await pending.client.storage.from(bucket).download(path);

    expect(listed.data).toEqual([]);
    expect(link.error).not.toBeNull();
    expect(download.error).not.toBeNull();
  });

  it('keeps the bucket private: a file has no public address', async () => {
    const piece = await newPiece();
    const { path } = await existingTrack(piece);
    const reader = await singerHolding('read');
    const { data } = reader.client.storage.from(bucket).getPublicUrl(path);

    const response = await fetch(data.publicUrl);

    expect(response.ok).toBe(false);
  });
});

describe('deleting a Practice Track', () => {
  it('lets a Singer with delete remove the row and then the file', async () => {
    const piece = await newPiece();
    const { id, path } = await existingTrack(piece);
    const remover = await singerHolding('read', 'delete');

    const row = await remover.client.rpc('delete_practice_track', { target: id });
    const file = await remover.client.storage.from(bucket).remove([path]);

    expect(row.error).toBeNull();
    expect(row.data).toBe(path);
    expect(await stored(id)).toBeNull();
    expect(file.data?.map(({ name }) => name)).toEqual([path]);
    expect((await serviceClient().storage.from(bucket).download(path)).error).not.toBeNull();
  });

  it.each([
    ['read, append and update', ['read', 'append', 'update'] as const],
    ['nothing at all', [] as const],
  ])('refuses a Singer holding %s', async (_held, held) => {
    const piece = await newPiece();
    const { id } = await existingTrack(piece);
    const singer = await singerHolding(...held);

    const { error } = await singer.client.rpc('delete_practice_track', { target: id });

    expect(error?.code).toBe('42501');
    expect(await stored(id)).not.toBeNull();
  });

  it('says so when the track is gone', async () => {
    const remover = await singerHolding('read', 'delete');

    const { error } = await remover.client.rpc('delete_practice_track', { target: randomUUID() });

    expect(error?.code).toBe('P0002');
  });

  it('goes with its Piece', async () => {
    const piece = await newPiece();
    const { id } = await existingTrack(piece);
    const remover = await singerHolding('read', 'delete');

    await remover.client.rpc('delete_piece', { target: piece });

    expect(await stored(id)).toBeNull();
  });
});

describe('Voice Parts with Practice Tracks', () => {
  it('cannot be removed while a track is for them', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');
    const admin = await signInNewAdmin();
    const { data: added } = await admin.client.rpc('admin_add_voice_part', {
      part_name: `Descant ${unique()}`,
      part_label: unique().slice(0, 3),
    });
    if (added !== null) voiceParts.push(added);
    const upload = await uploadAs(adder, piece);
    await registerAs(adder, piece, upload.path, { part: added ?? '', kind: 'part-only' });

    const refused = await admin.client.rpc('admin_remove_voice_part', { target: added ?? '' });

    expect([refused.error?.code, refused.error?.hint]).toEqual(['22023', 'has-tracks']);
    expect(bassId).not.toBe('');
  });
});
