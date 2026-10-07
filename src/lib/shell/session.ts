// Shell: who is asking, and how far through sign-in they are. Reads the Auth session, then asks the
// database what access they hold right now (never the token), and decodes it once at this edge.
import { Data, Effect, Schema } from 'effect';
import {
  accessStage,
  permissions as allPermissions,
  type Permission,
  type Stage,
  type Standing,
} from '../core/gate';
import type { Supabase } from './supabase';

export class SessionLookupFailed extends Data.TaggedError('SessionLookupFailed')<{
  readonly cause: unknown;
}> {}

const PermissionSchema = Schema.Literals(allPermissions);
export type { Permission };

const VoicePart = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  short_label: Schema.String,
});
export type VoicePart = typeof VoicePart.Type;

const decodePermissions = Schema.decodeUnknownEffect(Schema.Array(PermissionSchema));
const decodeVoicePart = Schema.decodeUnknownEffect(Schema.NullOr(VoicePart));

const GoogleProfile = Schema.Struct({
  full_name: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.String),
});
const decodeProfile = Schema.decodeUnknownEffect(GoogleProfile);

export type SignedInSinger = {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
};

export type Session = {
  readonly stage: Stage;
  readonly singer: SignedInSinger | null;
  readonly permissions: readonly Permission[];
  readonly voicePart: VoicePart | null;
};

const signedOut: Session = { stage: 'signed-out', singer: null, permissions: [], voicePart: null };

const lookup = <A>(run: () => PromiseLike<{ readonly data: A; readonly error: unknown }>) =>
  Effect.tryPromise({ try: run, catch: (cause) => new SessionLookupFailed({ cause }) }).pipe(
    Effect.flatMap(({ data, error }) =>
      error === null
        ? Effect.succeed(data)
        : Effect.fail(new SessionLookupFailed({ cause: error })),
    ),
  );

/** The Auth user behind the cookies, checked with the Auth server, or null for no one. */
const currentUser = (supabase: Supabase) =>
  Effect.promise(() => supabase.auth.getUser()).pipe(Effect.map(({ data }) => data.user));

const nameOf = (metadata: unknown, email: string) =>
  decodeProfile(metadata).pipe(
    Effect.map((profile) => profile.full_name ?? profile.name ?? email),
    Effect.orElseSucceed(() => email),
  );

const standingOf = (permissions: readonly Permission[], voicePart: VoicePart | null): Standing => ({
  signedIn: true,
  hasVoicePart: voicePart !== null,
  permissions,
});

export const loadSession = (supabase: Supabase): Effect.Effect<Session, SessionLookupFailed> =>
  Effect.gen(function* () {
    const user = yield* currentUser(supabase);
    if (user === null) return signedOut;

    const [rawPermissions, rawVoicePart] = yield* Effect.all(
      [
        lookup(() => supabase.rpc('my_permissions')),
        lookup(() => supabase.rpc('my_default_voice_part')),
      ],
      { concurrency: 2 },
    );
    const permissions = yield* decodePermissions(rawPermissions).pipe(
      Effect.mapError((cause) => new SessionLookupFailed({ cause })),
    );
    const voicePart = yield* decodeVoicePart(rawVoicePart).pipe(
      Effect.mapError((cause) => new SessionLookupFailed({ cause })),
    );
    const email = user.email ?? '';

    return {
      stage: accessStage(standingOf(permissions, voicePart)),
      singer: { id: user.id, email, displayName: yield* nameOf(user.user_metadata, email) },
      permissions,
      voicePart,
    };
  });
