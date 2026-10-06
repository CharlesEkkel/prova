# Prova MVP

Status: ready-for-agent

## Problem Statement

Choir singers learn their music between rehearsals, but the practice audio is scattered across chat threads, email attachments and cloud folders. Finding the right track for your section means hunting through messages. A singer wants their own Voice Part first, but sometimes the whole choir together. Nothing groups Pieces by the Performance they are being prepared for, so singers can't easily run through a concert in order. Scores live somewhere else again. The choir director and trusted singers have no controlled way to add material, and no way to give different singers different levels of trust.

## Solution

Prova is an open-source, mobile-first web app (installable as a PWA) where a single choir keeps its Pieces, Practice Tracks and Scores in one place. Singers sign in with Google, choose their default Voice Part, and see their own tracks first for each Piece, with Combined Tracks always available. Pieces are grouped into Performances, and a Singer can play through a whole Performance in order, with options for how tracks and empty Pieces are handled. Access is controlled by composable Roles, built from five Permissions, and granted manually by an Admin or automatically through Invite Links. Each choir runs its own deployment. The author's choir runs on Supabase cloud and Cloudflare Pages.

## User Stories

### Signing in and access

1. As a new Singer, I want to sign in with my Google account, so that I don't need another password.
2. As a new Singer with no Roles, I want to see a clear "waiting for approval" screen with a note to contact an Admin, so that I know what to do next and that nothing is broken.
3. As an Admin, I want users with no Roles to be unable to read any Pieces, Practice Tracks, Scores or Performances at the backend level, so that unapproved sign-ups never see the choir's material even by calling the API directly.
4. As an Admin, I want to see a list of pending sign-ups, so that I can assign Roles quickly.
5. As an Admin, I want to assign and remove Roles for any Singer, so that I can control who can do what.
6. As an Admin, I want to build Roles as named bundles of Permissions (`read`, `append`, `update`, `delete`, `manage-users`), so that I can express different levels of trust.
7. As an Admin, I want an Admin to hold every Permission, so that the person running the choir is never blocked.
8. As the person deploying Prova, I want to set one admin email in configuration, so that I become the first Admin without touching the database by hand.
9. As the person deploying Prova, I want the admin grant to apply only when Google reports the email as verified, so that nobody can claim Admin with an unverified address.
10. As the person deploying Prova, I want the admin grant to persist if I later change the admin email, so that the previous Admin keeps access until their user is edited or removed.
11. As the person deploying Prova, I want setup instructions that include seeding the admin email in the database, so that I can get a new instance running.
12. As an Admin, I want to promote another Singer to hold all Permissions, so that I can have a second effective admin without a second admin email.
13. As an Admin, I want to remove a Singer from the choir, so that people who leave lose access.
14. As a Singer, I want to sign out, so that I can use a shared device safely.

### Invite Links

15. As an Admin, I want to create an Invite Link that grants a chosen set of Roles, so that I can onboard singers without approving each one.
16. As an Admin, I want an Invite Link to be revocable at any time, so that a leaked link stops working.
17. As an Admin, I want to set an optional expiry on an Invite Link, so that old links stop working on their own.
18. As an Admin, I want to set an optional maximum number of uses, so that a link can't be shared widely.
19. As an Admin, I want Invite Links to be unable to grant `delete` or `manage-users`, so that a leaked link can't hand out destructive or administrative power.
20. As a new Singer, I want to open an Invite Link, sign in with Google and immediately receive the Roles it grants, so that I can start listening straight away.
21. As a new Singer, I want a clear message if an Invite Link is expired, revoked or used up, so that I know to ask for a new one.
22. As an Admin, I want to see each Invite Link's remaining uses, expiry and who redeemed it, so that I can manage them.
23. As an Admin, I want redeeming a link to grant Roles atomically, so that a limited-use link can't be over-redeemed by simultaneous clicks.

### Voice Parts and Part Overrides

24. As a Singer, I want to choose my default Voice Part at first sign-in, so that Prova shows my tracks first.
25. As a Singer, I want to change my default Voice Part at any time from my profile, so that I'm not stuck if I move sections.
26. As an Admin, I want to define the Voice Part labels for the choir, starting with Soprano, Alto, Tenor and Bass, so that the choir's real sections are used.
27. As a Singer, I want to set a Part Override for a specific Piece, so that I can follow a divisi split or cover another line.
28. As a Bass singer, I want a Part Override to be able to choose any Voice Part, so that I can sing a Tenor line on one Piece.
29. As a Singer, I want my Part Overrides saved to my account, so that they follow me across devices.
30. As a Singer, I want to clear a Part Override, so that the Piece falls back to my default Voice Part.
31. As a Singer, I want my Part Overrides to be private to me, so that other Singers' choices don't affect what I see.

