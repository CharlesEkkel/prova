// View model: the page each Score was last on, for the playback session. It lives as long as the app
// stays open, so closing and reopening a Score returns to its page.
// `$state` is the one deliberate exception to immutability.
import { rememberPage, rememberedPage, type RememberedPages, type ScoreId } from '../core/scores';

let pages = $state<RememberedPages>({});

/** The page this Score was last on: 1 until the Singer has turned a page. */
export const pageOfScore = (score: ScoreId): number => rememberedPage(pages, score);

/** Remembers the page this Score is on. */
export const rememberScorePage = (score: ScoreId, page: number): void => {
  pages = rememberPage(pages, score, page);
};
