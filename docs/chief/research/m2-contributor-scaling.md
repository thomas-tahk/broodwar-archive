# M2 research: scaling contributors without a curator bottleneck

Researched 2026-11-08 from official pages. Discogs and Liquipedia help pages returned HTTP 403 to automated fetch, so those two sections are NOT verified from primary sources (marked below). Check them by hand before relying on them.

## MusicBrainz (verified)
- Anyone can submit an edit. Edits sit open 7 days; other editors vote Yes/No/Abstain. Applied if No votes < Yes votes (or zero No); rejected if No >= Yes. A No vote needs an edit note.
- Shortcuts: 3 unanimous Yes applies early; an auto-editor's approval applies at once. Removals/merges ("destructive") stay open at least 48h. A No vote extends the clock to 72h.
- Voting right: account older than 2 weeks, verified email, 10+ accepted (voted-through) edits.
- Auto-editor: nominated by an existing auto-editor, then community vote. Must follow the code of conduct, know the style guide, judge objectively.
- Lesson: trust is earned by accepted work; a small trusted tier skips the queue; risky edits (deletes) get slower, stricter handling.
- https://musicbrainz.org/doc/Introduction_to_Voting
- https://musicbrainz.org/doc/Editor

## Discogs (NOT verified, 403)
- From memory, unconfirmed: submissions get voted on by contributors; there are contributor levels/ranks; strict written data guidelines. Needs a manual read.
- Try: https://support.discogs.com/hc/en-us/articles/360005006574 and https://www.discogs.com/help/doc/contributor-levels
- Lesson (tentative): written guidelines are what let strangers agree on quality.

## Wikipedia (verified)
- Autoconfirmed: auto-granted at 10 edits + 4 days. Unlocks creating pages, uploads, editing semi-protected pages. Pure threshold, no human approval.
- Pending changes: edits by new/anonymous users on protected pages are saved but hidden from readers until a reviewer accepts. Review is a quick check for vandalism, living-person and copyright problems only; acceptance is not endorsement. Backlog is usually under 1-2 days.
- Reviewer right: requested by experienced users at Requests for permissions; revocable.
- New page patrol: ~883 users hold the right (about 1,700 with admins). Patrollers can tag, draftify, nominate, not delete. "Autopatrolled" users skip review.
- Lesson: separate "can contribute" (automatic threshold) from "can approve" (granted). Review for obvious problems, fast. Reviewers can't do irreversible things. Proven contributors skip review.
- https://en.wikipedia.org/wiki/Wikipedia:Pending_changes
- https://en.wikipedia.org/wiki/Wikipedia:Autoconfirmed
- https://en.wikipedia.org/wiki/Wikipedia:New_pages_patrol

## OpenStreetMap (verified)
- No pre-approval. Edits go live; volunteers review changesets after the fact (tools like OSMCha). Mappers can set `review_requested=yes`.
- Norm: keep changesets small and local so they are easy to review and revert. Comments on a changeset should almost always be answered. Ignored feedback escalates to the Data Working Group (0-hour block, then longer).
- Lesson: after-the-fact review works when changes are small, attributable and revertible. Git gives us that for free (git revert).
- https://wiki.openstreetmap.org/wiki/Changeset

## Liquipedia (NOT verified, 403)
- Could not read rules or permission pages. Do not assume anything. Likely relevant: SC wiki is the closest peer community; worth manual read of its editing rules.
- Try: https://liquipedia.net/starcraft/Liquipedia:Rules

## Git/GitHub options (verified from GitHub docs)
- CODEOWNERS + branch protection "Require review from Code Owners": any ONE listed owner's approval satisfies a line. Owners need write access. Rules come from the base branch's file. Put CODEOWNERS itself under an owner. Bad lines are silently skipped.
- Issue forms: YAML in `.github/ISSUE_TEMPLATE`; fields input/textarea/dropdown/checkboxes/upload, required flags. Answers become Markdown in the issue body; labels applied only if the label already exists. Feature is "public preview". Forms are for issues only; PRs use a separate template. Turning an issue into a PR needs our own automation (a GitHub Action), not covered by the docs page.
- CI validation: not fetched from docs. Plan is our own script (schema check on YAML, required fields, duplicate IDs, valid links) run as a GitHub Action required status check.
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms

## A path for us

### Stage 1 (now): curator approves PRs, CI does the boring checks
- Contributors fork and open PRs against the YAML catalog. Add a PR template.
- CI (required check): YAML parses, matches schema, IDs unique, required fields present, URLs well-formed, files sorted/formatted.
- Curator reviews only what CI can't judge (is this the right copy, grade, source). Goal: review a PR in under a minute.
- Write the guidelines doc now (CONTRIBUTING.md): what counts as a source, how to grade. Guidelines are what scale, per MusicBrainz/Discogs.
- Small PRs, one match or copy each (OSM lesson).

### Stage 2 (later): trusted reviewers via CODEOWNERS
- Trigger: curator is the bottleneck, or 3+ people have 10+ merged PRs.
- Threshold-based trust, like MusicBrainz: N merged PRs, then curator invites by hand. Keep it manual, no voting machinery.
- Add CODEOWNERS, e.g. one file per tournament/era owned by a small GitHub team; turn on "Require review from Code Owners". Any one owner can approve (the docs say so). Own CODEOWNERS itself by the curator.
- Reviewers get write access, so branch protection (no direct push to main, CI required) is mandatory first.
- Optional Wikipedia-style "autopatrol": trusted reviewers' own PRs need only CI plus one other review.
- Destructive changes (deleting a copy, merging matches) still go to the curator (MusicBrainz 48h rule).

### Stage 3 (later): submission form -> PR
- Issue form for people who won't touch git: match, source link, copy details, grade evidence.
- A GitHub Action reads the issue body, writes the YAML, runs the same CI validation, opens a PR. Reviewers handle it like any other PR. Label `submission` (create the label first).
- Risk: issue forms are public preview; the Action is custom code to maintain. Only build once non-git contributors actually show up.
- Keep post-hoc fixes cheap: corrections are normal PRs, bad merges are `git revert`.

### Not worth copying
- Open voting systems (MusicBrainz, Discogs): need hundreds of active editors. We would have a handful.
