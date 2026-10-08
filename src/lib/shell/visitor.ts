// Shell: who is asking, and how far through sign-in they are. Reads the Auth session, then asks the
// database what access they hold right now (never the token), and decodes it once at this edge.
import { isAuthApiError, isAuthSessionMissingError } from '@supabase/supabase-js';
import { Effect, Schema } from 'effect';
import { accessOf, signedOut, type Access } from '../core/gate';
import { permissions as allPermissions } from '../core/permissions';
import {
  callSupabaseAs,
  decodeReply,
  SupabaseCallFailed,
  trySupabase,
  type Supabase,
} from './supabase';
import { VoicePart } from './voice-parts';

export const SingerId = Schema.String.pipe(Schema.brand('SingerId'));
export type SingerId = typeof SingerId.Type;

export type SignedInSinger = {
  readonly id: SingerId;
  readonly email: string;
  readonly displayName: string;
};

/** Who is asking, and how far through sign-in they are. */
export type Visitor = Access<SignedInSinger, VoicePart>;

const Permissions = Schema.Array(Schema.Literals(allPermissions));

const AuthUser = Schema.Struct({
  id: SingerId,
  // Google always reports one; a Singer without an email is not one Prova can show or reach.
  email: Schema.NonEmptyString,
  user_metadata: Schema.Unknown,
});
type AuthUser = typeof AuthUser.Type;

const GoogleProfile = Schema.Struct({
  full_name: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.String),
});
const decodeProfile = Schema.decodeUnknownEffect(GoogleProfile);

/** No session, or one the Auth server turned down (expired, revoked, or the user removed). */
const meansSignedOut = (error: unknown): boolean =>
  isAuthSessionMissingError(error) || (isAuthApiError(error) && error.status < 500);

/**
 * The Auth user behind the cookies, checked with the Auth server, or null for no one. Any other
 * error means the Auth server could not say, which is not the same as no one.
 */
const currentUser = (supabase: Supabase): Effect.Effect<AuthUser | null, SupabaseCallFailed> =>
  trySupabase(() => supabase.auth.getUser()).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error === null) return decodeReply(Schema.NullOr(AuthUser))(data.user);
      return meansSignedOut(error)
        ? Effect.succeed(null)
        : Effect.fail(new SupabaseCallFailed({ cause: error }));
    }),
  );

const nameOf = (metadata: unknown, email: string) =>
  decodeProfile(metadata).pipe(
    Effect.map((profile) => profile.full_name ?? profile.name ?? email),
    Effect.orElseSucceed(() => email),
  );

const signedInSinger = ({ id, email, user_metadata }: AuthUser): Effect.Effect<SignedInSinger> =>
  nameOf(user_metadata, email).pipe(Effect.map((displayName) => ({ id, email, displayName })));

export const loadVisitor = (supabase: Supabase): Effect.Effect<Visitor, SupabaseCallFailed> =>
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
