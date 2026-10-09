// Somatic Pause Worker.
//
// Static files in ./public are served directly. This script only handles
// /api/config, which tells the page:
//   - questionSeconds: how long each question shows. Set QUESTION_SECONDS in
//     the dashboard (Settings > Variables and Secrets); defaults to 6.
//   - questions: read from the QUESTIONS KV namespace, key "questions".
//     If that key is empty it is seeded from src/questions.json, so the KV
//     copy can then be edited in the dashboard.

import DEFAULT_QUESTIONS from "./questions.json";

const KV_KEY = "questions";
const DEFAULT_SECONDS = 6;
const GROUPS = ["ground", "explore", "allow"];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/config") {
      const body = {
        questionSeconds: questionSeconds(env),
        questions: await loadQuestions(env, ctx),
      };
      return Response.json(body, { headers: { "Cache-Control": "no-store" } });
    }
    return env.ASSETS.fetch(request);
  },
};

function questionSeconds(env) {
  const n = Number(env.QUESTION_SECONDS);
  return Number.isFinite(n) && n >= 2 && n <= 60 ? n : DEFAULT_SECONDS;
}

async function loadQuestions(env, ctx) {
  if (!env.QUESTIONS) return DEFAULT_QUESTIONS;

  let stored = null;
  try {
    stored = await env.QUESTIONS.get(KV_KEY, "json");
  } catch {
    // Invalid JSON in KV: fall back to defaults, but leave the KV value alone
    // so the edit can be fixed in the dashboard.
    return DEFAULT_QUESTIONS;
  }

  if (stored === null) {
    ctx.waitUntil(env.QUESTIONS.put(KV_KEY, format(DEFAULT_QUESTIONS)));
    return DEFAULT_QUESTIONS;
  }

  // Use each group from KV if it looks right, otherwise the default group.
  // Items may be {"text": "..."} or plain strings.
  const result = {};
  for (const group of GROUPS) {
    const items = Array.isArray(stored[group])
      ? stored[group]
          .map((q) => (typeof q === "string" ? { text: q } : q))
          .filter((q) => q && typeof q.text === "string" && q.text.trim())
      : [];
    result[group] = items.length ? items : DEFAULT_QUESTIONS[group];
  }
  return result;
}

// One question per line, which is easier to edit in the dashboard.
function format(questions) {
  const groups = GROUPS.map(
    (g) => `  "${g}": [\n${questions[g].map((q) => "    " + JSON.stringify(q)).join(",\n")}\n  ]`
  );
  return `{\n${groups.join(",\n\n")}\n}\n`;
}
