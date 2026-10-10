// Backend contract seam: who may upload, read, rename, promote and delete Scores, what the bucket
// refuses, the one-choir-score rule, and that an upload can never replace or remove a file.
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { scoreLabelMaxLength } from '../../src/lib/core/scores';
import {
  defaultScoreUploadLimitMiB,
  defaultUploadLimitMiB,
  scoreFilePath,
  trackFilePath,
  uploadLimitBytes,
  uploadProblemOfResponse,
} from '../../src/lib/core/upload-rules';
import { pdfOfSize, samplePdf } from '../pdf-fixtures';
import { silentMp3 } from '../audio-fixtures';
import { grantRole, serviceClient, signInNewSinger, anonKey, type TestSinger } from './support';

const bucket = 'scores';
const pdf = 'application/pdf';

/** Every Piece a test adds (its Scores go with it) and every file it stores, removed at the end. */
const pieces: string[] = [];
const files: string[] = [];

afterAll(async () => {
  const admin = serviceClient();
  await admin.storage.from(bucket).remove(files);
  await admin.from('pieces').delete().in('id', pieces);
});

const singerHolding = async (...held: Parameters<typeof grantRole>[1][number][]) => {
  const singer = await signInNewSinger();
  if (held.length > 0) await grantRole(singer, held);
  return singer;
};

const newPiece = async (): Promise<string> => {
  const { data, error } = await serviceClient()
    .from('pieces')
    .insert({ title: `Piece ${randomUUID().slice(0, 8)}`, composer: 'Anon' })
    .select('id')
    .single();
  if (error) throw error;
  pieces.push(data.id);
  return data.id;
};

/** Uploads the way the app does: a signed upload address first, then the bytes to it. */
const uploadAs = async (
  singer: Pick<TestSinger, 'client'>,
  piece: string,
  body: Uint8Array = samplePdf(1),
  contentType = pdf,
) => {
  const path = scoreFilePath(piece, randomUUID());
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
  label = 'Full score',
  makeChoir?: boolean,
) =>
  singer.client.rpc('add_score', {
    target_piece: piece,
    file_path: path,
    score_label: label,
    ...(makeChoir === undefined ? {} : { make_choir: makeChoir }),
  });

/** A Score added by a Singer with `append` and `update`, ready to be renamed, promoted, deleted or read. */
const existingScore = async (piece: string, options: { readonly choir?: boolean } = {}) => {
  const adder = await singerHolding('read', 'append', 'update');
  const { path, error } = await uploadAs(adder, piece);
  if (error) throw error;
  const added = await registerAs(adder, piece, path, 'Full score', options.choir ?? false);
  if (added.error) throw added.error;
  return { id: added.data, path };
};

const stored = async (id: string) =>
  (
    await serviceClient()
      .from('scores')
      .select('label, is_choir_score, object_path, piece_id')
      .eq('id', id)
      .maybeSingle()
  ).data;

const choirScoresOf = async (piece: string): Promise<readonly string[]> => {
  const { data } = await serviceClient()
    .from('scores')
    .select('id')
    .eq('piece_id', piece)
    .eq('is_choir_score', true);
  return (data ?? []).map(({ id }) => id);
};

