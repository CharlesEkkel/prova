# Prova

A mobile-first web app where choir singers find and play practice audio for the pieces they are learning. See `CONTEXT.md` for the domain language and `docs/agents/code-style.md` for the code conventions.

## Requirements

- Node 22.13 or newer (`.nvmrc` pins it), and `pnpm` 11 (`corepack enable` picks the right version from `package.json`)
- Docker, for the local Supabase stack

## Shortcuts with `just`

If you have [`just`](https://github.com/casey/just) installed, `just` lists shortcuts for the commands below. The useful ones: `just setup` (once), `just dev` (starts Supabase, writes `.env`, runs the dev server) and `just preflight` (everything CI runs, before you push). No Docker Compose file is needed: `supabase start` manages its own containers.

## Run it locally

```sh
pnpm install                 # also copies the pdf.js WebAssembly decoders into static/
pnpm supabase:start          # local Supabase; applies supabase/migrations
just env                     # writes .env from the running stack (or copy .env.example and fill it in)
pnpm dev                     # http://localhost:5173
```

`pnpm supabase:reset` rebuilds the local database from the migrations; `pnpm supabase:stop` shuts the stack down. After changing a migration, run `pnpm supabase:types` to regenerate `src/lib/shell/database.types.ts`.

## Sign-in with Google

Google is the only way in: email sign-up and anonymous sign-ins are switched off. A person who signs in is recorded as a Singer, chooses their default Voice Part, and then waits on a waiting-for-approval screen until an Admin gives them a Role with `read`. The tests never talk to Google (they create people through Supabase's admin API), so the Google hand-off is the one thing to check by hand.

1. In the Google Cloud console, create an OAuth client (type: web application). Add the redirect URI Supabase shows for its Google provider: `http://127.0.0.1:54321/auth/v1/callback` locally, `https://<project-ref>.supabase.co/auth/v1/callback` on Supabase cloud.
2. Locally, put the client's ID and secret in `supabase/.env` (git-ignored; `just env` creates it from `supabase/.env.example`, or copy that by hand) and restart the stack:

   ```sh
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
   ```

   Without them the stack still starts and the tests still pass; only the real Google button fails.

   To get past the waiting screen locally, sign in once, then run `just set-owners you@example.com`. That makes you an Owner (every Permission, including `manage-admins`) and gives you the Admin Role too. It takes the whole list of owner emails and replaces the old one, so list everyone; running it again is safe. The deployment runs the same step on every deploy: `node scripts/set-owner-emails.mjs` with `PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set, and the emails as arguments or in `OWNER_EMAILS`. Owner status follows the list live and needs a Google-verified email; removing an address demotes that person to Admin.

3. On Supabase cloud, in the dashboard: enable the Google provider with the same client; under Authentication → Sign In / Providers turn the **Email** provider off and **Allow anonymous sign-ins** off; under URL Configuration set the Site URL to the app's URL and add `https://<your-app>/auth/callback` to the redirect URLs.
4. On Cloudflare Pages, set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` for the build. They are build-time variables (Vite bakes them into the app), and the build fails without them. Never set `SUPABASE_SERVICE_ROLE_KEY` anywhere the app runs; only the tests use it, against the local stack.

## Practice Tracks

A Practice Track is an MP3 or M4A file stored in the private `practice-tracks` bucket (created by a migration). Uploads are append-only: `append` can add a file, never replace or remove one; `update` renames a label; `delete` removes a track and its file.

- **Upload limit.** 10 MiB by default (shown to Singers as "10 MB"). Set `PUBLIC_UPLOAD_LIMIT_MIB` (a whole number of MiB) as a build variable so the screens say the right number, and run `node scripts/apply-upload-limit.mjs` on every deploy (`PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and the same `PUBLIC_UPLOAD_LIMIT_MIB` set; locally `just set-upload-limit 25`) so the bucket enforces it too. The same script applies the Score limit (below). The project's own global file size limit (Supabase cloud: Storage > Settings, 50 MB on the free plan) caps it. The accepted types are fixed in the migration; the bucket checks the declared type, not the file's contents.
- **Playing.** A track plays from `/repertoire/<piece>/tracks/<track>/audio`, which needs a signed-in Singer with `read`, passes `Range` through so seeking works and sets `Cache-Control: private, max-age=3600`. There are no signed links; see `docs/adr/0003-audio-served-through-an-authenticated-endpoint.md`. Every audio request, `Range` requests included, runs a Cloudflare Pages Function, so check the plan's request allowance if the choir grows.
- **Stray files.** Deleting a track or a Piece removes its row first and its file after, so a failure in between can leave an unreferenced file in the bucket but never a track with no file. There is no cleanup job.
- **Encoding.** About 128 kbps keeps a track small and the free tier's egress in reach.

## Scores

A Score is a PDF of the written music for a Piece, stored in its own private `scores` bucket (created by a migration, accepting only `application/pdf`). A Piece can have several, each with a label, and at most one is the **choir score**, which the database enforces. Uploads are append-only, as for Practice Tracks: `append` adds a Score, never replaces or removes one; `update` renames a label and chooses the choir score; `delete` removes a Score and its file. Marking the choir score at upload needs only `append` while the Piece has none; replacing an existing one needs `update`. Deleting the choir score leaves the Piece without one.

- **Upload limit.** 20 MiB by default (shown as "20 MB"), separate from the audio limit because scanned scores are much larger. Set `PUBLIC_SCORE_UPLOAD_LIMIT_MIB` (a whole number of MiB) as a build variable, and `node scripts/apply-upload-limit.mjs` applies it to the Score bucket on every deploy, alongside the audio limit (locally `just set-upload-limit 10 40`). The project's global file size limit still caps it, so raise that first if you want a larger Score limit.
- **Viewing.** A Score is served from `/repertoire/<piece>/scores/<score>/file` by the same authenticated endpoint as audio, with `Range` passed through, and pdf.js loads that path. It is shown only when a Singer opens it: the panel on the Piece page is collapsed and only lists the Scores, and tapping one opens it in a full-screen viewer that turns pages by tapping the right or left half, swiping, the edge buttons or the arrow and Page Up / Down keys, and remembers each Score's page until the app is closed.
- **Scanned scores.** pdf.js decodes some scanned images (JBIG2, JPEG 2000) with WebAssembly. `pnpm install` copies those decoders to `static/pdfjs/wasm/`, so they are served with the app.

## Colour Theme

The Colour Theme (Forest, Violet, Ocean, Sunset or Graphite) is one site-wide setting: a single row in the `site_settings` table, seeded as Forest. A Singer holding `manage-users` changes it in Admin > Appearance; anyone, signed in or not, can read it.

- **Cookie.** Each visitor's theme comes from a cookie named `prova-colour-theme`, which holds only the theme's name. When it is missing, expired or invalid, the server reads the database and sets it again for **one hour**; a failed read shows Forest and is remembered for a minute. The first HTML response already carries the theme on `<html data-accent>`, so there is no flash. The cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, path `/`, and is kept when signing out.
- **Delay.** The Admin who saves sees the change at once, because the save sets their own cookie. Everyone else sees it when their cookie expires, **within an hour**.
- **Caching.** HTML is sent with `Cache-Control: private`, so a CDN never serves one visitor's theme to another. Built assets stay cacheable.
- **Palettes.** `src/accents.css` re-points `--color-primary-*` for each theme but Forest, which is the default in `src/app.css`. It is generated: edit the palettes in `scripts/gen-accents.mjs`, run `node scripts/gen-accents.mjs`, and check in the output. A unit test keeps white on `primary-600` at 4.5:1 or better in all five.

## Tests

There are three seams, each with a trivial passing test to start from.

| Seam                  | Command              | Needs                                                                      |
| --------------------- | -------------------- | -------------------------------------------------------------------------- |
| Play-through resolver | `pnpm test:resolver` | nothing (pure functions, including the sign-in gate)                       |
| Backend contract      | `pnpm test:contract` | the local Supabase stack, see below                                        |
| Browser (Playwright)  | `pnpm test:e2e`      | the local Supabase stack, and `pnpm exec playwright install chromium` once |

The contract and browser tests read `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from `.env` (`just env` writes it from the running stack), or from the real environment, which wins:

```sh
eval "$(pnpm --silent exec supabase status -o env | sed 's/^/export /')"
PUBLIC_SUPABASE_URL=$API_URL PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY pnpm test:contract
```

The contract tests include a guard that lists every table the API exposes and proves a Pending Singer (no `read`) reads nothing from any of them, apart from an explicit allowlist in `tests/contract/access.test.ts`. A new table with data in it fails that guard until it is either locked down or allowlisted with a reason.

Playwright builds the app, serves it with `vite preview`, and runs every test at a phone (390×844) and a desktop (1920×1080) viewport.

## Checks

`pnpm lint`, `pnpm format:check` and `pnpm typecheck` (`svelte-check` and `tsc`). A pre-commit hook runs lint and Prettier on staged files. `pnpm bundle-size` reports the built client bundle size (CI prints it in the job summary).

## Deployment notes

The app is built with `adapter-cloudflare`, but uses no Cloudflare bindings: only standard `Request`/`Response` and public environment variables, so another adapter can be swapped in via `vite.config.ts`.

SvelteKit 3 configures the adapter in the `sveltekit()` Vite plugin (there is no `svelte.config.js`) and has no `$lib` alias, so import shared code with relative paths.

## Branch protection (repository setting)

CI cannot enable this itself. In GitHub, under Settings → Branches, protect `main` and require these status checks to pass before merging:

- `Lint, format and types`
- `Play-through resolver tests`
- `Backend contract tests`
- `Playwright (phone and desktop)`

Deployment, once it is set up, should start only after these pass on `main`. There is no deploy configuration yet.
