import { error } from '@sveltejs/kit';
import { formActions } from '../../../../lib/core/paths';
import { pieceIdOf } from '../../../../lib/core/pieces';
import { mayUploadTrack, trackActionsFor } from '../../../../lib/core/practice-tracks';
import { loadPiece } from '../../../../lib/shell/pieces';
import {
  addTrack,
  deleteTrack,
  loadTracks,
  renameTrack,
  runIssueTicket,
  runTrackAction,
} from '../../../../lib/shell/practice-tracks';
import { valueOrNull } from '../../../../lib/shell/run';
import { uploadLimitMiB } from '../../../../lib/shell/upload-limit';
import { loadVoiceParts } from '../../../../lib/shell/voice-parts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = pieceIdOf(params.pieceId);
  if (id === null) error(404, 'There is no such Piece.');
  const piece = await valueOrNull(loadPiece(locals.supabase, id));
  if (piece === null) error(404, 'There is no such Piece.');
  const [tracks, voiceParts] = await Promise.all([
    valueOrNull(loadTracks(locals.supabase, id)),
    valueOrNull(loadVoiceParts(locals.supabase)),
  ]);
  if (tracks === null || voiceParts === null) {
    error(503, 'The Practice Tracks could not be loaded. Try again in a moment.');
  }
  const { visitor } = locals;
  const held = visitor.stage === 'ready' ? visitor.permissions : [];
  return {
    piece,
    tracks,
    voiceParts,
    // Which Voice Part is in effect on this Piece. A Preferred Part (#22) will replace it.
    voicePartId: visitor.stage === 'ready' ? visitor.voicePart.id : null,
    // The database enforces these; they only decide what to show.
    mayUpload: mayUploadTrack(held),
    trackActions: trackActionsFor(held),
    uploadLimitMiB,
  };
};

export const actions: Actions = {
  [formActions.tracks.ticket]: ({ locals, request }) => runIssueTicket(locals.supabase, request),
  [formActions.tracks.add]: ({ locals, request }) =>
    runTrackAction(addTrack, locals.supabase, request),
  [formActions.tracks.rename]: ({ locals, request }) =>
    runTrackAction(renameTrack, locals.supabase, request),
  [formActions.tracks.delete]: ({ locals, request }) =>
    runTrackAction(deleteTrack, locals.supabase, request),
};
