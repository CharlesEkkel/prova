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

# Write .env from the running Supabase stack (replaces any existing .env).
env:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(pnpm --silent exec supabase status -o env | sed 's/^/export /')"
    printf '%s\n' \
      "PUBLIC_SUPABASE_URL=$API_URL" \
      "PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY" \
      "SUPABASE_URL=$API_URL" \
      "SUPABASE_ANON_KEY=$ANON_KEY" > .env
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
    SUPABASE_URL="$API_URL" SUPABASE_ANON_KEY="$ANON_KEY" pnpm test:contract

# Playwright browser tests at phone and desktop viewports.
test-e2e:
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
