# Local developer workflow. Run `just` to list recipes. Needs `just`, Docker and pnpm.
# Recipes call the pnpm scripts, which stay the source of truth for CI.

set shell := ["bash", "-euo", "pipefail", "-c"]

# List the available recipes.
default:
    @just --list

# One-time setup after cloning: install dependencies and the Playwright browser.
setup:
    pnpm install
    pnpm exec playwright install chromium

# Start the whole dev environment: local Supabase, a matching .env, then the dev server.
dev: db-up env
    pnpm dev

# Start the local Supabase stack (applies migrations). Needs Docker running.
db-up:
    pnpm supabase:start

# Stop the local Supabase stack.
db-down:
    pnpm supabase:stop

# Rebuild the local database from the migrations.
db-reset:
    pnpm supabase:reset

# Approve a Singer locally: give them an "Admin" Role holding every Permission. They must have signed in once. Stopgap until #15.
make-admin email:
    #!/usr/bin/env bash
    set -euo pipefail
    granted=$(docker exec -i supabase_db_prova psql -U postgres -qtA -v ON_ERROR_STOP=1 -v email={{ quote(email) }} <<'SQL'
    with r as (
      insert into public.roles (name) values ('Admin')
      on conflict (name) do update set name = excluded.name
      returning id
    ), p as (
      insert into public.role_permissions (role_id, permission)
      select r.id, x from r, unnest(enum_range(null::public.permission)) x
      on conflict do nothing
    ), g as (
      insert into public.singer_roles (singer_id, role_id)
      select s.id, r.id from public.singers s, r where s.email = :'email'
      on conflict do nothing
      returning 1
    )
    select count(*) from public.singers where email = :'email';
    SQL
    )
    if [ "$granted" = "0" ]; then
      echo "No Singer with email {{ email }}: sign in with Google once first." >&2
      exit 1
    fi
    echo "{{ email }} is now an Admin"

# Write .env from the running Supabase stack (replaces any existing .env).
env:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(pnpm --silent exec supabase status -o env | sed 's/^/export /')"
    printf '%s\n' \
      "PUBLIC_SUPABASE_URL=$API_URL" \
      "PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY" \
      "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY" > .env
    echo "wrote .env"

# Lint, Prettier check and type checks (no tests).
check:
    pnpm lint
    pnpm format:check
    pnpm typecheck

# Auto-fix formatting and fixable lint problems.
fix:
    pnpm format
    pnpm exec eslint . --fix

# Play-through resolver tests (pure, no services needed).
test-resolver:
    pnpm test:resolver

# Backend contract tests against the local Supabase stack (starts it if needed).
test-contract: db-up
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(pnpm --silent exec supabase status -o env | sed 's/^/export /')"
    PUBLIC_SUPABASE_URL="$API_URL" PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" pnpm test:contract

# Playwright browser tests at phone and desktop viewports (needs the local Supabase stack and `just env`).
test-e2e: db-up env
    pnpm test:e2e

# All three test seams.
test: test-resolver test-contract test-e2e

# Same checks CI runs, in the same spirit: run this before pushing.
preflight: check test
    pnpm audit --prod --audit-level=high
    @echo "preflight passed"

# Report the built client bundle size.
bundle-size:
    pnpm build
    pnpm bundle-size
