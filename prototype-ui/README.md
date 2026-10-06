# PROTOTYPE (throwaway): Prova UI, issue #12

Answers: "What should Prova's main screens look like?" Built with Tailwind v4, Bits UI headless components, Lucide
icons and pdf.js. Mock data only, no persistence, no real audio (time runs ×8 so auto-advance is quick).
Not for merging into `main`. Earlier rounds are on `prototype/ui-v1` and in this branch's history.

    pnpm install && pnpm prototype      # needs Node 22.13+

Layout: below `lg` (1024px) it is the phone layout (header + drawer menu). At `lg` and up it is the 16:9 desktop
layout (sidebar, wide grids). Try 390×844 and 1920×1080.

## What is settled

- **Home** (`/`): a timeline with the next Performance as a hero. The hero's only action is `Overview`.
  Part info is the compact "what you'd hear" label. The major Performance (the Annual Gala) is a banner across the top.
- **Repertoire** (`/repertoire`): its own page, from the sidebar. Search is Ctrl/Cmd+K.
- **Starting a Performance**: every Performance tile opens one overview (play options, tap a Piece to play from it,
  Play at the bottom). `?overview=w1` opens it on load.
- **One player screen** (`PlayerScreen.svelte`) is used for both:
  - `/perform/<id>`: Performance play-through, with the running order beside it.
  - `/piece/<id>`: a single Piece, same screen with a Start button and no running order.
  - The Voice Part being played is shown as a small indicator (e.g. "Alto + mix"). Overriding is rare, so it is only
    reachable by clicking that indicator: choose another part (saved as a Part Override; ALL plays the Combined
    Track once). The track switches without losing your place.
- **Score**: many Singers read their own physical music, so it is never opened for you. It is a collapsed panel on
  the player; "Open full screen" shows the real PDF fullscreen. Fullscreen leaves when the song ends or you close it
  (in a Performance it follows you to the next Piece while open, and leaves when the Performance finishes or pauses
  at an empty Piece). Page turns: edge buttons, swipe, arrow / Page keys. The current page is remembered per Score
  for the playback session, so closing and reopening returns to the same page, and the panel shares that page.

## Scores (PDF)

Every Score points at `static/scores/sample.pdf`. PDFs are gitignored, so copy one there yourself
(`cp "your score.pdf" static/scores/sample.pdf`). pdf.js decodes scanned scores (JBIG2 / JPEG2000) with WebAssembly;
`pnpm install` copies those files to `static/pdfjs/wasm` (also gitignored) via `scripts/copy-pdfjs-wasm.mjs`.

## Bits UI used

Button, Slider (seek), Switch + Label (options), Tabs, ToggleGroup (Voice Part, Score picker), Accordion, Collapsible,
Dialog (drawer, overview, fullscreen score), Command (search), Popover, DropdownMenu, Avatar, Separator, Progress.
Custom only where Bits has nothing: the sidebar layout, tiles, badges, queue list, PDF canvas.

Test data: Singer is Sam (Alto). Silvy has a saved Part Override (Tenor). Sicut Cervus has no tracks and Hallelujah is
Combined-only; both are in Winter Concert, so toggle "Skip Pieces with no Practice Tracks" and "Prefer Combined Tracks".
