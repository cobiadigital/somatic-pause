(() => {
  "use strict";

  const DURATION_MS = 90_000;
  const FIRST_AT_MS = 1_500;  // first question appears shortly after load
  const EVERY_MS = 9_000;     // a new question every 9s
  const LIFE_MS = 11_000;     // each one lingers ~11s, so they overlap briefly
  const ALLOW_COUNT = 2;      // closing "allow" questions at the end
  const RECENT_KEY = "pause.recent";
  const RING_LENGTH = 2 * Math.PI * 54;

  const $ = (id) => document.getElementById(id);
  const app = $("app");
  const field = $("field");
  const ring = $("ring");
  const time = $("time");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let schedule = [];
  let nextIndex = 0;
  let startedAt = 0;
  let frame = 0;
  let band = 0;
  let wakeLock = null;
  let questions = null;

  // ---------- storage (best effort; the app works without it) ----------

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },
  };

  // ---------- picking questions ----------

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Prefer questions not seen in recent sessions, then fill from the rest.
  function pick(pool, count, recent) {
    const fresh = shuffle(pool.filter((q) => !recent.includes(q.text)));
    const seen = shuffle(pool.filter((q) => recent.includes(q.text)));
    return fresh.concat(seen).slice(0, count);
  }

  function buildSchedule() {
    const Q = questions;
    const slots = Math.floor((DURATION_MS - LIFE_MS - FIRST_AT_MS) / EVERY_MS) + 1;
    const recent = store.get(RECENT_KEY, []);

    const chosen = [
      ...pick(Q.ground, 1, recent),
      ...pick(Q.explore, slots - 1 - ALLOW_COUNT, recent),
      ...pick(Q.allow, ALLOW_COUNT, recent),
    ];

    // Remember about two sessions' worth so the next pause feels new.
    const texts = chosen.map((q) => q.text);
    store.set(RECENT_KEY, texts.concat(recent.filter((t) => !texts.includes(t))).slice(0, slots * 2));

    return chosen.map((q, i) => ({ text: q.text, at: FIRST_AT_MS + i * EVERY_MS }));
  }

  // ---------- floating ----------

  const rand = (min, max) => min + Math.random() * (max - min);

  function float(text, lifeMs) {
    const el = document.createElement("p");
    const align = ["left", "center", "right"][Math.floor(Math.random() * 3)];
    el.className = `question ${align}`;
    el.textContent = text;

    // All questions sit above the timer. Alternate between the upper and lower
    // half of that space so two overlapping questions never collide.
    band = 1 - band;
    const y = band ? rand(12, 34) : rand(60, 84);
    const still = reducedMotion.matches;

    el.style.setProperty("--y", `${y}%`);
    // Left/right questions sit a little in from the edge (16px gutter + drift room).
    el.style.setProperty("--inset", `${Math.round(40 + rand(0, 0.08) * field.clientWidth)}px`);
    el.style.setProperty("--dx", still ? "0px" : `${rand(-20, 20).toFixed(1)}px`);
    el.style.setProperty("--dy", still ? "0px" : `${rand(-14, 14).toFixed(1)}px`);
    el.style.setProperty("--life", `${lifeMs}ms`);

    field.appendChild(el);
    setTimeout(() => el.remove(), lifeMs + 100);
  }

  // ---------- session loop ----------

  function format(ms) {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function tick() {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, DURATION_MS - elapsed);

    ring.style.strokeDashoffset = String(RING_LENGTH * (1 - remaining / DURATION_MS));
    time.textContent = format(remaining);

    // Show the most recent due question. If the tab was hidden for a while,
    // skip the ones that have already passed rather than flooding the screen.
    let due = null;
    while (nextIndex < schedule.length && schedule[nextIndex].at <= elapsed) {
      due = schedule[nextIndex++];
    }
    if (due) {
      const lifeLeft = due.at + LIFE_MS - elapsed;
      if (lifeLeft > 2_000) float(due.text, lifeLeft);
    }

    if (remaining <= 0) return finish();
    frame = requestAnimationFrame(tick);
  }

  function start() {
    requestWakeLock();
    field.replaceChildren();
    schedule = buildSchedule();
    nextIndex = 0;
    startedAt = Date.now();
    app.dataset.state = "session";
    frame = requestAnimationFrame(tick);
  }

  function stopLoop() {
    cancelAnimationFrame(frame);
    releaseWakeLock();
  }

  function finish() {
    stopLoop();
    app.dataset.state = "outro";
  }

  // ---------- keep the screen awake during a pause ----------

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
    } catch { wakeLock = null; }
  }

  function releaseWakeLock() {
    if (wakeLock) wakeLock.release().catch(() => {});
    wakeLock = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && app.dataset.state === "session") {
      requestWakeLock();
    }
  });

  // ---------- wiring ----------

  // The pause starts as soon as the question bank has loaded.
  fetch("/questions.json")
    .then((r) => r.json())
    .then((q) => { questions = q; start(); });

  $("again").addEventListener("click", start);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
})();
