// Somatic Pause Worker.
//
// Static files in ./public are served directly. This script handles:
//
// /api/config (public) tells the page:
//   - questionSeconds: how long each question shows. Set QUESTION_SECONDS in
//     the dashboard (Settings > Variables and Secrets); defaults to 6.
//   - questions: read from the QUESTIONS KV namespace, key "questions".
//     If that key is empty it is seeded from src/questions.json.
//
// /api/admin/questions (password protected) backs the /admin page:
//   GET reads, PUT saves, DELETE resets to the defaults.
//   Requires the ADMIN_PASSWORD secret, sent as "Authorization: Bearer <password>".

import DEFAULT_QUESTIONS from "./questions.json";

const KV_KEY = "questions";
const DEFAULT_SECONDS = 6;
const GROUPS = ["ground", "explore", "allow"];
const MAX_TEXT = 300;
const MAX_FROM = 60;
const MAX_TOTAL = 500;

const NO_STORE = { "Cache-Control": "no-store" };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/config") {
      const body = {
        questionSeconds: questionSeconds(env),
        questions: (await loadQuestions(env, ctx)).questions,
      };
      return Response.json(body, { headers: NO_STORE });
    }

    if (url.pathname === "/api/admin/questions") {
      return admin(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};

function questionSeconds(env) {
  const n = Number(env.QUESTION_SECONDS);
  return Number.isFinite(n) && n >= 2 && n <= 60 ? n : DEFAULT_SECONDS;
}

// Returns { questions, source } where source is "kv", "defaults" or "invalid"
// (KV holds something that isn't valid JSON, so defaults are being used).
async function loadQuestions(env, ctx) {
  if (!env.QUESTIONS) return { questions: DEFAULT_QUESTIONS, source: "defaults" };

  let stored = null;
  try {
    stored = await env.QUESTIONS.get(KV_KEY, "json");
  } catch {
    // Invalid JSON in KV: fall back to defaults, but leave the KV value alone
    // so the edit can be fixed.
    return { questions: DEFAULT_QUESTIONS, source: "invalid" };
  }

  if (stored === null) {
    ctx.waitUntil(env.QUESTIONS.put(KV_KEY, format(DEFAULT_QUESTIONS)));
    return { questions: DEFAULT_QUESTIONS, source: "defaults" };
  }

  // Use each group from KV if it has questions, otherwise the default group.
  const questions = {};
  for (const group of GROUPS) {
    const items = cleanGroup(stored[group]);
    questions[group] = items.length ? items : DEFAULT_QUESTIONS[group];
  }
  return { questions, source: "kv" };
}

// Items may be {"text": "...", "from": "..."} or plain strings.
// Blank questions are dropped.
function cleanGroup(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((q) => (typeof q === "string" ? { text: q } : q))
    .filter((q) => q && typeof q.text === "string" && q.text.trim())
    .map((q) => {
      const item = { text: q.text.trim() };
      if (typeof q.from === "string" && q.from.trim()) item.from = q.from.trim();
      return item;
    });
}

// One question per line, which is easier to read in the dashboard.
function format(questions) {
  const groups = GROUPS.map(
    (g) => `  "${g}": [\n${questions[g].map((q) => "    " + JSON.stringify(q)).join(",\n")}\n  ]`
  );
  return `{\n${groups.join(",\n\n")}\n}\n`;
}

// ---------- admin ----------

async function admin(request, env, ctx) {
  if (!env.ADMIN_PASSWORD) {
    return error(503, "Admin is not set up yet. Add an ADMIN_PASSWORD secret in the Cloudflare dashboard.");
  }
  if (!(await authorized(request, env.ADMIN_PASSWORD))) {
    return error(401, "Wrong password.");
  }
  if (!env.QUESTIONS) return error(503, "The QUESTIONS KV namespace isn't bound to this Worker.");

  switch (request.method) {
    case "GET": {
      const { questions, source } = await loadQuestions(env, ctx);
      return Response.json({ questions, source, questionSeconds: questionSeconds(env) }, { headers: NO_STORE });
    }

    case "PUT": {
      let body;
      try {
        body = await request.json();
      } catch {
        return error(400, "Couldn't read the questions you sent.");
      }
      const questions = {};
      for (const group of GROUPS) {
        questions[group] = cleanGroup(body?.questions?.[group]);
        if (!questions[group].length) return error(400, `The "${group}" group needs at least one question.`);
        const tooLong = questions[group].find((q) => q.text.length > MAX_TEXT || (q.from || "").length > MAX_FROM);
        if (tooLong) return error(400, `This question is too long: "${tooLong.text.slice(0, 40)}…"`);
      }
      const total = GROUPS.reduce((n, g) => n + questions[g].length, 0);
      if (total > MAX_TOTAL) return error(400, `That's ${total} questions; the limit is ${MAX_TOTAL}.`);

      await env.QUESTIONS.put(KV_KEY, format(questions));
      return Response.json({ questions, source: "kv" }, { headers: NO_STORE });
    }

    case "DELETE": {
      // Back to the defaults. The key is re-seeded on the next visit.
      await env.QUESTIONS.delete(KV_KEY);
      return Response.json({ questions: DEFAULT_QUESTIONS, source: "defaults" }, { headers: NO_STORE });
    }

    default:
      return error(405, "Method not allowed.");
  }
}

// Compare SHA-256 digests in constant time so the check doesn't leak
// how much of the password matched.
async function authorized(request, password) {
  const header = request.headers.get("Authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(password)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

function error(status, message) {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}
