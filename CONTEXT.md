# Prova

A mobile-first web app where choir singers find and play practice audio for the pieces they are learning, organised around upcoming performances.

## Language

**Piece**:
A single musical work the choir is learning or performing. Has a title, a composer (both required) and optional Conductor's Notes. Two Pieces may share a title, but not a title and composer together, ignoring case and extra spaces. Deleting a Piece takes its Practice Tracks and Scores with it and removes it from every Performance.
_Avoid_: Song, track, number

**Voice Part**:
The section a singer sings in for a Piece (e.g. Soprano, Alto, Tenor, Bass). A label can carry a number, such as Alto 1 and Alto 2, for a divisi split. Each also has a short label for compact screens, by default its first letter plus any number (A1, T2, and A for a plain Alto), and the Combined Track is labelled All. The list is the choir's own, edited by a Singer with `manage-users`, in an order they set that every picker follows. Short labels are unique within the choir ignoring case, and All is reserved for the Combined Track, so no Voice Part can take it as a label or a name. Removing a Voice Part sends the Singers whose default it was back to choose again, and the last one cannot be removed.
_Avoid_: Part (ambiguous with Practice Track), section, voice

**Conductor's Notes**:
Optional free text on a Piece giving general directions to every Singer, such as "sing brightly". One block per Piece, plain text, not specific to a Voice Part. Written by a Singer with `append` when first adding the Piece, and edited afterwards by one with `update`.
_Avoid_: Comments, annotations, instructions

**Practice Track**:
An audio file (MP3 or M4A, up to the choir's upload limit, 10 MB unless configured otherwise) attached to a Piece for rehearsal, either for one Voice Part or the full choir combined. A per-Voice-Part track is marked **part-only** (just that line) or **part-predominant** (that line louder over the rest); a Piece normally has only one of the two. Each has an optional label (up to 60 characters, such as "slow tempo") and, when it could be read at upload, a length. Uploads are append-only: the file of a track is never replaced, only its label edited or the track deleted. When a Piece has several tracks for the same Voice Part, or several Combined Tracks, the first uploaded is the one played.
_Avoid_: Recording, part track, stem

**Combined Track**:
A Practice Track containing all Voice Parts together. It is what plays first on a Piece: the Singer's part track plays only when the Piece has no Combined Track, or when the Singer has asked for it (a Preferred Part, or the Play-through option below).
_Avoid_: Full mix, tutti

**Score**:
A PDF of the written music for a Piece, uploaded alongside its Practice Tracks, up to the choir's Score upload limit (20 MB unless configured otherwise), which is separate from the Practice Track limit because scanned scores are larger than audio. A Piece can have several, each labelled, including instrumental Scores. At most one is marked as the **choir score**: the one the choir treats as its own, offered first on the player and followed through a Play-through. A Score is never opened for a Singer, who may use their own music; they open it on request. Marking a choir score at upload needs `append` only when the Piece has none, and replacing one needs `update`. Deleting the choir score leaves the Piece without one.
_Avoid_: Sheet music, chart

**Performance**:
An event with a name, a start and an end (each a date and time, the end after the start) and an optional venue, that the choir works toward, holding an ordered list of Pieces. A Piece may belong to several Performances, appears at most once in each, and may have no Practice Tracks yet. A Performance is upcoming until it has ended and past after that; past ones are archived, the default view lists upcoming ones, and a past Performance can still be edited. Names need not be unique, but two Performances may not share a name and a start together, ignoring case and extra spaces. Created by a Singer with `append` (who may add its first Pieces and mark it major); its name, times, venue and Pieces are changed afterwards by one with `update`.
_Avoid_: Milestone, event, gig, concert

**Choir Time Zone**:
The one time zone the whole choir's Performance times are entered and shown in, whatever a Singer's device says. Chosen by a Singer with `manage-users`, a site setting like the Colour Theme.
_Avoid_: Local time, device time zone

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
The list of every Piece the choir has, including those in no Performance and those with no Practice Tracks yet, which are visibly marked. Sorted A to Z. Has its own page.
_Avoid_: Library, catalogue, song list

**Play-through**:
Playing a Performance's Pieces in order, from the first Piece. Two options, both off by default: skip Pieces with no usable Practice Track (otherwise it pauses at an empty Piece), and prefer my Voice Part (off: it plays the Combined Track and falls back to the Singer's part track; on: the reverse, the Singer's part track falling back to the Combined Track). A Preferred Part on a Piece wins over both. Started from the Performance Overview.
_Avoid_: Playlist, queue, autoplay

**Singer**:
A person who has signed in with Google, recorded on first sign-in. Once approved, a choir member who listens to Practice Tracks and has a default Voice Part.
_Avoid_: Member, user

**Pending Singer**:
A Singer without the `read` Permission, who sees only the waiting-for-approval screen until an Admin approves them.
_Avoid_: Pending user, unapproved user, guest

**Preferred Part**:
A Singer's saved, per-Piece choice of a Voice Part to hear on that Piece instead of the Combined Track, e.g. their own part, a divisi split or a Bass covering a Tenor line. It can be any Voice Part, including the Singer's own. It is made from the part indicator with "Prefer this track in future", since it is rare; choosing a part just to play it once is not a Preferred Part and is not saved. It plays in place of the Combined Track, and takes the place of the Singer's default Voice Part when a Piece has no Combined Track.
_Avoid_: Part Override, override, exception, custom part

**Part indicator**:
The control on a Piece's player showing what would play (`All` for the Combined Track, or a Voice Part with `only` or `+ mix` for its kind). Opening it lists `All` and the Voice Parts that have a Practice Track on that Piece, so a Singer can play one once or prefer it in future.
_Avoid_: Part picker, track selector

## Access

**Permission**:
A single capability: `read`, `append` (add new Pieces, Practice Tracks, Scores and Performances, including tagging them as they are first added, never alter existing ones), `update` (edit names, labels and Performance tags, and reorder a Performance's Pieces, only; this includes marking a Performance major), `delete`, `manage-users` (run the admin portal: approving Singers, Roles, Invite Links, removing Singers, editing the Voice Parts and the Colour Theme), or `manage-admins` (grant or revoke `manage-users`, directly or through a Role, and remove or change the Roles of a Singer who holds it; held only by an Owner). A Singer is only shown the actions their Permissions allow.
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
The screens a Singer with `manage-users` uses to run the choir: approving Pending Singers, Roles, Singers, Invite Links, the Voice Parts and the Colour Theme. Reached from the "Admin" item in the navigation. Not the same thing as the **Admin** Role, which is a set of Permissions.
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
