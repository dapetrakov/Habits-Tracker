(() => {
  // Keep this key: it's where existing users' habits are already stored.
  const STORAGE_KEY = "habit-tracker:v1";
  const DAYS_SHOWN = 7;

  // ---- Date helpers (local time, "YYYY-MM-DD") ----
  const toKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const fromKey = (k) => {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const addDays = (d, n) => {
    const c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
  };
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const todayKey = () => toKey(new Date());
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  // ---- State ----
  // { habits: [{ id, name, created: "YYYY-MM-DD", done: { "YYYY-MM-DD": true } }] }
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
  const findHabit = (id) => state.habits.find((x) => x.id === id);

  // ---- Streaks and stats ----

  // Days done in a row, ending today. If today isn't done yet the streak is
  // still alive from yesterday, so it only breaks once a whole day is missed.
  const currentStreak = (habit) => {
    let d = new Date();
    if (!habit.done[toKey(d)]) d = addDays(d, -1);
    let count = 0;
    while (habit.done[toKey(d)]) {
      count++;
      d = addDays(d, -1);
    }
    return count;
  };

  // Longest run of consecutive done days ever, with the dates it covered.
  const bestStreak = (habit) => {
    const keys = Object.keys(habit.done).filter((k) => habit.done[k]).sort();
    let best = { length: 0, start: null, end: null };
    let runStart = null, prev = null, len = 0;
    for (const k of keys) {
      if (prev && toKey(addDays(fromKey(prev), 1)) === k) {
        len++;
      } else {
        len = 1;
        runStart = k;
      }
      if (len > best.length) best = { length: len, start: runStart, end: k };
      prev = k;
    }
    return best;
  };

  const totalDone = (habit) => Object.values(habit.done).filter(Boolean).length;

  // First day this habit has any record for: when it was created or first checked off.
  const firstDay = (habit) => {
    const keys = Object.keys(habit.done).filter((k) => habit.done[k]);
    if (habit.created) keys.push(habit.created);
    if (!keys.length) return startOfDay(new Date());
    return fromKey(keys.sort()[0]);
  };

  // Share of the last 30 days done, counting only days since the habit started.
  const recentRate = (habit) => {
    const today = startOfDay(new Date());
    const first = firstDay(habit);
    let days = 0, done = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, -i);
      if (d < first) break;
      days++;
      if (habit.done[toKey(d)]) done++;
    }
    return days ? Math.round((done / days) * 100) : 0;
  };

  const toggle = (id, key) => {
    const h = findHabit(id);
    if (!h) return;
    if (h.done[key]) delete h.done[key];
    else h.done[key] = true;
    save();
    render();
  };

  // ---- Elements ----
  const $ = (s) => document.querySelector(s);
  const list = $("#habit-list");
  const tpl = $("#habit-template");

  // ---- Navigation: "#habit-<id>" shows that habit's history ----
  let shownMonth = null; // first day of the month the calendar shows
  const detailId = () => {
    const m = location.hash.match(/^#habit-(.+)$/);
    return m && findHabit(m[1]) ? m[1] : null;
  };
  const openHabit = (id) => {
    shownMonth = null;
    location.hash = "habit-" + id;
  };
  const closeHabit = () => {
    if (history.length > 1 && detailId()) history.back();
    else location.hash = "";
  };

  // ---- List view ----
  const lastDays = () => {
    const now = new Date();
    return Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(now, i - (DAYS_SHOWN - 1)));
  };

  const streakText = (h) => {
    const cur = currentStreak(h);
    const best = bestStreak(h).length;
    const parts = [cur > 0 ? `🔥 ${cur}-day streak` : "No streak yet"];
    if (best > cur) parts.push(`best ${best}`);
    return parts.join(" · ");
  };

  const renderList = () => {
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
      node.querySelector(".streak").textContent = streakText(h);

      const info = node.querySelector(".info");
      info.setAttribute("aria-label", `${h.name}: see full history`);
      info.addEventListener("click", () => openHabit(h.id));

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
    $("#list-hint").hidden = total === 0;
    $("#week-head").hidden = total === 0;
    $("#progress-fill").style.width = total ? `${(done / total) * 100}%` : "0";
    $("#progress-text").textContent = total
      ? (done === total ? `All ${total} done today 🎉` : `${done} of ${total} done today`)
      : "";
  };

  // ---- Detail view ----
  const fmtShort = (k) => fromKey(k).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

  const renderDetail = (id) => {
    const h = findHabit(id);
    const now = new Date();
    const today = todayKey();
    const thisMonth = monthStart(now);
    const first = monthStart(firstDay(h));
    if (!shownMonth) shownMonth = thisMonth;

    $("#detail-name").textContent = h.name;
    document.title = `${h.name} · Habits`;

    // Stats
    const cur = currentStreak(h);
    const best = bestStreak(h);
    $("#stat-current").textContent = plural(cur, "day");
    $("#stat-best").textContent = plural(best.length, "day");
    $("#stat-total").textContent = totalDone(h);
    $("#stat-rate").textContent = `${recentRate(h)}%`;

    let note = "";
    if (cur > 0 && !h.done[today]) note = "Check it off today to keep your streak going.";
    else if (cur > 0 && cur === best.length && cur > 1) note = "This is your best streak so far.";
    if (best.length > 1 && cur < best.length) {
      note += (note ? " " : "") + `Best streak: ${fmtShort(best.start)} – ${fmtShort(best.end)}.`;
    }
    $("#streak-note").textContent = note;
    $("#streak-note").hidden = !note;

    // Calendar (weeks start on Monday)
    $("#month-label").textContent = shownMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    $("#prev-month").disabled = shownMonth <= first;
    $("#next-month").disabled = shownMonth >= thisMonth;

    const monday = new Date(2024, 0, 1); // a Monday
    $("#cal-weekdays").innerHTML = Array.from({ length: 7 }, (_, i) =>
      `<span>${addDays(monday, i).toLocaleDateString(undefined, { weekday: "narrow" })}</span>`).join("");

    const grid = $("#cal-days");
    grid.innerHTML = "";
    const lead = (shownMonth.getDay() + 6) % 7;
    for (let i = 0; i < lead; i++) grid.appendChild(document.createElement("span"));
    const daysInMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 0).getDate();
    for (let n = 1; n <= daysInMonth; n++) {
      const d = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), n);
      const key = toKey(d);
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = n;
      const isOn = !!h.done[key];
      const future = key > today;
      // A done day joined to the next/previous done day is drawn as one run.
      const prevOn = !!h.done[toKey(addDays(d, -1))];
      const nextOn = !!h.done[toKey(addDays(d, 1))];
      b.className = "cal-day" + (isOn ? " on" : "") + (key === today ? " today" : "") +
        (isOn && prevOn ? " join-left" : "") + (isOn && nextOn ? " join-right" : "");
      b.disabled = future;
      b.setAttribute("aria-label", `${d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}: ${isOn ? "done" : "not done"}`);
      b.setAttribute("aria-pressed", String(isOn));
      b.addEventListener("click", () => toggle(h.id, key));
      grid.appendChild(b);
    }

    // Month-by-month summary, newest first, back to the first record
    const months = $("#months");
    months.innerHTML = "";
    for (let m = thisMonth; m >= first; m = new Date(m.getFullYear(), m.getMonth() - 1, 1)) {
      const dim = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      const startDay = m.getTime() === first.getTime() ? firstDay(h).getDate() : 1;
      const endDay = m.getTime() === thisMonth.getTime() ? now.getDate() : dim;
      let done = 0;
      for (let n = 1; n <= dim; n++) if (h.done[toKey(new Date(m.getFullYear(), m.getMonth(), n))]) done++;
      const possible = Math.max(endDay - startDay + 1, done, 1);
      const pct = Math.round((done / possible) * 100);

      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "month-row" + (m.getTime() === shownMonth.getTime() ? " current" : "");
      b.innerHTML = `<span class="month-name"></span><span class="month-bar"><span style="width:${pct}%"></span></span><span class="month-count"></span>`;
      b.querySelector(".month-name").textContent = m.toLocaleDateString(undefined, { month: "short", year: "numeric" });
      b.querySelector(".month-count").textContent = `${done}/${possible}`;
      b.setAttribute("aria-label", `${m.toLocaleDateString(undefined, { month: "long", year: "numeric" })}: ${done} of ${possible} days. Show in calendar.`);
      const target = m;
      b.addEventListener("click", () => {
        shownMonth = target;
        render();
        $(".calendar").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      li.appendChild(b);
      months.appendChild(li);
    }
  };

  const render = () => {
    const id = detailId();
    $("#list-view").hidden = !!id;
    $("#detail-view").hidden = !id;
    if (id) renderDetail(id);
    else {
      document.title = "Habit Tracker";
      renderList();
    }
  };

  // ---- Events ----
  $("#add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#habit-input");
    const name = input.value.trim();
    if (!name) return;
    state.habits.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name,
      created: todayKey(),
      done: {},
    });
    save();
    input.value = "";
    render();
  });

  $("#back").addEventListener("click", closeHabit);
  $("#prev-month").addEventListener("click", () => {
    shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() - 1, 1);
    render();
  });
  $("#next-month").addEventListener("click", () => {
    shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 1);
    render();
  });

  let lastHash = location.hash;
  window.addEventListener("hashchange", () => {
    if (location.hash !== lastHash) shownMonth = null;
    lastHash = location.hash;
    render();
    window.scrollTo(0, 0);
  });

  // Re-render when the day rolls over or the app comes back to the front.
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
  setInterval(render, 60 * 1000);

  render();
})();