### Pieces, Practice Tracks and Scores

32. As a Singer with `append`, I want to add a new Piece, so that the choir has a place for it.
33. As a Singer with `append`, I want to upload a Practice Track to an existing Piece, so that I can contribute material without being able to damage what's there.
34. As an uploader, I want to say which Voice Part a Practice Track is for, or that it is a Combined Track, so that it appears in the right place.
35. As an uploader, I want to mark a per-Voice-Part track as part-only or part-predominant, and be required to choose, so that singers know what they are listening to.
36. As an uploader, I want a free-text label on each track, so that I can describe it (for example "slow tempo").
37. As an uploader, I want the app to tell me clearly which file types are accepted (MP3 and M4A for tracks, PDF for Scores) and the 10 MB limit before I choose a file, so that I don't waste time on an upload that will fail.
38. As an uploader, I want a clear error if my file is too large or the wrong type, so that I know how to fix it.
39. As the choir, I want file type and size limits enforced at the backend, so that they can't be bypassed by a modified client.
40. As an uploader, I want to attach several Scores to a Piece, each with a label, so that full, vocal and instrumental scores can all live there.
41. As an uploader, I want to mark one Score as the choir score, so that Singers see the right one during playback.
42. As a Singer with `update`, I want to edit names, labels, Voice Part labels on tracks and Performance tags, so that I can fix mistakes.
43. As a Singer with `update`, I want `update` to be unable to replace an uploaded file, so that audio and Scores are never silently changed.
44. As a Singer with `append`, I want to be unable to modify or delete my own or anyone's existing upload, so that the rules are predictable.
45. As an Admin or a Singer with `delete`, I want to delete a Practice Track or Score, so that wrong uploads can be removed.
46. As a Singer with `delete`, I want to delete a Piece, so that obsolete repertoire doesn't clutter the list.
47. As a Singer, I want to see which Pieces have no Practice Tracks yet, so that I know material is still to come.

### Performances

48. As a Singer with `append`, I want to create a Performance with a name and date, so that the choir can organise Pieces around it.
49. As a Singer with `update`, I want to add a Piece to a Performance and remove it again, so that I can keep the line-up current.
50. As a Singer with `update`, I want to reorder the Pieces in a Performance, so that the play-through follows the real running order.
51. As a Singer, I want a Piece to belong to several Performances, so that repertoire can be reused.
52. As a Singer, I want a Performance to include Pieces that have no uploads, so that the choir can track progress.
53. As a Singer, I want to see upcoming Performances by default, so that I see what matters now.
54. As a Singer, I want to switch to past Performances, so that I can look back at earlier repertoire.
55. As a Singer, I want a timeline view of Performances, so that I can see what is coming and when.
56. As a Singer, I want a general repertoire list showing every Piece, including those in no Performance, so that nothing is hidden.
57. As a Singer, I want to filter Pieces by Performance, so that I can focus on one concert's material.

### Listening and playback

58. As a Singer, I want the tracks for my Voice Part shown first on each Piece, so that I find what I need quickly.
59. As a Singer, I want the Combined Track always visible too, so that I can hear the whole choir when I want.
60. As a Singer, I want to play, pause and seek within a track, so that I can repeat a hard section.
61. As a Singer, I want a track to keep playing with my phone locked or the app in the background, so that I can practise while doing something else.
62. As a Singer, I want lock-screen and media-key controls, so that I can pause without opening the app.
63. As a Singer, I want to open the choir score for the Piece I'm listening to, so that I can follow along.
64. As a Singer, I want to open any other Score for a Piece, so that I can see instrumental parts too.
65. As a Singer, I want to play through a whole Performance in order, so that I can rehearse the concert as a set.
66. As a Singer, I want an option to skip Pieces with no usable track during play-through, off by default, so that I can choose between pausing and moving on.
67. As a Singer, I want, with that option off, play-through to pause at an empty Piece until I choose to continue, so that I notice what is missing.
68. As a Singer, I want an option to prefer Combined Tracks during play-through, off by default, so that I can choose to hear the full choir.
69. As a Singer, I want, with that option off, play-through to prefer my part-specific track and fall back to the Combined Track when none exists, so that I always hear something useful.
70. As a Singer, I want play-through to honour my Part Overrides, so that I hear the line I actually sing.
71. As a Singer, I want the choir score shown during play-through when one exists, so that I can follow the music.
72. As a Singer, I want to see which Piece is playing and what comes next, so that I know where I am in the set.
73. As a Singer, I want to skip forwards or back between Pieces during play-through, so that I can move around.

