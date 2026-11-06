# Publishing (YouTube + Instagram, official APIs)

Posting goes straight to the platforms' own APIs through the exporters in `studio/publish/exporters/`: YouTube Data
API v3 and the Instagram API with Instagram Login. There is no Zapier and no other middleman. Credentials belong to a
**channel** and live only on this computer in `.studio/secrets/` (git-ignored, readable by this user only). Never
print, copy or commit them.

Only publish when the user asks. It's public and hard to undo, so always show the plan first and get an explicit yes.

## 0. One-time: connect the channel's accounts
`studio accounts` shows what's connected. Missing pieces print their own setup steps. In short:

- **YouTube.** The user gives you the OAuth client file from Google Cloud: a "Desktop app" client, with YouTube Data
  API v3 enabled and the consent screen set to *In production* (or with their account added as a test user).
  Then ask them to run it themselves, since it opens a browser sign-in:
  `! node bin/studio.mjs connect youtube --channel <id> --client-secret <path>`
  They sign in with the Google account that owns the channel. A different channel than `channel.json` "handle" is
  refused.
- **Instagram.** A professional (Business/Creator) account and a Meta app with "API setup with Instagram login",
  which gives a generated long-lived token. Ask the user to save the token in a file (not in chat), then:
  `node bin/studio.mjs connect instagram --channel <id> --token-file <file>`
  After that, ask them to delete the file. The token refreshes itself (60-day lifetime). Set `channel.json`
  "instagram": "@handle" so a token for the wrong account is refused.

## 1. Words for the post
Make sure `script.json` has a good `"title"` (≤ 100 characters), a one-to-two sentence `"description"` (what the
viewer learns, no spoilers of the twist) and 5-8 `"tags"`. The channel adds its footer and default hashtags;
`project.json` → `"publish"` can override `title` / `description` / `tags`, or per platform
`"youtube": { "privacy", "category", "madeForKids", "syntheticMedia" }` and
`"instagram": { "shareToFeed", "thumbOffsetMs", "hashtags", "audioName", "collaborators" }`.

## 2. Dry run (nothing is sent)
`studio publish <project> --to youtube,instagram` prints, per platform, exactly what will be sent and any ✗ problems:
not connected, specs (YouTube Shorts: vertical, ≤ 3 min · Reels: 3 s-15 min, ≤ 300 MB, 23-60 fps, AAC), a render
older than its script / shots / mix, or already posted. Fix every ✗ before going on.

## 3. Confirm with the user
Show the title, description / caption, tags, and for YouTube the visibility (`private` by default; `--privacy unlisted|public`,
or `--publish-at 2026-11-08T15:00:00Z` to schedule) and category. Say that Instagram Reels are public and that the
file is briefly put on a temporary public host (litterbox, 1 h) so Instagram can fetch it. Wait for a clear yes.

## 4. Publish
`studio publish <project> --to youtube,instagram --yes` (add `--privacy …` exactly as confirmed).
- **YouTube:** resumable upload. A vertical video of ≤ 3 min becomes a Short by itself.
- **Instagram:** audio re-encoded to 128 kbps if needed → temporary host (URL verified) → Reels container →
  waits for processing → published.

Each success is recorded in `project.json` → `publish.history`. Posting the same project again to the same platform
is refused unless the user explicitly wants a repost (`--force`).

## 5. Report
Give the links it printed (YouTube `…/shorts/<id>`, Instagram permalink). If one platform failed, say which and why;
the other may already be live, so never retry a platform that succeeded.

## Limits worth knowing
- YouTube: ~100 uploads/day per project by default (separate upload quota). New uploads may stay private until
  YouTube finishes processing.
- Instagram: 100 API posts per 24 h (checked before each post). Captions ≤ 2200 characters, ≤ 30 hashtags,
  ≤ 20 mentions. Tokens expire 60 days after the last refresh (refreshed automatically when you publish).
