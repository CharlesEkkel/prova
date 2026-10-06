# PROTOTYPE v2 (throwaway): Prova UI, issue #12

Answers: "What should Prova's three main screens look like?" Redo of v1 (kept on branch `prototype/ui-v1`)
with Tailwind v4, Bits UI headless components, Lucide icons, a sidebar shell, and a real wide-screen layout.
Three structurally different variants per screen, switched with `?variant=A|B|C`, the ←/→ keys, or the floating
bar. Mock data only, no persistence, no real audio (time runs ×8). Not for merging into `main`.

    pnpm install && pnpm prototype      # needs Node 22.13+

Layout: below `lg` (1024px) it is the phone layout (header + drawer menu, mini player). At `lg` and up it is the
16:9 desktop layout (sidebar, wide content grids, full-width player bar). Try it at 390×844 and 1920×1080.

Round 2 feedback applied: Home is now one timeline with a hero node for the next Performance (primary: play-through,
quiet secondary: Overview dialog; the Pieces are listed in the hero). Repertoire moved to its own page (`/repertoire`,
via the sidebar). Variants on Home are about Voice Part info density (A dots, B "what you'd hear", C none).
A second switcher (`major`, keys `[` / `]`, or `?major=A|B|C`) compares ways to highlight a **major Performance**
(new concept; the Annual Gala is major): A pinned sidebar card, B top banner, C header pill. Stars/badges show in lists in all three.

| Screen | Route | A | B | C |
| --- | --- | --- | --- | --- |
| Home (#17, #20, #21) | `/` | Part dots | What you'd hear | No part info |
| Repertoire (#20) | `/repertoire` | (single layout) | | |
| Piece (#18) | `/piece/p1` … | Track list + score | Player + part picker | Score-first |
| Play-through (#24) | `/perform/w1` | Now playing + queue | Setlist accordion | Score-first |

Bits UI used: Button, Slider (seek), Switch + Label (options), Tabs, ToggleGroup (Voice Part), Accordion, Collapsible,
Dialog (drawer, sheet, search), Command (search, Ctrl/Cmd+K), Popover, DropdownMenu, Avatar, Separator, Progress.
Custom only where Bits has nothing: sidebar layout, badges (KindBadge, PartDots), score mock, queue list.

Test data: Singer is Sam (Alto). Silvy has a Part Override (Tenor). Sicut Cervus has no tracks and Hallelujah is
Combined-only; both are in Winter Concert, so toggle "Skip Pieces with no Practice Tracks" and "Prefer Combined Tracks".
