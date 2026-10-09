# Somatic Pause

A 90-second mind-body check-in. The timer starts as soon as the page opens: notice a sensation and let gentle questions drift across the screen while a ring counts down near the bottom. Installable as a PWA and works offline.

The 90 seconds comes from Jill Bolte Taylor's observation that the physiology of an emotion moves through the body in about a minute and a half. The questions draw on Acceptance and Commitment Therapy, Eugene Gendlin's Focusing, Gabor Maté's Compassionate Inquiry, and Rhonda Magee's work on mindfulness and racial justice.

## How a session flows

Each pause picks 9 questions, about one every 9 seconds:

1. **Ground** (1): arrive in the body, e.g. "Where do my feet meet the floor?"
2. **Explore** (6): curious questions about the sensation's location, texture, movement
3. **Allow** (2): making room for what's here, e.g. "Can I meet this with kindness?"

Questions you saw in the last couple of sessions are deprioritized so each pause feels fresh.

## Editing the questions

All questions live in [`public/questions.json`](public/questions.json), grouped into `ground`, `explore` and `allow`. Each line is one question: `{ "text": "..." }`, with an optional `"from"` noting its lineage (not shown in the app). Keep the commas between lines and no comma after the last one in a group. You can edit it from the GitHub mobile app; installed copies pick up changes the next time they open online.

## Deploying (Cloudflare Workers Builds)

This is a static-assets Worker with no build step.

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → pick `somatic-pause`.
2. Leave the build command empty. Deploy command: `npx wrangler deploy` (the default).
3. Each push to `main` deploys. Pushes to other branches get preview URLs if non-production builds are enabled.

No secrets or environment variables are needed.

## Files

| Path | Purpose |
| --- | --- |
| `wrangler.jsonc` | Worker config, serves `./public` |
| `public/index.html` | Session and closing screens |
| `public/app.js` | Timer, question scheduling, wake lock |
| `public/questions.json` | The question bank |
| `public/styles.css` | Layout, light/dark themes, floating animation |
| `public/sw.js` | Offline cache |
| `public/manifest.webmanifest`, `public/icons/` | PWA install metadata |
