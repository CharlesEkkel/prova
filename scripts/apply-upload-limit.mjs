// Sets the upload limits on the storage buckets, from the same settings the app is built with, so the
// size the screens promise and the size the backend enforces come from one setting each:
//   - PUBLIC_UPLOAD_LIMIT_MIB for the Practice Track bucket (default 10)
//   - PUBLIC_SCORE_UPLOAD_LIMIT_MIB for the Score bucket (default 20)
// Safe to run on every deploy and by hand. Reads PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// from the environment; each limit is a whole number of MiB. Used by `just set-upload-limit` and by
// the deployment pipeline.
//
// The accepted types (MP3 and M4A for tracks, PDF for Scores) are fixed in the migrations that create
// the buckets, and are read back and sent again here, so only the sizes change. A limit cannot be
// higher than the project's own global file size limit (on Supabase cloud, set under Storage >
// Settings).
const {
  PUBLIC_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: key,
  PUBLIC_UPLOAD_LIMIT_MIB: trackSetting,
  PUBLIC_SCORE_UPLOAD_LIMIT_MIB: scoreSetting,
} = process.env;

const bytesPerMiB = 1024 * 1024;

if (!url || !key) {
  console.error('Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const buckets = [
  {
    bucket: 'practice-tracks',
    name: 'PUBLIC_UPLOAD_LIMIT_MIB',
    setting: trackSetting,
    fallback: 10,
  },
  { bucket: 'scores', name: 'PUBLIC_SCORE_UPLOAD_LIMIT_MIB', setting: scoreSetting, fallback: 20 },
];

const limitOf = ({ name, setting, fallback }) => {
  const given = setting?.trim() ?? '';
  const limitMiB = given === '' ? fallback : Number(given);
  if (!Number.isInteger(limitMiB) || limitMiB < 1) {
    console.error(`${name} must be a whole number of MiB, 1 or more (got "${given}").`);
    process.exit(1);
  }
  return limitMiB;
};

const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };

// Every setting is checked before any bucket changes, so a typo changes nothing.
const wanted = buckets.map((entry) => ({ ...entry, limitMiB: limitOf(entry) }));

for (const { bucket, name, limitMiB } of wanted) {
  const bucketUrl = new URL(`/storage/v1/bucket/${bucket}`, url);

  const current = await fetch(bucketUrl, { headers });
  if (!current.ok) {
    console.error(
      `Could not read the ${bucket} bucket (${current.status}): ${await current.text()}`,
    );
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
    console.error(
      `Could not set the ${bucket} upload limit (${response.status}): ${await response.text()}`,
    );
    process.exit(1);
  }
  console.log(`${bucket} upload limit (${name}): ${limitMiB} MiB`);
}