### Mobile, PWA and performance

74. As a Singer, I want the app to work well on a phone screen, so that I can use it where I practise.
75. As a Singer, I want to install the app to my home screen, so that it opens like a normal app.
76. As a Singer, I want replaying a track I've already played to reuse the data where the browser allows, so that I don't use my mobile data again.
77. As a Singer, I want access links to tracks to stay valid for about a day, so that seeking and replaying don't break.
78. As a Singer, I want those links to be specific to me and to the track, so that sharing a link doesn't expose the whole library.

### Operating the project

79. As the project owner, I want the app to stay alive on Supabase's free tier, so that the choir isn't greeted by a paused project after a quiet spell.
80. As the project owner, I want deployment to run from GitHub Actions to Cloudflare Pages, so that releases are repeatable.
81. As an open-source user, I want to deploy Prova for my own choir from clear documentation, so that I can run it without the author's help.
82. As an open-source user, I want the documented free-tier limits (storage, egress, file size, project pausing) in the README, so that I can plan for them.

## Implementation Decisions

- **Deployment shape.** One deployment serves exactly one choir. There is no multi-tenancy.
- **Backend.** Supabase (Postgres, Google sign-in, one private storage bucket). The project starts on Supabase cloud's free tier and may later move to self-hosted Supabase, so the design uses plain Postgres, row-level security and the standard storage API, and avoids Edge Functions.
- **Frontend.** SvelteKit, built for Cloudflare with the Cloudflare adapter and hosted on Cloudflare Pages, mobile-first and installable as a PWA. It avoids Cloudflare-specific bindings so another adapter can be swapped in. No Docker is used for the frontend or its deployment.
- **Repository.** One repository holds the app, the database migrations and the deployment workflow. Deployment runs from GitHub Actions. The author's secrets live in GitHub and Cloudflare, not in the repo.
- **Domain vocabulary.** Code, schema and UI use the terms in the project glossary: Piece, Voice Part, Practice Track, Combined Track, Score, Performance, Singer, Part Override, Permission, Role, Admin, Invite Link. "Performance" is used everywhere, including the UI.
- **Permission model.** Five Permissions: `read`, `append`, `update`, `delete`, `manage-users`. A Role is a named bundle of Permissions. A Singer can hold several Roles. A Singer holding no Roles can read nothing. An Admin holds every Permission.
  - `append` adds new Pieces, Practice Tracks, Scores and Performances, and can never modify or delete existing ones, including the Singer's own.
  - `update` edits names, labels, Voice Part labels, Performance tags, Performance membership and order. It never replaces uploaded files.
  - `delete` removes Pieces, Practice Tracks, Scores and Performances.
  - `manage-users` manages Roles, Invite Links and removal of Singers.
