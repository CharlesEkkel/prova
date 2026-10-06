# Code style

Prova is written in a functional style, in strict TypeScript. The lint config enforces these rules; this document explains the reasons. When a rule and a reason conflict, ask before disabling the rule.

## Principles

- **Small, single-purpose functions.** One function does one thing and can be reused elsewhere. Prefer composing small functions over adding branches to a large one.
- **Immutability.** Never modify an argument, array or object in place. Return a new value (spread, `toSorted`, `toSpliced`, `with`, and similar). Types are `readonly` by default.
- **Strong types, validated once.** Untrusted data (form input, uploads, API and database responses) is parsed into a refined or branded type at the edge. Code past that point trusts the type and does not re-validate. Make illegal states unrepresentable with unions and brand types.
- **Few side effects.** Keep side effects at the edges of the program. Pure logic is the default.
- **Use glossary words.** Names follow `CONTEXT.md` (Piece, Voice Part, Practice Track, Performance, and so on).

## TypeScript

- `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are on.
- `any` and non-null assertions (`!`) are lint errors.
- `as` is allowed only at the validation boundary, and each use needs a comment saying why it is safe.
- Database row types are generated from the Supabase schema and never written by hand.

## Functional core, imperative shell

- **Core:** pure functions over plain readonly data. Examples are the play-through resolver, permission checks and file validation. Core modules never import shell modules; a lint rule enforces this. Core tests need no mocks.
- **Shell:** the only code that touches the outside world, such as the storage module, Supabase calls and audio playback. Shell code is written with Effect, so effects and errors are explicit in the types and services can be swapped in tests.
- **Core logic stays plain.** Do not wrap pure functions in Effect.

## Validation

- Use Effect Schema at every boundary, with branded and refined types (for example `PieceId` or a size-limited upload). Do not add a second validation library.
- Decode once, then pass the decoded type onward.

## Svelte

- Components stay thin. They call a small adapter layer that runs Effects and returns plain results; components do not handle Effect types directly.
- `$state` is the one deliberate exception to immutability, and it is confined to components and thin view-model modules. Update state by assigning a new value (`items = [...items, item]`), never by mutating in place.
- Domain logic lives in plain modules, not in components.

## Lint and formatting

- Lint rules are errors, not warnings.
- Immutability rules are relaxed inside the shell and, more broadly, in test files.
- Every lint-disable comment needs a written reason. CI fails on a bare one.
- Prettier formats everything. CI checks formatting and does not rewrite files.

## Tooling and CI

- Package manager is `pnpm`, with the Node version pinned.
- A pre-commit hook runs lint and format on staged files.
- On every pull request and on every push to `main`, CI runs: lint, Prettier check, type check (`svelte-check` and `tsc`), and all three test seams (backend contract, play-through resolver, Playwright).
- `main` is protected: those checks must pass before merge, and deployment starts only after they pass on `main`.
- Dependabot keeps dependencies up to date. There is no coverage threshold.
