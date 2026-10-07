# Prova

A mobile-first web app where choir singers find and play practice audio for the pieces they are learning. See `CONTEXT.md` for the domain language and `docs/agents/code-style.md` for the code conventions.

## Requirements

- Node 22.13 or newer (`.nvmrc` pins it), and `pnpm` 11 (`corepack enable` picks the right version from `package.json`)
- Docker, for the local Supabase stack

## Run it locally

```sh
pnpm install                 # also copies the pdf.js WebAssembly decoders into static/
pnpm supabase:start          # local Supabase; applies supabase/migrations
cp .env.example .env         # fill in the URL and anon key from `pnpm exec supabase status -o env`
pnpm dev                     # http://localhost:5173
```

`pnpm supabase:reset` rebuilds the local database from the migrations; `pnpm supabase:stop` shuts the stack down.

## Tests

There are three seams, each with a trivial passing test to start from.

| Seam                  | Command              | Needs                                        |
| --------------------- | -------------------- | -------------------------------------------- |
| Play-through resolver | `pnpm test:resolver` | nothing (pure functions)                     |
| Backend contract      | `pnpm test:contract` | the local Supabase stack, see below          |
| Browser (Playwright)  | `pnpm test:e2e`      | `pnpm exec playwright install chromium` once |

Contract tests read `SUPABASE_URL` and `SUPABASE_ANON_KEY`:

```sh
eval "$(pnpm --silent exec supabase status -o env | sed 's/^/export /')"
SUPABASE_URL=$API_URL SUPABASE_ANON_KEY=$ANON_KEY pnpm test:contract
```

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
