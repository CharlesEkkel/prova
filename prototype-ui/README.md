# PROTOTYPE v2 (throwaway): Prova UI, issue #12

Answers: "What should Prova's three main screens look like?" Redo of v1 (kept on branch `prototype/ui-v1`)
with Tailwind v4, Bits UI headless components, Lucide icons, a sidebar shell, and a real wide-screen layout.
Three structurally different variants per screen, switched with `?variant=A|B|C`, the ←/→ keys, or the floating
bar. Mock data only, no persistence, no real audio (time runs ×8). Not for merging into `main`.

    pnpm install && pnpm prototype      # needs Node 22.13+

Layout: below `lg` (1024px) it is the phone layout (header + drawer menu, mini player). At `lg` and up it is the
16:9 desktop layout (sidebar, wide content grids, full-width player bar). Try it at 390×844 and 1920×1080.

Round 3: settled so far: Home is a timeline with a hero for the next Performance; part info is the compact "what you'd
hear" label; the major Performance is the top banner (the Annual Gala is major). The thing under test now is the
**start-playing flow**: every Performance tile (hero, timeline cards, past ones, sidebar items, the banner, search
results) opens the same overview, instead of starting playback. The overview holds the play options, lets you tap a
Piece to start the play-through from it, and has a Play button at the bottom that starts from Piece 1.
`?overview=w1` opens it on load. Repertoire is its own page (`/repertoire`).

| Screen | Route | A | B | C |
| --- | --- | --- | --- | --- |
| Home (#17, #20, #21) | `/` | (single layout) | | |
| Repertoire (#20) | `/repertoire` | (single layout) | | |
| Piece (#18) | `/piece/p1` … | Track list + score | Player + part picker | Score-first |
| Play-through (#24) | `/perform/w1` | Now playing + queue | Setlist accordion | Score-first |

Bits UI used: Button, Slider (seek), Switch + Label (options), Tabs, ToggleGroup (Voice Part), Accordion, Collapsible,
Dialog (drawer, sheet, search), Command (search, Ctrl/Cmd+K), Popover, DropdownMenu, Avatar, Separator, Progress.
Custom only where Bits has nothing: sidebar layout, badges (KindBadge, PartDots), score mock, queue list.

Test data: Singer is Sam (Alto). Silvy has a Part Override (Tenor). Sicut Cervus has no tracks and Hallelujah is
Combined-only; both are in Winter Concert, so toggle "Skip Pieces with no Practice Tracks" and "Prefer Combined Tracks".
