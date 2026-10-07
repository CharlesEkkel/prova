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
cp .env.example .env         # fill in the URL and anon key from `pnpm exec supabase status -o env`
pnpm dev                     # http://localhost:5173
```

`pnpm supabase:reset` rebuilds the local database from the migrations; `pnpm supabase:stop` shuts the stack down. After changing a migration, run `pnpm supabase:types` to regenerate `src/lib/shell/database.types.ts`.

## Sign-in with Google

Google is the only way in: email sign-up and anonymous sign-ins are switched off. A person who signs in is recorded as a Singer, chooses their default Voice Part, and then waits on a waiting-for-approval screen until an Admin gives them a Role with `read`. The tests never talk to Google (they create people through Supabase's admin API), so the Google hand-off is the one thing to check by hand.

1. In the Google Cloud console, create an OAuth client (type: web application). Add the redirect URI Supabase shows for its Google provider: `http://127.0.0.1:54321/auth/v1/callback` locally, `https://<project-ref>.supabase.co/auth/v1/callback` on Supabase cloud.
2. Locally, put the client's ID and secret in `supabase/.env` (git-ignored) and restart the stack:

   ```sh
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
   ```

   Without them the stack still starts and the tests still pass; only the real Google button fails.

3. On Supabase cloud, in the dashboard: enable the Google provider with the same client; under Authentication → Sign In / Providers turn the **Email** provider off and **Allow anonymous sign-ins** off; under URL Configuration set the Site URL to the app's URL and add `https://<your-app>/auth/callback` to the redirect URLs.
4. On Cloudflare Pages, set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`. Never set `SUPABASE_SERVICE_ROLE_KEY` anywhere the app runs; only the tests use it, against the local stack.

## Tests

There are three seams, each with a trivial passing test to start from.

| Seam                  | Command              | Needs                                                                      |
| --------------------- | -------------------- | -------------------------------------------------------------------------- |
| Play-through resolver | `pnpm test:resolver` | nothing (pure functions, including the sign-in gate)                       |
| Backend contract      | `pnpm test:contract` | the local Supabase stack, see below                                        |
| Browser (Playwright)  | `pnpm test:e2e`      | the local Supabase stack, and `pnpm exec playwright install chromium` once |

The contract and browser tests read `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from `.env` (`just env` writes it from the running stack), or from the real environment, which wins:

```sh
eval "$(pnpm --silent exec supabase status -o env | sed 's/^/export /')"
SUPABASE_URL=$API_URL SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY pnpm test:contract
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