- **Enforcement.** All Permissions are enforced in the database by row-level security and storage policies, not only in the UI. A Singer with no Roles cannot read the data via the API.
- **Admin bootstrap.** The admin email is stored as a configuration row in the database, seeded during setup. A database function grants Admin on first sign-in when the signed-in email matches and Google reports it as verified. The grant is permanent unless the user is edited or removed. The setup documentation must include seeding this row. Only one admin email is supported.
- **Invite Links.** Created by a Singer with `manage-users`. Each carries a set of Roles, an optional expiry, an optional use cap, and a revoked flag. Redemption is a database function called by the signed-in new user, which atomically checks validity, records the use and grants the Roles. A link can never grant `delete` or `manage-users`, enforced in the database.
- **Voice Parts.** Voice Parts are a configurable list per choir, seeded with Soprano, Alto, Tenor, Bass. A Singer has one default Voice Part, set at first sign-in and editable in their profile. A Part Override is a per-Singer, per-Piece Voice Part choice, private to that Singer, which may be any Voice Part.
- **Practice Tracks.** Each belongs to one Piece and is either a Combined Track or for one Voice Part. A per-Voice-Part track has a required kind of part-only or part-predominant. A track also has a free-text label. Accepted types are MP3 and M4A.
- **Scores.** A Piece may have any number of Scores, each with a label (including instrumental Scores). Exactly one per Piece may be marked the choir score. Accepted type is PDF.
- **Upload limits.** A single 10 MB limit and the accepted types are enforced by the storage bucket's own configuration, and explained in the UI before upload. Limits are configured in one place so they can later be split by file kind.
- **Performances.** A Performance has a name and date and an ordered list of Pieces. A Piece may be in many Performances, and may have no tracks. The order belongs to the Performance. The default view shows upcoming Performances, with past ones available. The MVP has a timeline view and no calendar.
- **Play-through.** A single resolver module takes a Performance's ordered Pieces, the Singer's default Voice Part and Part Overrides, and two options, and returns what to play for each Piece. Options: skip empty Pieces (default off, in which case playback pauses at an empty Piece) and prefer Combined Tracks (default off, in which case the Singer's part track is preferred, falling back to the Combined Track). The choir score is shown when present. The resolver is pure and has no knowledge of storage or the UI.
- **Storage access module.** All access to audio and Score files goes through one small module, so that storage can later move (for example to Cloudflare R2) without touching the rest of the app.
- **Access links.** Files are private. The app requests a signed link per track for the signed-in Singer with an expiry of about 24 hours, and reuses the same link until close to expiry so the browser can cache repeated plays and seeks. Uploads set a long cache lifetime. Caching of seeks is best effort, especially on iOS Safari.
- **Keep-alive.** A scheduled GitHub Actions workflow pings the Supabase project regularly to prevent free-tier pausing.
- **Documentation.** The README documents setup (including seeding the admin email), deployment to Cloudflare Pages, the free-tier limits (storage, egress, per-file size, pausing), and a recommendation to encode tracks at about 128 kbps.

## Testing Decisions

Good tests exercise external behaviour through a seam and never reach into implementation details, such as table internals or component state. There are three seams.

1. **Backend contract against a real local Supabase.** Tests start the local Supabase stack, sign in as users holding different Roles, and call the same client API the app uses. They cover:
   - every Permission's allowed and denied operations;
   - append-only behaviour for uploads;
   - `update` being unable to replace a file;
   - a Singer with no Roles reading nothing;
   - Invite Link redemption (valid, expired, revoked, used up, over-redeemed concurrently, and attempts to grant forbidden Permissions);
   - admin bootstrap, including unverified emails and the change-of-email persistence;
   - Part Overrides being private to each Singer;
   - file type and 10 MB size limits being enforced at the backend.
2. **The play-through resolver, as a pure function.** Table-driven tests cover:
   - both option flags in all four combinations;
   - Part Overrides;
   - Pieces with no tracks, with only Combined Tracks, and with only part tracks;
   - part-only versus part-predominant tracks;
   - the choir score being present or absent;
   - an empty Performance.
3. **Browser end-to-end tests with Playwright against the local Supabase stack.** These cover the main user flows:
   - signing in and the waiting-for-approval screen;
   - redeeming an Invite Link;
   - choosing a Voice Part;
   - uploading a track and a Score, including the rejection messages;
   - playing a track and a Performance play-through;
   - the pause at an empty Piece.
   These tests keep the suite small and avoid testing visual details.

There is no prior art in the repository, which is empty. The first slice should set up the test harness for all three seams.

## Out of Scope

- Offline playback and downloading tracks (planned after the MVP, with storage kept behind one module so it can be added).
- A calendar view (the MVP has a timeline view only).
- Transcoding or re-encoding audio on upload.
- Multiple choirs on one deployment.
- Separate size limits per file kind (a single limit, configured in one place).
- Per-Piece sectional splits as a fixed taxonomy (Part Overrides cover them).
- Recording audio in the app, pitch feedback, or any LLM features.
- Multiple admin emails.
- A Docker image for self-hosting (the Cloudflare deployment is the supported path; an `adapter-node` Docker option may come later).
- A grace period for editing or removing an upload shortly after it is made.
- Notifications or email.

## Further Notes

- The free-tier limits to verify before launch: about 1 GB storage, about 5 GB egress a month, a project pause after about a week of inactivity, and a per-file upload cap. The figures were recalled from memory and need checking against Supabase's current documentation.
- Egress is the likeliest limit to be hit near a Performance. Encoding at about 128 kbps and reusing signed links reduce it. If it is exceeded, the options are Supabase Pro or moving audio to Cloudflare R2.
- The project name is Prova (Italian for "rehearsal"). A repository named `prova-choir` is the fallback if `prova` is taken. Check name, domain and trademark availability before publishing.
- The keep-alive workflow is included on the assumption that the user's cut-off answer meant yes. Confirm this.
- The first slice should be a tracer bullet: sign in, a Piece, one uploaded Practice Track, and playback, with the three test seams set up.
