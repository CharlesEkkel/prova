// Thin adapter: hooks and routes call these plain async functions and never see Effect types.
import { Effect } from 'effect';
import { loadSession, type Session } from './session';
import type { Supabase } from './supabase';

export const readSession = (supabase: Supabase): Promise<Session> =>
  Effect.runPromise(loadSession(supabase));
