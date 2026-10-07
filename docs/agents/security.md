# Supply-chain security

How Prova guards against compromised npm packages and CI actions.

## What is in place

- **Lockfile is the source of truth.** CI installs with `--frozen-lockfile`. Dependency ranges stay as `^`; the lockfile fixes what is actually installed.
- **7-day release-age delay.** `minimumReleaseAge` in `pnpm-workspace.yaml` refuses any version published less than 7 days ago, and Dependabot's `cooldown` waits the same time before proposing one. Most malicious releases are caught within days.
- **Exact-version exemptions only.** `minimumReleaseAgeExclude` lists `name@version` entries, each with its publish date. Remove an entry once that version is 7 days old. A later release of the same package still has to age.
- **Direct dependency ranges must be satisfiable.** If a range's minimum version is under 7 days old, install fails. Lower the range or add an exact exemption deliberately.
- **`trustPolicy: no-downgrade`.** Install fails if a package's publish provenance is weaker than an earlier version's.
- **`blockExoticSubdeps`.** Transitive dependencies cannot come from git or tarball URLs.
- **Build scripts are allow-listed.** Only the packages in `allowBuilds` may run install scripts.
- **CI.** Actions are pinned to commit SHAs (Dependabot updates them), the workflow token is read-only, and `pnpm audit --prod --audit-level=high` blocks merges. A full audit prints to the job summary without blocking.
- **GitHub.** Secret scanning with push protection, Dependabot alerts and security updates are enabled, and `main` is protected by a ruleset.

## Overrides

`overrides` in `pnpm-workspace.yaml` force patched versions of dev-only dependencies (`sharp`, `deepmerge-ts`). Remove each once the upstream range allows the patched version.

## Known advisories

- `source-map-js` 1.2.1 (high, dev-only build tooling via `postcss` and Tailwind). The patched 1.2.2 was published 2026-09-30 and clears the 7-day delay on 2026-10-07; Dependabot will propose it, or add an override then.
