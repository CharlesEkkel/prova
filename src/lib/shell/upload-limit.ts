// Shell: the upload limit this deployment was built with, in MiB. PUBLIC_UPLOAD_LIMIT_MIB is read at
// build time; scripts/apply-upload-limit.mjs sets the same number on the storage bucket, so what the
// screens promise and what the backend enforces come from one setting.
import { Schema } from 'effect';
import { uploadLimitFrom } from '../core/practice-tracks';

const UploadLimitEnv = Schema.Struct({
  PUBLIC_UPLOAD_LIMIT_MIB: Schema.optionalKey(Schema.String),
});

/** The limit in MiB: the setting, or 10 when there is none or it is not a whole number of MB. */
export const uploadLimitMiB: number = uploadLimitFrom(
  Schema.decodeUnknownSync(UploadLimitEnv)(import.meta.env).PUBLIC_UPLOAD_LIMIT_MIB,
);
