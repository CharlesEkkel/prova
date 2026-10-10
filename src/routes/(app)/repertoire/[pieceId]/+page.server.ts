import { error } from '@sveltejs/kit';
import { formActions } from '../../../../lib/core/paths';
import { pieceActionsFor, pieceIdOf } from '../../../../lib/core/pieces';
import { mayUploadTrack, trackActionsFor } from '../../../../lib/core/practice-tracks';
import { choirChoiceAtUpload, mayUploadScore, scoreActionsFor } from '../../../../lib/core/scores';
import { runPieceAction, updatePiece } from '../../../../lib/shell/piece-commands';
import { loadPiece } from '../../../../lib/shell/pieces';
import {
  addTrack,
  deleteTrack,
  issueTicket,
  loadTracks,
  renameTrack,
  trackForm,
} from '../../../../lib/shell/practice-tracks';
import { valueOrNull } from '../../../../lib/shell/run';
import {
  addScore,
  deleteScore,
  issueScoreTicket,
  loadScores,
  makeChoirScore,
  renameScore,
  scoreForm,
} from '../../../../lib/shell/scores';
import { scoreUploadLimitMiB, uploadLimitMiB } from '../../../../lib/shell/upload-limit';
import { loadVoiceParts } from '../../../../lib/shell/voice-parts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = pieceIdOf(params.pieceId);
  if (id === null) error(404, 'There is no such Piece.');
  const piece = await valueOrNull(loadPiece(locals.supabase, id));
  if (piece === null) error(404, 'There is no such Piece.');
  const [tracks, scores, voiceParts] = await Promise.all([
    valueOrNull(loadTracks(locals.supabase, id)),
    valueOrNull(loadScores(locals.supabase, id)),
    valueOrNull(loadVoiceParts(locals.supabase)),
  ]);
  if (tracks === null || scores === null || voiceParts === null) {
    error(503, 'The Practice Tracks and Scores could not be loaded. Try again in a moment.');
  }
  const { visitor } = locals;
  const held = visitor.stage === 'ready' ? visitor.permissions : [];
  return {
    piece,
    tracks,
    scores,
    voiceParts,
    // Which Voice Part is in effect on this Piece. A Preferred Part (#22) will replace it.
    voicePartId: visitor.stage === 'ready' ? visitor.voicePart.id : null,
    // The database enforces these; they only decide what to show.
    // Editing the Piece's own details needs `update`, as in the Repertoire.
    mayEditPiece: pieceActionsFor(held).includes('edit'),
    mayUpload: mayUploadTrack(held),
    trackActions: trackActionsFor(held),
    uploadLimitMiB,
    mayUploadScore: mayUploadScore(held),
    scoreActions: scoreActionsFor(held),
    choirChoice: choirChoiceAtUpload(held, scores),
    scoreUploadLimitMiB,
  };
};

export const actions: Actions = {
  [formActions.pieces.update]: ({ locals, request }) =>
    runPieceAction(updatePiece, locals.supabase, request),
  [formActions.tracks.ticket]: ({ locals, request }) =>
    trackForm.ticket(issueTicket, locals.supabase, request),
  [formActions.tracks.add]: ({ locals, request }) =>
    trackForm.command(addTrack, locals.supabase, request),
  [formActions.tracks.rename]: ({ locals, request }) =>
    trackForm.command(renameTrack, locals.supabase, request),
  [formActions.tracks.delete]: ({ locals, request }) =>
    trackForm.command(deleteTrack, locals.supabase, request),
  [formActions.scores.ticket]: ({ locals, request }) =>
    scoreForm.ticket(issueScoreTicket, locals.supabase, request),
  [formActions.scores.add]: ({ locals, request }) =>
    scoreForm.command(addScore, locals.supabase, request),
  [formActions.scores.rename]: ({ locals, request }) =>
    scoreForm.command(renameScore, locals.supabase, request),
  [formActions.scores.makeChoir]: ({ locals, request }) =>
    scoreForm.command(makeChoirScore, locals.supabase, request),
  [formActions.scores.delete]: ({ locals, request }) =>
    scoreForm.command(deleteScore, locals.supabase, request),
};
