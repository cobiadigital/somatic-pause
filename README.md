# Somatic Pause

A 90-second mind-body check-in. The timer starts as soon as the page opens: notice a sensation and let gentle questions drift across the screen while a ring counts down near the bottom. Installable as a PWA and works offline.

The 90 seconds comes from Jill Bolte Taylor's observation that the physiology of an emotion moves through the body in about a minute and a half. The questions draw on Acceptance and Commitment Therapy, Eugene Gendlin's Focusing, Gabor Maté's Compassionate Inquiry, and Rhonda Magee's work on mindfulness and racial justice.

## How a session flows

A new question appears every 6 seconds by default (about 14 per pause):

1. **Ground** (1): arrive in the body, e.g. "Where do my feet meet the floor?"
2. **Explore** (most of them): curious questions about the sensation's location, texture, movement
3. **Allow** (2): making room for what's here, e.g. "Can I meet this with kindness?"

Questions you saw in the last couple of sessions are deprioritized so each pause feels fresh.

## Settings you can change in the Cloudflare dashboard

Neither of these needs a commit. Changes apply the next time the page loads (KV edits can take up to a minute to reach every location).

### How long each question shows

1. **Workers & Pages** → `somatic-pause` → **Settings** → **Variables and Secrets** → **Add**.
2. Type: **Text**. Name: `QUESTION_SECONDS`. Value: a number from 2 to 60 (default is 6).
3. **Deploy**.

`wrangler.jsonc` sets `keep_vars: true`, so later Git deploys won't erase this setting.

### The questions

Questions live in the KV namespace `somatic-pause-questions`, key `questions`. The first time the app runs, that key is filled from [`src/questions.json`](src/questions.json), the defaults.

To edit: **Storage & Databases** → **Workers KV** → `somatic-pause-questions` → **KV Pairs** → `questions` → edit.

- Groups are `ground`, `explore` and `allow`.
- Each item can be `{"text": "..."}` (optionally with `"from"`, which isn't shown) or just `"..."`.
- Keep the commas between items and no comma after the last one in a group.
- If the value isn't valid JSON, the app quietly uses the defaults until it's fixed. A group that's missing or empty also falls back to its defaults.
- To reset to the defaults, delete the `questions` key; it's recreated on the next visit.

Edits to `src/questions.json` only change the defaults. They don't overwrite questions already in KV.

## Deploying (Cloudflare Workers Builds)

No build step. Workers Builds runs `npx wrangler deploy` on each push; pushes to `main` go to production and other branches get preview URLs if non-production builds are enabled. The KV namespace ID is in `wrangler.jsonc`. No secrets are needed.

## Files

| Path | Purpose |
| --- | --- |
| `wrangler.jsonc` | Worker config: static assets, KV binding, `keep_vars` |
| `src/index.js` | Worker: `/api/config` returns question timing and questions from KV |
| `src/questions.json` | Default questions, used to seed KV |
| `public/index.html` | Session and closing screens |
| `public/app.js` | Timer, question scheduling, wake lock |
| `public/styles.css` | Layout, light/dark themes, floating animation |
| `public/sw.js` | Offline cache |
| `public/manifest.webmanifest`, `public/icons/` | PWA install metadata |
