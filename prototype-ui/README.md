# PROTOTYPE (throwaway): Prova UI, issue #12

Answers: "What should Prova's three main screens look like?" Three radically different variants per screen,
switched with `?variant=A|B|C`, the ←/→ keys, or the floating bottom bar. Mock data only, no persistence,
no real audio (time runs ×8 so auto-advance is quick). Not for merging into `main`.

    cd prototype-ui && pnpm install && pnpm prototype

(pnpm needs Node 22.13 or newer.)

| Screen | Route | A | B | C |
| --- | --- | --- | --- | --- |
| Home (#17, #20, #21) | `/` | Stacked cards | Timeline | Hero + tabs |
| Piece + player (#18) | `/piece/p1` (p2..p6 via links) | Part-first list | Player + part picker | Score-first |
| Play-through (#24) | `/perform/w1` | Now playing | Setlist | Score-first |

Test pieces: p1 part-predominant, p2 part-only, p3 Part Override (Alto singer covers Tenor), p4 no tracks,
p5 Combined only. Performance w1 includes the empty Piece p4: toggle "Skip Pieces with no Practice Tracks"
and "Prefer Combined Tracks" to see the resolver behaviour. Singer is Sam, Alto.
