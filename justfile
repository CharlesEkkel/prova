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

# Set the owner emails (the whole list, replacing any earlier one) on the local stack. A Singer is an Owner while their verified Google email is listed. Safe to repeat; the deployment runs the same script.
set-owners *emails:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(pnpm --silent exec supabase status -o env | sed 's/^/export /')"
    PUBLIC_SUPABASE_URL="$API_URL" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" node scripts/set-owner-emails.mjs {{ emails }}

# Write .env from the running Supabase stack (replaces any existing .env), and create
# supabase/.env from its example if it is missing (never overwritten: it holds the Google secret).
env:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(pnpm --silent exec supabase status -o env | sed 's/^/export /')"
    printf '%s\n' \
      "PUBLIC_SUPABASE_URL=$API_URL" \
      "PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY" \
      "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY" > .env
    echo "wrote .env"
    if [ ! -f supabase/.env ]; then
      cp supabase/.env.example supabase/.env
      echo "wrote supabase/.env: add your Google OAuth client to it (see the README)"
    fi

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

audit:
    pnpm audit --prod --audit-level=high

# Same checks CI runs, in the same spirit: run this before pushing.
preflight: check test audit
    @echo "preflight passed"

# Report the built client bundle size.
bundle-size:
    pnpm build
    pnpm bundle-size
