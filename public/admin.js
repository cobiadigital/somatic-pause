(() => {
  "use strict";

  const API = "/api/admin/questions";
  const PASSWORD_KEY = "pause.adminPassword";
  const GROUPS = [
    { key: "ground", title: "Ground", desc: "Shown first, to arrive in the body. One per pause." },
    { key: "explore", title: "Explore", desc: "Curious attention to the sensation. Most of each pause." },
    { key: "allow", title: "Allow", desc: "Closing invitations to make room. Up to two per pause." },
  ];

  const $ = (id) => document.getElementById(id);
  const login = $("login");
  const editor = $("editor");
  const groupsEl = $("groups");
  const bar = $("bar");
  const save = $("save");
  const status = $("status");
  const errorEl = $("error");

  let dirty = false;

  // ---------- remembered password (best effort) ----------

  const remembered = {
    get() { try { return localStorage.getItem(PASSWORD_KEY) || ""; } catch { return ""; } },
    set(v) { try { localStorage.setItem(PASSWORD_KEY, v); } catch {} },
    clear() { try { localStorage.removeItem(PASSWORD_KEY); } catch {} },
  };
  let password = remembered.get();

  // ---------- API ----------

  async function call(method, body) {
    const res = await fetch(API, {
      method,
      headers: { Authorization: `Bearer ${password}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      remembered.clear();
      password = "";
      showLogin("Wrong password.");
      throw new Error("unauthorized");
    }
    if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status}).`);
    return data;
  }

  // ---------- screens ----------

  function showLogin(message) {
    editor.hidden = true;
    bar.hidden = true;
    $("signout").hidden = true;
    login.hidden = false;
    if (message) showError(message);
    $("password").focus();
  }

  function showEditor(data) {
    login.hidden = true;
    editor.hidden = false;
    bar.hidden = false;
    $("signout").hidden = false;
    render(data);
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    clearTimeout(showError.timer);
    showError.timer = setTimeout(() => { errorEl.hidden = true; }, 6000);
  }

  function setDirty(value) {
    dirty = value;
    save.disabled = !dirty;
    status.textContent = dirty ? "Unsaved changes" : "";
  }

  // ---------- rendering ----------

  function render({ questions, source, questionSeconds }) {
    const info = $("info");
    info.classList.toggle("warn", source === "invalid");
    const seconds = questionSeconds
      ? ` Each question shows for ${questionSeconds} seconds (change QUESTION_SECONDS in the Cloudflare dashboard).`
      : "";
    info.textContent =
      (source === "invalid"
        ? "The saved questions in KV aren't valid JSON, so the app is using the defaults. Saving here will fix it."
        : source === "defaults"
          ? "Showing the default questions. Save to start your own list."
          : "Changes appear on the next pause.") + seconds;

    groupsEl.replaceChildren(...GROUPS.map((g) => renderGroup(g, questions[g.key] || [])));
    setDirty(false);
  }

  function renderGroup(group, items) {
    const section = document.createElement("section");
    section.dataset.group = group.key;

    const header = document.createElement("header");
    const h2 = document.createElement("h2");
    h2.textContent = group.title;
    const count = document.createElement("span");
    count.className = "count";
    header.append(h2, count);

    const desc = document.createElement("p");
    desc.className = "desc";
    desc.textContent = group.desc;

    const list = document.createElement("div");
    list.className = "list";
    items.forEach((q) => list.append(renderRow(q)));

    const add = document.createElement("button");
    add.type = "button";
    add.className = "add";
    add.textContent = "+ Add question";
    add.addEventListener("click", () => {
      const row = renderRow({ text: "" });
      list.append(row);
      row.querySelector("textarea").focus();
      changed();
    });

    section.append(header, desc, list, add);
    updateCount(section);
    return section;
  }

  function renderRow(q) {
    const row = document.createElement("div");
    row.className = "row";

    const text = document.createElement("textarea");
    text.rows = 1;
    text.maxLength = 300;
    text.value = q.text;
    text.placeholder = "Question";
    text.setAttribute("aria-label", "Question");
    text.addEventListener("input", () => { grow(text); changed(); });

    const from = document.createElement("input");
    from.className = "from";
    from.maxLength = 60;
    from.value = q.from || "";
    from.placeholder = "Source (optional, not shown)";
    from.setAttribute("aria-label", "Source");
    from.addEventListener("input", changed);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Delete question");
    remove.addEventListener("click", () => {
      const section = row.closest("section");
      row.remove();
      updateCount(section);
      changed();
    });

    row.append(text, remove, from);
    requestAnimationFrame(() => grow(text));
    return row;
  }

  function grow(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
  }

  function updateCount(section) {
    const n = section.querySelectorAll(".row").length;
    section.querySelector(".count").textContent = `${n} question${n === 1 ? "" : "s"}`;
  }

  function changed() {
    groupsEl.querySelectorAll("section").forEach(updateCount);
    setDirty(true);
  }

  function collect() {
    const questions = {};
    groupsEl.querySelectorAll("section").forEach((section) => {
      questions[section.dataset.group] = [...section.querySelectorAll(".row")]
        .map((row) => {
          const item = { text: row.querySelector("textarea").value.trim() };
          const from = row.querySelector(".from").value.trim();
          if (from) item.from = from;
          return item;
        })
        .filter((q) => q.text);
    });
    return questions;
  }

  // ---------- actions ----------

  async function load() {
    try {
      showEditor(await call("GET"));
    } catch (e) {
      if (e.message !== "unauthorized") showError(e.message);
    }
  }

  login.addEventListener("submit", (e) => {
    e.preventDefault();
    password = $("password").value;
    remembered.set(password);
    $("password").value = "";
    errorEl.hidden = true;
    load();
  });

  save.addEventListener("click", async () => {
    save.disabled = true;
    status.textContent = "Saving…";
    try {
      await call("PUT", { questions: collect() });
      await load();
      status.textContent = "Saved";
    } catch (e) {
      if (e.message !== "unauthorized") showError(e.message);
      setDirty(true);
    }
  });

  $("reset").addEventListener("click", async () => {
    if (!confirm("Replace all questions with the defaults? This can't be undone.")) return;
    try {
      await call("DELETE");
      await load();
      status.textContent = "Reset to defaults";
    } catch (e) {
      if (e.message !== "unauthorized") showError(e.message);
    }
  });

  $("signout").addEventListener("click", () => {
    remembered.clear();
    password = "";
    showLogin();
  });

  window.addEventListener("beforeunload", (e) => {
    if (dirty) e.preventDefault();
  });

  if (password) load();
  else showLogin();
})();