describe('uploading a Score', () => {
  it('lets a Singer with append add several labelled Scores, and a Singer with read open them', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');
    const reader = await singerHolding('read');

    const full = await uploadAs(adder, piece);
    const piano = await uploadAs(adder, piece);
    const addedFull = await registerAs(adder, piece, full.path, '  Full   score ');
    const addedPiano = await registerAs(adder, piece, piano.path, 'Piano reduction');

    expect(addedFull.error).toBeNull();
    expect(addedPiano.error).toBeNull();
    expect(await stored(addedFull.data ?? '')).toEqual({
      label: 'Full score',
      is_choir_score: false,
      object_path: full.path,
      piece_id: piece,
    });

    const listed = await reader.client
      .from('scores')
      .select('id')
      .eq('piece_id', piece)
      .order('created_at');
    expect((listed.data ?? []).map(({ id }) => id)).toEqual([addedFull.data, addedPiano.data]);

    const link = await reader.client.storage.from(bucket).createSignedUrl(full.path, 60);
    expect(link.error).toBeNull();
    const response = await fetch(link.data?.signedUrl ?? '', { headers: { range: 'bytes=0-4' } });
    expect(response.status).toBe(206);
    expect(new TextDecoder().decode(await response.arrayBuffer())).toBe('%PDF-');
  });

  it('counts the Scores in the Repertoire', async () => {
    const piece = await newPiece();
    const reader = await singerHolding('read');
    await existingScore(piece);
    await existingScore(piece);

    const { data } = await reader.client.rpc('repertoire', { only_piece: piece });

    expect(data?.[0]?.scores).toBe(2);
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

  it('refuses any type but PDF at the bucket, however it is named', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');

    expect((await uploadAs(adder, piece, samplePdf(1), 'audio/mpeg')).error).not.toBeNull();
    expect((await uploadAs(adder, piece, samplePdf(1), 'image/png')).error).not.toBeNull();
    expect((await uploadAs(adder, piece, samplePdf(1), 'text/plain')).error).not.toBeNull();
  });

  it('takes a file of exactly the Score limit and refuses one byte more', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');
    const limit = uploadLimitBytes(defaultScoreUploadLimitMiB);

    const atLimit = await uploadAs(adder, piece, pdfOfSize(limit));
    const over = await uploadAs(adder, piece, pdfOfSize(limit + 1));

    expect(atLimit.error).toBeNull();
    expect(over.error).not.toBeNull();
  });

  it('has a limit of its own: bigger than the audio limit, and audio is still held to its own', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');
    const overAudioLimit = uploadLimitBytes(defaultUploadLimitMiB) + 1;

    const score = await uploadAs(adder, piece, pdfOfSize(overAudioLimit));
    const trackPath = trackFilePath(piece, randomUUID(), 'mp3');
    const ticket = await adder.client.storage
      .from('practice-tracks')
      .createSignedUploadUrl(trackPath);
    const track = await adder.client.storage
      .from('practice-tracks')
      .uploadToSignedUrl(trackPath, ticket.data?.token ?? '', new Uint8Array(overAudioLimit), {
        contentType: 'audio/mpeg',
      });

    expect(score.error).toBeNull();
    expect(track.error).not.toBeNull();
  });

  it('keeps audio out of the Score bucket and PDFs out of the audio bucket', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');
    const trackPath = trackFilePath(piece, randomUUID(), 'mp3');

    const audioAsScore = await uploadAs(adder, piece, silentMp3(1), 'audio/mpeg');
    const ticket = await adder.client.storage
      .from('practice-tracks')
      .createSignedUploadUrl(trackPath);
    const pdfAsTrack = await adder.client.storage
      .from('practice-tracks')
      .uploadToSignedUrl(trackPath, ticket.data?.token ?? '', samplePdf(1), { contentType: pdf });

    expect(audioAsScore.error).not.toBeNull();
    expect(pdfAsTrack.error).not.toBeNull();
  });

  it('refuses a file path the app did not choose', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');

    for (const path of [`${piece}/score.pdf`, `${piece}/${randomUUID()}.mp3`, 'loose.pdf']) {
      const { error } = await adder.client.storage
        .from(bucket)
        .upload(path, samplePdf(1), { contentType: pdf });
      expect(error).not.toBeNull();
    }
  });
});

