# Audio and Scores are served through an authenticated same-origin endpoint, not signed links

Scores follow the same decision: a PDF is read from `/repertoire/<piece>/scores/<score>/file`, with the same session check, `Range` pass-through and cache lifetime, and pdf.js loads that path rather than a signed link. Scores share the choir's upload limit (`PUBLIC_UPLOAD_LIMIT_MIB`) but live in their own private bucket that accepts `application/pdf`.

The original spec (#11, stories 77 and 78) gave each Singer a per-track signed link lasting about a day, reused until close to expiry so the browser could cache it. That needs somewhere to keep the link between requests, and the app runs on Cloudflare Pages without bindings, so the only home is the browser. It also yields a link that works for anyone who is sent it until it expires.

Instead a Practice Track plays from a stable path in the app, `/repertoire/<piece>/tracks/<track>/audio`. Every request to it must carry a signed-in Singer's session with `read`; the server reads the file from the private bucket as that Singer (so the database policies still decide) and streams it back, passing `Range` through and answering `206` so seeking works. The path never changes, so the browser caches it, with `Cache-Control: private, max-age=3600`. A copied URL is useless without a session.

One hour is the app's general cache lifetime (the Colour Theme cookie uses it too), so changes reach everyone within the hour. It is a single constant, not a number written at each use.

## Considered Options

- **Per-Singer signed links reused until near expiry** (the original spec): browsers could talk to Supabase directly, but a link could be shared for a day, and reuse meant client-side bookkeeping.
- **Redirect to a short-lived signed link:** `Range` requests would skip our Function, but it brings shareable links back. Kept in reserve if the Function invocation count ever matters.

## Consequences

- Each audio request, `Range` requests included, runs a Cloudflare Pages Function. At one choir's scale this is expected to be well inside the free plan; the Function only passes the body through.
- All file access still goes through one storage module (upload, stream, remove), so storage can move later (for example to Cloudflare R2) without touching the rest of the app.
- A deleted track can stay in a browser's cache for up to an hour.
- The upload limit is a deployment setting, `PUBLIC_UPLOAD_LIMIT_MIB` (default 10). The UI reads it at build time, and a script applies it to the storage bucket during deployment, so the two cannot drift apart. The accepted types (MP3 and M4A) are fixed in the migration that creates the bucket.
