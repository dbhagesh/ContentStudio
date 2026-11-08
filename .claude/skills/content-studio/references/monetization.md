# Monetization and platform rules

Read this when setting up a channel's `publish` block, writing its BIBLE's monetization notes, or when the user asks
how a channel earns. The rules change, so before quoting a number to the user, check it against YouTube's and
Meta's help pages. The figures below were checked in 2025-2026.

## YouTube Partner Program (YPP)
- **Ads revenue (full YPP):** 1,000 subscribers, plus either 4,000 public watch hours in 12 months or 10 million
  valid public Shorts views in 90 days.
- **Fan funding tier (lower bar):** 500 subscribers, 3 public uploads in 90 days, and either 3,000 watch hours in
  12 months or 3 million Shorts views in 90 days. This unlocks memberships, Super Thanks and Shopping, not ads.
- **Shorts pay:** ad revenue between Shorts is pooled and shared by views, and the creator keeps 45% of their share.
  Our music and effects are generated locally, so no music licence takes a cut.
- **Joining:** apply in YouTube Studio → Earn. This is done by hand; the API can't apply for YPP.

## The rule that decides monetization: "inauthentic content"
YouTube refuses or removes monetization for **mass-produced or repetitive content**: templated videos with only
small changes, or content that looks made to farm views at scale. (In July 2025 the old "repetitious content" policy
was renamed and clarified as "inauthentic content".) The studio is built to stay on the right side of it:
- Every script is original, researched and sourced. `lint` refuses phrasing that repeats the channel's other videos.
- Every channel has a recognizable recurring cast and a point of view (its BIBLE), not anonymous stock narration.
- Every video gets human editorial choices: the user approves pilots, picks topics, and confirms every post.
- **Never** batch-post near-identical variants, re-cut the same video, or post the same video to two of our channels.

## AI disclosure ("altered or synthetic content")
Required only for **realistic** content a viewer could mistake for real footage of people, places or events.
Clearly stylised animation (all our templates, including 3D cartoons) doesn't need it, so `syntheticMedia: false`
is right. Set it to `true` if a video ever shows a realistic depiction of a real person or a realistic fake event.
An AI voice narrating a cartoon doesn't require disclosure.
YouTube also labels a video automatically when the file carries **C2PA content credentials (2.1+)** saying the whole
video was made with AI. Nothing in the studio pipeline writes C2PA data, and `studio publish` prints what each file
carries ("AI labelling: content credentials …"). If a file ever shows credentials, they came from an outside tool;
tell the user instead of stripping them. Honest disclosure is a policy requirement, and the studio never hides a
label that the rules require.

## Audience: made for kids?
Every channel here is `madeForKids: false`. Our audiences are 13+, and "made for kids" turns off comments,
personalized ads and notifications, which cuts revenue sharply. Don't write for young children: no kid-targeted
characters or nursery themes. COPPA decides this by content, not by the setting.

## Category, language, metadata
- Category and language: set per channel in `channel.json` → `publish.youtube` (education for explainers, entertainment
  for stories and mysteries).
- Title ≤ 55 characters reads best on phones. The description's first line is the hook in words, then sources, then
  the channel footer and links. Use 3-5 hashtags, and `#shorts` is added automatically.
- `publish.links`: affiliate, merch or newsletter links are added to every description. Disclose affiliate links
  ("affiliate link") in the description; FTC and YouTube both require it.

## Where the money comes from, by niche
Each channel's BIBLE.md ("Monetization notes") records its own plan. Typical patterns:
| niche | ads (RPM) | other income |
|---|---|---|
| finance / money | **highest** | disclosed sponsorships, newsletter. **Never give personal financial advice** |
| education / how things work / science | high | long-form explainers, education sponsors |
| history / mysteries / true stories | medium-high | long-form compilations (higher RPM), sponsorships |
| cute character / lifestyle explainers | medium | character merch and stickers, art packs |
| serialized fiction (manga, stories) | low-medium | memberships for early episodes, comic editions |

## Instagram
Reels earn mostly through brand deals, subscriptions and occasional invite-only bonuses, not a revenue share. Treat
Instagram as reach and brand-deal leverage. The same video can go to both platforms (`publish.targets`).

## Must be done by hand in YouTube Studio
Monetization application, ad settings, end screens and cards, the channel banner and avatar, playlists per series,
and the channel's "about" links. The API can upload, set metadata and schedule, but not these.
