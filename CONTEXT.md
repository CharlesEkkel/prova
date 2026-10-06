# Prova

A mobile-first web app where choir singers find and play practice audio for the pieces they are learning, organised around upcoming performances.

## Language

**Piece**:
A single musical work the choir is learning or performing.
_Avoid_: Song, track, number

**Voice Part**:
The section a singer sings in for a Piece (e.g. Soprano, Alto, Tenor, Bass).
_Avoid_: Part (ambiguous with Practice Track), section, voice

**Practice Track**:
An audio file attached to a Piece for rehearsal, either for one Voice Part or the full choir combined. A per-Voice-Part track is marked **part-only** (just that line) or **part-predominant** (that line louder over the rest); a Piece normally has only one of the two.
_Avoid_: Recording, part track, stem

**Combined Track**:
A Practice Track containing all Voice Parts together.
_Avoid_: Full mix, tutti

**Score**:
A document (e.g. PDF) of the written music for a Piece, uploaded alongside its Practice Tracks. A Piece can have several, each labelled, including instrumental Scores. One is marked as the **choir score**, the one shown to Singers during playback.
_Avoid_: Sheet music, chart

**Performance**:
A dated event the choir works toward, holding an ordered list of Pieces. A Piece may belong to several Performances and may have no Practice Tracks yet. Past ones are archived and the default view lists upcoming ones.
_Avoid_: Milestone, event, gig, concert

**Singer**:
A signed-in choir member who listens to Practice Tracks and has a default Voice Part.
_Avoid_: Member, user

**Part Override**:
A Singer's saved, per-Piece choice of a different Voice Part from their default, e.g. for a divisi split or a Bass covering a Tenor line.
_Avoid_: Exception, custom part

## Access

**Permission**:
A single capability: `read`, `append` (add new Pieces, Practice Tracks and Scores, never alter existing ones), `update` (edit names, labels and Performance tags only), `delete`, or `manage-users`.
_Avoid_: Right, privilege

**Role**:
A named, composable bundle of Permissions granted to a Singer by an Admin or by an Invite Link.
_Avoid_: Tier, level, group

**Admin**:
A Singer holding every Permission. The first sign-in whose verified email matches the configured admin email is granted it; the grant persists even if that setting later changes.
_Avoid_: Owner, superuser

**Invite Link**:
A shareable link that grants a fixed set of Roles to anyone who signs up through it. Revocable, with an optional expiry and use cap, and never able to grant `delete` or `manage-users`.
_Avoid_: Invitation code, signup link
