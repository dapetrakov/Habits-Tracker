(() => {
  const STORAGE_KEY = "habit-tracker:v1";
  const DAYS_SHOWN = 7;

  // ---- Date helpers (local time, "YYYY-MM-DD") ----
  const toKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const addDays = (d, n) => {
    const c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
  };
  const todayKey = () => toKey(new Date());

  // ---- State ----
  // { habits: [{ id, name, done: { "YYYY-MM-DD": true } }] }
  const load = () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && Array.isArray(data.habits)) return data;
    } catch (_) { /* ignore */ }
    return { habits: [] };
  };
  let state = load();
  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* ignore */ }
  };

  const streakOf = (habit) => {
    let d = new Date();
    // If today isn't done yet, the streak can still be alive from yesterday.
    if (!habit.done[toKey(d)]) d = addDays(d, -1);
    let count = 0;
    while (habit.done[toKey(d)]) {
      count++;
      d = addDays(d, -1);
    }
    return count;
  };

  const toggle = (id, key) => {
    const h = state.habits.find((x) => x.id === id);
    if (!h) return;
    if (h.done[key]) delete h.done[key];
    else h.done[key] = true;
    save();
    render();
  };

  // ---- Rendering ----
  const $ = (s) => document.querySelector(s);
  const list = $("#habit-list");
  const tpl = $("#habit-template");

  const lastDays = () => {
    const now = new Date();
    return Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(now, i - (DAYS_SHOWN - 1)));
  };

  const render = () => {
    const today = todayKey();
    const days = lastDays();

    $("#today-label").textContent = new Date().toLocaleDateString(undefined, {
      weekday: "long", month: "long", day: "numeric",
    });

    $("#week-head").innerHTML = days
      .map((d) => `<span>${d.toLocaleDateString(undefined, { weekday: "narrow" })}</span>`)
      .join("");

    list.innerHTML = "";
    for (const h of state.habits) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      const doneToday = !!h.done[today];
      node.classList.toggle("done", doneToday);
      node.querySelector(".name").textContent = h.name;

      const s = streakOf(h);
      node.querySelector(".streak").textContent =
        s > 0 ? `🔥 ${s}-day streak` : "No streak yet";

      const check = node.querySelector(".check");
      check.setAttribute("aria-pressed", String(doneToday));
      check.setAttribute("aria-label", `${doneToday ? "Unmark" : "Mark"} "${h.name}" done today`);
      check.addEventListener("click", () => toggle(h.id, today));

      const daysEl = node.querySelector(".days");
      for (const d of days) {
        const key = toKey(d);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "day" + (h.done[key] ? " on" : "") + (key === today ? " today" : "");
        const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        b.title = label;
        b.setAttribute("aria-label", `${h.name}, ${label}: ${h.done[key] ? "done" : "not done"}`);
        b.addEventListener("click", () => toggle(h.id, key));
        daysEl.appendChild(b);
      }

      node.querySelector(".delete").addEventListener("click", () => {
        if (!confirm(`Delete "${h.name}"? Its history will be lost.`)) return;
        state.habits = state.habits.filter((x) => x.id !== h.id);
        save();
        render();
      });

      list.appendChild(node);
    }

    const total = state.habits.length;
    const done = state.habits.filter((h) => h.done[today]).length;
    $("#empty").hidden = total > 0;
    $("#week-head").hidden = total === 0;
    $("#progress-fill").style.width = total ? `${(done / total) * 100}%` : "0";
    $("#progress-text").textContent = total
      ? (done === total ? `All ${total} done today 🎉` : `${done} of ${total} done today`)
      : "";
  };

  // ---- Add habit ----
  $("#add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#habit-input");
    const name = input.value.trim();
    if (!name) return;
    state.habits.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name,
      done: {},
    });
    save();
    input.value = "";
    render();
  });

  // Re-render when the day rolls over or the tab regains focus.
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
  setInterval(render, 60 * 1000);

  render();
})();