describe('what the storage service answers to a browser upload', () => {
  /** Sends a file the way the browser does: a multipart PUT to the signed address, by XHR in the app. */
  const sendLikeTheBrowser = async (
    piece: string,
    body: Uint8Array<ArrayBuffer>,
    contentType: string,
  ) => {
    const adder = await singerHolding('read', 'append');
    const path = scoreFilePath(piece, randomUUID());
    const ticket = await adder.client.storage.from(bucket).createSignedUploadUrl(path);
    if (ticket.error) throw ticket.error;
    files.push(path);
    const form = new FormData();
    form.append('cacheControl', '3600');
    form.append('', new Blob([body], { type: contentType }), 'score.pdf');
    return fetch(ticket.data.signedUrl, {
      method: 'PUT',
      headers: { apikey: anonKey, 'x-upsert': 'false' },
      body: form,
    });
  };

  it('is read as "too large" for a file over the limit', async () => {
    const piece = await newPiece();

    const response = await sendLikeTheBrowser(
      piece,
      pdfOfSize(uploadLimitBytes(defaultScoreUploadLimitMiB) + 1),
      pdf,
    );

    expect(response.ok).toBe(false);
    expect(uploadProblemOfResponse(response.status, await response.text())).toBe('too-large');
  });

  it('is read as "wrong type" for a type the bucket does not accept', async () => {
    const piece = await newPiece();

    const response = await sendLikeTheBrowser(piece, samplePdf(1), 'image/png');

    expect(response.ok).toBe(false);
    expect(uploadProblemOfResponse(response.status, await response.text())).toBe('wrong-type');
  });

  it('succeeds for a good file', async () => {
    const piece = await newPiece();

    const response = await sendLikeTheBrowser(piece, samplePdf(2), pdf);

    expect(response.ok).toBe(true);
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

  it('refuses an empty label and a label over its limit, and takes one at the limit', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');
    const first = await uploadAs(adder, piece);
    const second = await uploadAs(adder, piece);

    const empty = await registerAs(adder, piece, first.path, '   ');
    const long = await registerAs(adder, piece, first.path, 'x'.repeat(scoreLabelMaxLength + 1));
    const atLimit = await registerAs(adder, piece, second.path, 'x'.repeat(scoreLabelMaxLength));

    expect([empty.error?.code, empty.error?.hint]).toEqual(['22023', 'label']);
    expect([long.error?.code, long.error?.hint]).toEqual(['22023', 'label']);
    expect(atLimit.error).toBeNull();
  });

  it('refuses a file that was never uploaded, another Piece’s file, someone else’s file and a file used twice', async () => {
    const piece = await newPiece();
    const elsewhere = await newPiece();
    const adder = await singerHolding('read', 'append');
    const stranger = await singerHolding('read', 'append');
    const mine = await uploadAs(adder, piece);
    const theirs = await uploadAs(stranger, piece);

    const never = await registerAs(adder, piece, scoreFilePath(piece, randomUUID()));
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

    const { error } = await registerAs(
      adder,
      randomUUID(),
      scoreFilePath(randomUUID(), randomUUID()),
    );

    expect(error?.code).toBe('P0002');
  });
});

describe('the choir score', () => {
  it('is at most one per Piece, and the database enforces it', async () => {
    const piece = await newPiece();
    await existingScore(piece, { choir: true });
    const first = await choirScoresOf(piece);

    const second = await serviceClient()
      .from('scores')
      .insert({
        piece_id: piece,
        label: 'Another',
        object_path: scoreFilePath(piece, randomUUID()),
        is_choir_score: true,
      });

    expect(first).toHaveLength(1);
    expect(second.error?.code).toBe('23505');
    expect(await choirScoresOf(piece)).toEqual(first);
  });

  it('lets a Singer with append mark the first Score at upload, but not replace one', async () => {
    const piece = await newPiece();
    const adder = await singerHolding('read', 'append');
    const one = await uploadAs(adder, piece);
    const two = await uploadAs(adder, piece);

    const first = await registerAs(adder, piece, one.path, 'Full score', true);
    const replace = await registerAs(adder, piece, two.path, 'Piano', true);
    const plain = await registerAs(adder, piece, two.path, 'Piano', false);

    expect(first.error).toBeNull();
    expect(replace.error?.code).toBe('42501');
    expect(plain.error).toBeNull();
    expect(await choirScoresOf(piece)).toEqual([first.data]);
    expect((await stored(plain.data ?? ''))?.is_choir_score).toBe(false);
  });

  it('lets a Singer with append and update replace the choir score at upload', async () => {
    const piece = await newPiece();
    const before = await existingScore(piece, { choir: true });
    const editor = await singerHolding('read', 'append', 'update');
    const upload = await uploadAs(editor, piece);

    const added = await registerAs(editor, piece, upload.path, 'New edition', true);

    expect(added.error).toBeNull();
    expect(await choirScoresOf(piece)).toEqual([added.data]);
    expect((await stored(before.id))?.is_choir_score).toBe(false);
  });

  it('can be chosen afterwards by a Singer with update, replacing the current one', async () => {
    const piece = await newPiece();
    const current = await existingScore(piece, { choir: true });
    const other = await existingScore(piece);
    const editor = await singerHolding('read', 'update');

    const { error } = await editor.client.rpc('make_choir_score', { target: other.id });

    expect(error).toBeNull();
    expect(await choirScoresOf(piece)).toEqual([other.id]);
    expect((await stored(current.id))?.is_choir_score).toBe(false);
  });

  it('needs update to be chosen afterwards', async () => {
    const piece = await newPiece();
    const { id } = await existingScore(piece);
    const adder = await singerHolding('read', 'append', 'delete');

    const { error } = await adder.client.rpc('make_choir_score', { target: id });

    expect(error?.code).toBe('42501');
    expect(await choirScoresOf(piece)).toEqual([]);
  });

  it('says so when the Score is gone', async () => {
    const editor = await singerHolding('read', 'update');

    const { error } = await editor.client.rpc('make_choir_score', { target: randomUUID() });

    expect(error?.code).toBe('P0002');
  });

  it('is left empty when the choir score is deleted: nothing is promoted', async () => {
    const piece = await newPiece();
    const choir = await existingScore(piece, { choir: true });
    await existingScore(piece);
    const remover = await singerHolding('read', 'delete');

    const { error } = await remover.client.rpc('delete_score', { target: choir.id });

    expect(error).toBeNull();
    expect(await choirScoresOf(piece)).toEqual([]);
  });
});

describe('append-only uploads', () => {
  it('lets append neither overwrite nor remove a file, nor change a Score', async () => {
    const piece = await newPiece();
    const { id, path } = await existingScore(piece);
    const adder = await singerHolding('read', 'append');
    const before = await stored(id);

    const overwrite = await adder.client.storage
      .from(bucket)
      .upload(path, samplePdf(2), { contentType: pdf, upsert: true });
    const replace = await adder.client.storage
      .from(bucket)
      .update(path, samplePdf(2), { contentType: pdf });
    const remove = await adder.client.storage.from(bucket).remove([path]);
    const rename = await adder.client.rpc('rename_score', { target: id, score_label: 'x' });
    const promote = await adder.client.rpc('make_choir_score', { target: id });
    const removeRow = await adder.client.rpc('delete_score', { target: id });
    await adder.client.from('scores').update({ label: 'x' }).eq('id', id);
    await adder.client.from('scores').delete().eq('id', id);

    expect(overwrite.error).not.toBeNull();
    expect(replace.error).not.toBeNull();
    expect(remove.data ?? []).toEqual([]);
    expect(rename.error?.code).toBe('42501');
    expect(promote.error?.code).toBe('42501');
    expect(removeRow.error?.code).toBe('42501');
    expect(await stored(id)).toEqual(before);
    const bytes = await serviceClient().storage.from(bucket).download(path);
    expect((await bytes.data?.arrayBuffer())?.byteLength).toBe(samplePdf(1).byteLength);
  });

  it('lets update rename a label but never replace a file', async () => {
    const piece = await newPiece();
    const { id, path } = await existingScore(piece);
    const editor = await singerHolding('read', 'update');

    const rename = await editor.client.rpc('rename_score', {
      target: id,
      score_label: '  Piano   reduction ',
    });
    const overwrite = await editor.client.storage
      .from(bucket)
      .upload(path, samplePdf(2), { contentType: pdf, upsert: true });
    const replace = await editor.client.storage
      .from(bucket)
      .update(path, samplePdf(2), { contentType: pdf });
    const tooLong = await editor.client.rpc('rename_score', {
      target: id,
      score_label: 'x'.repeat(scoreLabelMaxLength + 1),
    });
    const empty = await editor.client.rpc('rename_score', { target: id, score_label: ' ' });

    expect(rename.error).toBeNull();
    expect((await stored(id))?.label).toBe('Piano reduction');
    expect((await stored(id))?.object_path).toBe(path);
    expect(overwrite.error).not.toBeNull();
    expect(replace.error).not.toBeNull();
    expect(tooLong.error?.hint).toBe('label');
    expect(empty.error?.hint).toBe('label');
  });

  it('says so when renaming a Score that is gone', async () => {
    const editor = await singerHolding('read', 'update');

    const { error } = await editor.client.rpc('rename_score', {
      target: randomUUID(),
      score_label: 'x',
    });

    expect(error?.code).toBe('P0002');
  });
});

describe('reading Scores', () => {
  it('shows a Singer without read neither the Scores nor the files', async () => {
    const piece = await newPiece();
    const { id, path } = await existingScore(piece);
    const pending = await singerHolding();

    const listed = await pending.client.from('scores').select('id').eq('id', id);
    const link = await pending.client.storage.from(bucket).createSignedUrl(path, 60);
    const download = await pending.client.storage.from(bucket).download(path);

    expect(listed.data).toEqual([]);
    expect(link.error).not.toBeNull();
    expect(download.error).not.toBeNull();
  });

  it('keeps the bucket private: a file has no public address', async () => {
    const piece = await newPiece();
    const { path } = await existingScore(piece);
    const reader = await singerHolding('read');
    const { data } = reader.client.storage.from(bucket).getPublicUrl(path);

    const response = await fetch(data.publicUrl);

    expect(response.ok).toBe(false);
  });
});

describe('deleting a Score', () => {
  it('lets a Singer with delete remove the row and then the file', async () => {
    const piece = await newPiece();
    const { id, path } = await existingScore(piece);
    const remover = await singerHolding('read', 'delete');

    const row = await remover.client.rpc('delete_score', { target: id });
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
    const { id } = await existingScore(piece);
    const singer = await singerHolding(...held);

    const { error } = await singer.client.rpc('delete_score', { target: id });

    expect(error?.code).toBe('42501');
    expect(await stored(id)).not.toBeNull();
  });

  it('says so when the Score is gone', async () => {
    const remover = await singerHolding('read', 'delete');

    const { error } = await remover.client.rpc('delete_score', { target: randomUUID() });

    expect(error?.code).toBe('P0002');
  });

  it('goes with its Piece', async () => {
    const piece = await newPiece();
    const { id } = await existingScore(piece);
    const remover = await singerHolding('read', 'delete');

    await remover.client.rpc('delete_piece', { target: piece });

    expect(await stored(id)).toBeNull();
  });
});
