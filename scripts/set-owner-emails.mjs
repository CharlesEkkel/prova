// Sets the deployment's owner emails: the complete list, replacing whatever was there. Safe to run
// on every deploy and by hand. Reads PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
// environment, and the emails from the arguments or, failing that, OWNER_EMAILS (comma or space
// separated). Used by `just set-owners` and by the deployment pipeline.
const {
  PUBLIC_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: key,
  OWNER_EMAILS: fromEnv,
} = process.env;

if (!url || !key) {
  console.error('Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const given = process.argv.length > 2 ? process.argv.slice(2) : [fromEnv ?? ''];
const emails = given
  .flatMap((entry) => entry.split(/[\s,]+/))
  .map((email) => email.trim())
  .filter((email) => email !== '');

// An empty list would demote every Owner, so a missing OWNER_EMAILS must not pass silently.
if (emails.length === 0) {
  console.error('No owner emails given: pass them as arguments or set OWNER_EMAILS.');
  process.exit(1);
}

const response = await fetch(new URL('/rest/v1/rpc/set_owner_emails', url), {
  method: 'POST',
  headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
  body: JSON.stringify({ emails }),
});

if (!response.ok) {
  console.error(`Could not set the owner emails (${response.status}): ${await response.text()}`);
  process.exit(1);
}
console.log(`Owners: ${emails.join(', ')}`);
