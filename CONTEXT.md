# Prova

A mobile-first web app where choir singers find and play practice audio for the pieces they are learning, organised around upcoming performances.

## Language

**Piece**:
A single musical work the choir is learning or performing.
_Avoid_: Song, track, number

**Voice Part**:
The section a singer sings in for a Piece (e.g. Soprano, Alto, Tenor, Bass). A label can carry a number, such as Alto 1 and Alto 2, for a divisi split. Each also has a short label for compact screens, by default its first letter plus any number (A1, T2, and A for a plain Alto), and the Combined Track is labelled All.
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
An event with a start and an end (each a date and time) that the choir works toward, holding an ordered list of Pieces. A Piece may belong to several Performances and may have no Practice Tracks yet. A Performance is upcoming until it has ended and past after that; past ones are archived and the default view lists upcoming ones.
_Avoid_: Milestone, event, gig, concert

**Major Performance**:
A Performance the choir singles out. Any number can be major. Each is highlighted wherever Performances appear, and a banner on every screen shows the closest upcoming one (the earliest start among those not yet ended), so it is always one tap away. A Singer with `update` marks it, or a Singer with `append` when first creating the Performance.
_Avoid_: Featured, pinned, headline

**Performance Overview**:
The view opened by tapping any Performance. It lists the Performance's Pieces, holds the Play-through options, and is the only place a Play-through is started. Tapping a Piece in it opens that Piece on its own, exactly as if opened from the repertoire.
_Avoid_: Details page, preview

**Play-through**:
Playing a Performance's Pieces in order, from the first Piece. Two options, both off by default: skip Pieces with no usable Practice Track (otherwise it pauses at an empty Piece), and prefer Combined Tracks (off: it plays the Singer's part track and falls back to the Combined Track; on: the reverse, the Combined Track falling back to the Singer's part track). Started from the Performance Overview.
_Avoid_: Playlist, queue, autoplay

**Singer**:
A signed-in choir member who listens to Practice Tracks and has a default Voice Part.
_Avoid_: Member, user

**Part Override**:
A Singer's saved, per-Piece choice of a different Voice Part from their default, e.g. for a divisi split or a Bass covering a Tenor line. It is made from the indicator showing which part is playing, since overriding is rare. Choosing to play the Combined Track once is not a Part Override and is not saved.
_Avoid_: Exception, custom part

## Access

**Permission**:
A single capability: `read`, `append` (add new Pieces, Practice Tracks, Scores and Performances, including tagging them as they are first added, never alter existing ones), `update` (edit names, labels and Performance tags, and reorder a Performance's Pieces, only; this includes marking a Performance major), `delete`, or `manage-users` (run the admin portal: Roles, Invite Links, removing Singers and the Colour Theme). A Singer is only shown the actions their Permissions allow.
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

## Appearance

**Colour Theme**:
The palette the whole app is shown in, chosen once for the entire choir by a Singer with `manage-users`. One of Forest, Violet, Ocean, Sunset or Graphite, with Forest the default. It is a site setting stored in the database, so everyone sees the same one, including a visitor who has not signed in, and no Singer can pick their own.
_Avoid_: Skin, accent, brand colour

**Display Mode**:
A Singer's own choice of Light, Dark or System (follow the device) appearance. Remembered per device, not per Singer, so it does not follow a Singer to another device. Independent of the Colour Theme.
_Avoid_: Theme (ambiguous with Colour Theme), dark mode toggle
