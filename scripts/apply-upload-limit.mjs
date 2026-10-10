// Sets the upload limit on the Practice Track storage bucket, from the same PUBLIC_UPLOAD_LIMIT_MIB
// the app is built with, so the size the screens promise and the size the backend enforces come from
// one setting. Safe to run on every deploy and by hand. Reads PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY from the environment; PUBLIC_UPLOAD_LIMIT_MIB is a whole number of MiB
// and defaults to 10. Used by `just set-upload-limit` and by the deployment pipeline.
//
// The accepted types (MP3 and M4A) are fixed in the migration that creates the bucket, and are read
// back and sent again here, so only the size changes. The limit cannot be higher than the project's
// own global file size limit (on Supabase cloud, set under Storage > Settings).
const {
  PUBLIC_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: key,
  PUBLIC_UPLOAD_LIMIT_MIB: setting,
} = process.env;

const bucket = 'practice-tracks';
const bytesPerMiB = 1024 * 1024;

if (!url || !key) {
  console.error('Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const given = setting?.trim() ?? '';
const limitMiB = given === '' ? 10 : Number(given);
if (!Number.isInteger(limitMiB) || limitMiB < 1) {
  console.error(
    `PUBLIC_UPLOAD_LIMIT_MIB must be a whole number of MiB, 1 or more (got "${given}").`,
  );
  process.exit(1);
}

const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
const bucketUrl = new URL(`/storage/v1/bucket/${bucket}`, url);

const current = await fetch(bucketUrl, { headers });
if (!current.ok) {
  console.error(`Could not read the ${bucket} bucket (${current.status}): ${await current.text()}`);
  process.exit(1);
}
const { allowed_mime_types: allowedTypes } = await current.json();

const response = await fetch(bucketUrl, {
  method: 'PUT',
  headers,
  body: JSON.stringify({
    public: false,
    file_size_limit: limitMiB * bytesPerMiB,
    allowed_mime_types: allowedTypes,
  }),
});

if (!response.ok) {
  console.error(`Could not set the upload limit (${response.status}): ${await response.text()}`);
  process.exit(1);
}
console.log(`Upload limit: ${limitMiB} MiB`);
