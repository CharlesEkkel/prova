# Cloudflare adapter, with no platform bindings

The app is built with `adapter-cloudflare` and rendered on the server by Pages Functions, but it uses only standard `Request` and `Response` and public environment variables, never Cloudflare bindings (KV, R2, D1, `platform.env`). Supabase provides the database, auth and storage, so bindings aren't needed, and avoiding them means another SvelteKit adapter can replace Cloudflare without code changes.
