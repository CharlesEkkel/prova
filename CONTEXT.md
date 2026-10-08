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

**Home**:
The first screen after signing in: a timeline of Performances showing what is coming and when, upcoming by default with past ones collapsed above a Today marker.
_Avoid_: Dashboard, landing page

**Repertoire**:
The list of every Piece the choir has, including those in no Performance and those with no Practice Tracks yet. Has its own page.
_Avoid_: Library, catalogue, song list

**Play-through**:
Playing a Performance's Pieces in order, from the first Piece. Two options, both off by default: skip Pieces with no usable Practice Track (otherwise it pauses at an empty Piece), and prefer Combined Tracks (off: it plays the Singer's part track and falls back to the Combined Track; on: the reverse, the Combined Track falling back to the Singer's part track). Started from the Performance Overview.
_Avoid_: Playlist, queue, autoplay

**Singer**:
A person who has signed in with Google, recorded on first sign-in. Once approved, a choir member who listens to Practice Tracks and has a default Voice Part.
_Avoid_: Member, user

**Pending Singer**:
A Singer without the `read` Permission, who sees only the waiting-for-approval screen until an Admin approves them.
_Avoid_: Pending user, unapproved user, guest

**Part Override**:
A Singer's saved, per-Piece choice of a different Voice Part from their default, e.g. for a divisi split or a Bass covering a Tenor line. It is made from the indicator showing which part is playing, since overriding is rare. Choosing to play the Combined Track once is not a Part Override and is not saved.
_Avoid_: Exception, custom part

## Access

**Permission**:
A single capability: `read`, `append` (add new Pieces, Practice Tracks, Scores and Performances, including tagging them as they are first added, never alter existing ones), `update` (edit names, labels and Performance tags, and reorder a Performance's Pieces, only; this includes marking a Performance major), `delete`, `manage-users` (run the admin portal: approving Singers, Roles, Invite Links, removing Singers and the Colour Theme), or `manage-admins` (grant or revoke `manage-users`, directly or through a Role, and remove or change the Roles of a Singer who holds it; held only by an Owner). A Singer is only shown the actions their Permissions allow.
_Avoid_: Right, privilege

**Role**:
A named, composable bundle of Permissions granted to a Singer by an Admin or Owner, or by an Invite Link. A Role holding `manage-users` can only be created, changed or granted by an Owner; no Role can hold `manage-admins`.
_Avoid_: Tier, level, group

**Admin**:
A built-in, locked Role holding every Permission except `manage-admins`. Only an Owner can grant or remove it. An Owner is given Admin when they become one, so if they stop being an Owner they stay an Admin.
_Avoid_: Superuser

**Owner**:
A Singer whose verified Google email is one of the owner emails in the deployment's configuration. Owner is not granted in the app: it follows that list live, so a Singer is an Owner exactly while their email is on it, and holds every Permission including `manage-admins`. Removing an email demotes that Owner to an Admin. An Owner cannot be removed or have their Roles changed in the app.
_Avoid_: Admin email, superuser

**Admin portal**:
The screens a Singer with `manage-users` uses to run the choir: approving Pending Singers, Roles, Singers, Invite Links and the Colour Theme. Reached from the "Admin" item in the navigation. Not the same thing as the **Admin** Role, which is a set of Permissions.
_Avoid_: Dashboard, back office

**Invite Link**:
A shareable link that grants a fixed set of Roles to anyone who signs up through it. Revocable, with an optional expiry and use cap, and never able to grant `delete`, `manage-users` or `manage-admins`.
_Avoid_: Invitation code, signup link

## Appearance

**Colour Theme**:
The palette the whole app is shown in, chosen once for the entire choir by a Singer with `manage-users`. One of Forest, Violet, Ocean, Sunset or Graphite, with Forest the default. It is a site setting stored in the database, so everyone sees the same one, including a visitor who has not signed in, and no Singer can pick their own.
_Avoid_: Skin, accent, brand colour

**Display Mode**:
A Singer's own choice of Light, Dark or System (follow the device) appearance. Remembered per device, not per Singer, so it does not follow a Singer to another device. Independent of the Colour Theme.
_Avoid_: Theme (ambiguous with Colour Theme), dark mode toggle
