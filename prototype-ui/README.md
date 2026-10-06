# PROTOTYPE (throwaway): Prova UI, issue #12

Answers: "What should Prova's main screens look like?" Built with Tailwind v4, Bits UI headless components, Lucide
icons and pdf.js. Mock data only, no persistence (a reload resets everything), no real audio (time runs ×8 so
auto-advance is quick). Not for merging into `main`. Earlier rounds are on `prototype/ui-v1` and in this branch's history.

    pnpm install && pnpm prototype      # needs Node 22.13+

Layout: below `lg` (1024px) it is the phone layout (header + drawer menu). At `lg` and up it is the 16:9 desktop
layout (sidebar, wide grids). Try 390×844 and 1920×1080.

## Settled

- **Home** (`/`): a timeline with the next Performance as a hero. Every Performance tile (caret on the right) opens one
  overview. Part info is the compact "what you'd hear" label. The major Performance is a banner across the top.
- **Repertoire** (`/repertoire`): its own page, from the sidebar. Search is Ctrl/Cmd+K.
- **Overview** (`?overview=w1` opens it on load): play options and the Pieces. Tapping a Piece opens it on its own,
  as from the Repertoire. Play at the bottom starts the play-through from Piece 1.
- **One player screen** (`PlayerScreen.svelte`): `/perform/<id>` with a running order, `/piece/<id>` with a Start
  button and none. The part being played is an indicator; clicking it is the only way to override the Voice Part.
- **Score**: a collapsed panel, never opened for you. "Open full screen" shows the real PDF. Turn pages by tapping the
  right half (forward) or left half (back) of the screen, the edge buttons, swiping, or arrow / Page keys. The page is
  remembered for the playback session. Fullscreen leaves when the song ends (it follows you across Pieces in a
  Performance, and leaves when the Performance finishes).

## Management (round 6)

What each Role can do follows CONTEXT.md: `append` adds new things, `update` renames and tags only, `delete` removes,
`manage-users` runs the admin portal. Anything a Role cannot do is simply not shown, so a Reader sees no management UI.
Use **Preview as role (prototype)** in the user menu (bottom of the sidebar) to see each Role's view.

- **Context menus**: right-click or long-press, or use the ⋯ button, on a Piece (Repertoire, overview rows, Piece
  screen), a Performance tile, a Practice Track or a Score. One action list feeds both the context menu and the ⋯ menu.
- **Uploads**: Practice Track (Voice Part or Combined, part-only or part-predominant, label, audio up to 50 MB) and
  Score (PDF up to 20 MB, optionally the choir score). Wrong file types and oversize files are rejected with a message,
  and the upload shows progress. The sample score PDF is shown for every Score.
- **Renaming** (Piece, Performance, Practice Track label, Score label) and **deleting** (always a confirmation that says
  what else goes with it). Also: New Piece, New Performance, add a Piece to a Performance, mark a Performance major.
- **Admin portal** (`/admin`, needs `manage-users`): Members (approve or decline pending sign-ups with a Role, edit
  Roles, remove; the only Admin can't be removed), Roles (create, edit, delete; Admin is locked), Invite Links (Roles,
  expiry, use cap, copy, revoke; Roles holding `delete` or `manage-users` can't go on a link).

## Light and dark theme

Light, Dark or System (the default, which follows the OS live). The three-way toggle is at the bottom of the sidebar
(and in the phone drawer); on phones there is also a quick light/dark button in the header. The choice is remembered
in `localStorage` (`prova-theme`) and applied by a tiny script in `app.html` before first paint, so a reload never
flashes the wrong theme. Dark is a class on `<html>` (`@custom-variant dark` in `app.css`), so the toggle can override
the OS setting; native controls follow via `color-scheme`. Logic lives in `src/lib/theme.svelte.ts`.

## Colour themes

Five to try, under **Colour** in the sidebar (and the phone drawer): **Violet** (the original), **Ocean** (blue to
cyan), **Forest** (green to teal), **Sunset** (pink to orange) and **Graphite** (slate, a restrained neutral). They
work in both light and dark, are remembered (`prova-accent`), and `?accent=ocean` picks one from a link.

How it works: the app's accent is Tailwind's `violet-*` (plus `indigo-700` in the hero gradient), so a colour theme just
points those variables at another palette (`html[data-accent='ocean'] { --color-violet-600: var(--color-blue-600); … }`).
No component knows about it. Forest and Graphite shift the darker shades up a step so white text stays readable;
every theme measures at least 4.5:1 for white on its primary button. To add or tweak one, edit `scripts/gen-accents.mjs`
and run `node scripts/gen-accents.mjs` (it writes `src/accents.css`). `app.css` imports Tailwind in pieces with
`theme(static)` so the whole default palette is always available as variables for the themes to point at.

## Scores (PDF)

Every Score points at `static/scores/sample.pdf`. PDFs are gitignored, so copy one there yourself
(`cp "your score.pdf" static/scores/sample.pdf`). pdf.js decodes scanned scores (JBIG2 / JPEG2000) with WebAssembly;
`pnpm install` copies those files to `static/pdfjs/wasm` (also gitignored) via `scripts/copy-pdfjs-wasm.mjs`.

## Bits UI used

Button, Slider, Switch + Label, Tabs, ToggleGroup, RadioGroup, Checkbox, Select, Progress, Accordion, Collapsible,
Dialog, AlertDialog, ContextMenu, DropdownMenu, Command, Popover, Avatar, Separator. Custom only where Bits has
nothing: the sidebar layout, tiles, badges, text inputs, file picker, PDF canvas.

Test data: Singer is Sam (Alto, Admin). Silvy has a saved Part Override (Tenor). Sicut Cervus has no tracks and
Hallelujah is Combined-only; both are in Winter Concert. Two sign-ups are pending in Admin.
