// Shell: the upload limits this deployment was built with, in MiB. PUBLIC_UPLOAD_LIMIT_MIB (Practice
// Tracks) and PUBLIC_SCORE_UPLOAD_LIMIT_MIB (Scores) are read at build time; scripts/apply-upload-limit.mjs
// sets the same numbers on the storage buckets, so what the screens promise and what the backend
// enforces come from one setting each.
import { Schema } from 'effect';
import { defaultScoreUploadLimitMiB, uploadLimitFrom } from '../core/upload-rules';

const UploadLimitEnv = Schema.Struct({
  PUBLIC_UPLOAD_LIMIT_MIB: Schema.optionalKey(Schema.String),
  PUBLIC_SCORE_UPLOAD_LIMIT_MIB: Schema.optionalKey(Schema.String),
});

const env = Schema.decodeUnknownSync(UploadLimitEnv)(import.meta.env);

/** The Practice Track limit in MiB: the setting, or 10 when there is none or it is not a whole number of MB. */
export const uploadLimitMiB: number = uploadLimitFrom(env.PUBLIC_UPLOAD_LIMIT_MIB);

/** The Score limit in MiB: the setting, or 20 when there is none or it is not a whole number of MB. */
export const scoreUploadLimitMiB: number = uploadLimitFrom(
  env.PUBLIC_SCORE_UPLOAD_LIMIT_MIB,
  defaultScoreUploadLimitMiB,
);
