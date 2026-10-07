// Shell: who is asking, and how far through sign-in they are. Reads the Auth session, then asks the
// database what access they hold right now (never the token), and decodes it once at this edge.
import { Effect, Schema } from 'effect';
import { accessOf, permissions as allPermissions, signedOut, type Access } from '../core/gate';
import { callSupabaseAs, decodeReply, SupabaseCallFailed, type Supabase } from './supabase';
import { VoicePart } from './voice-parts';

export const SingerId = Schema.String.pipe(Schema.brand('SingerId'));
export type SingerId = typeof SingerId.Type;

export type SignedInSinger = {
  readonly id: SingerId;
  readonly email: string;
  readonly displayName: string;
};

export type Session = Access<SignedInSinger, VoicePart>;

const Permissions = Schema.Array(Schema.Literals(allPermissions));

const AuthUser = Schema.Struct({
  id: SingerId,
  email: Schema.optional(Schema.String),
  user_metadata: Schema.Unknown,
});
type AuthUser = typeof AuthUser.Type;

const GoogleProfile = Schema.Struct({
  full_name: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.String),
});
const decodeProfile = Schema.decodeUnknownEffect(GoogleProfile);

/** The Auth user behind the cookies, checked with the Auth server, or null for no one. */
const currentUser = (supabase: Supabase): Effect.Effect<AuthUser | null, SupabaseCallFailed> =>
  Effect.tryPromise({
    try: () => supabase.auth.getUser(),
    catch: (cause) => new SupabaseCallFailed({ cause }),
  }).pipe(
    // With no session Auth also reports an error; no user is the whole answer.
    Effect.map(({ data }) => data.user),
    Effect.flatMap(decodeReply(Schema.NullOr(AuthUser))),
  );

const nameOf = (metadata: unknown, email: string) =>
  decodeProfile(metadata).pipe(
    Effect.map((profile) => profile.full_name ?? profile.name ?? email),
    Effect.orElseSucceed(() => email),
  );

const signedInSinger = (user: AuthUser): Effect.Effect<SignedInSinger> => {
  const email = user.email ?? '';
  return nameOf(user.user_metadata, email).pipe(
    Effect.map((displayName) => ({ id: user.id, email, displayName })),
  );
};

export const loadSession = (supabase: Supabase): Effect.Effect<Session, SupabaseCallFailed> =>
  Effect.gen(function* () {
    const user = yield* currentUser(supabase);
    if (user === null) return signedOut;

    const [singer, permissions, voicePart] = yield* Effect.all(
      [
        signedInSinger(user),
        callSupabaseAs(Permissions, () => supabase.rpc('my_permissions')),
        callSupabaseAs(Schema.NullOr(VoicePart), () => supabase.rpc('my_default_voice_part')),
      ],
      { concurrency: 'unbounded' },
    );
    return accessOf({ singer, voicePart, permissions });
  });
