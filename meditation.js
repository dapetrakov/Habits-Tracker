// Meditation timer: counts down, rings a bell, and logs the session to a habit.
(() => {
  const App = window.HabitApp;
  const TIMER_KEY = "habit-tracker:timer"; // the running session, so it survives the app being closed
  const NEW_HABIT = "__new";
  const DEFAULT_NAME = "Meditation";
  const $ = (s) => document.querySelector(s);

  // ---- Settings (stored with the habits) ----
  const settings = () => {
    const st = App.state;
    st.settings = st.settings || {};
    st.settings.meditation = Object.assign({ minutes: 10, startBell: true, habitId: null }, st.settings.meditation);
    return st.settings.meditation;
  };

  // Which habit sessions are logged to: the saved choice, else a habit named like
  // "meditation", else a new "Meditation" habit created on the first session.
  const chosenHabitId = () => {
    const s = settings();
    if (s.habitId && App.findHabit(s.habitId)) return s.habitId;
    const match = App.state.habits.find((h) => /meditat/i.test(h.name));
    return match ? match.id : NEW_HABIT;
  };

  // ---- Timer state ----
  // { status: "running" | "paused", minutes, endAt (ms, while running), remaining (ms, while paused), habitId }
  let timer = null;
  let lastResult = null; // message shown after a session ends
  let tickHandle = null;

  const loadTimer = () => {
    try { timer = JSON.parse(localStorage.getItem(TIMER_KEY)); } catch (_) { timer = null; }
  };
  const saveTimer = () => {
    try {
      if (timer) localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
      else localStorage.removeItem(TIMER_KEY);
    } catch (_) { /* ignore */ }
  };
  const remainingMs = () => {
    if (!timer) return settings().minutes * 60000;
    if (timer.status === "paused") return timer.remaining;
    return Math.max(0, timer.endAt - Date.now());
  };

  // ---- Bell sound, synthesized (no audio file needed) ----
  // A temple bell is a struck metal body: a low fundamental plus inharmonic
  // overtones that each fade at their own rate, with slight beating between
  // near-identical partials that gives the "wah-wah" shimmer.
  let ctx = null;
  const audio = () => {
    // On iPhone, web sound is normally muted by Silent mode. Declaring this as
    // media playback (like a music app) lets the bell ring anyway (iOS 17+).
    try {
      if (navigator.audioSession && navigator.audioSession.type !== "playback") {
        navigator.audioSession.type = "playback";
      }
    } catch (_) { /* not supported: falls back to the default behaviour */ }
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  };
  // iOS only allows sound after a tap: play a silent blip inside the tap handler.
  const unlockAudio = () => {
    const c = audio();
    if (!c) return;
    const buf = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
  };

  const strike = (c, when, volume = 1) => {
    const out = c.createGain();
    out.gain.value = 0.35 * volume;
    const comp = c.createDynamicsCompressor();
    out.connect(comp).connect(c.destination);

    const f0 = 196; // G3: a deep, calm bell
    const partials = [
      // [ratio, level, decay seconds]
      [0.5, 0.35, 20],  // hum tone
      [1, 1, 16],
      [2.01, 0.5, 11],
      [2.76, 0.35, 7],
      [4.07, 0.22, 4.5],
      [5.4, 0.12, 3],
      [6.9, 0.06, 2],
    ];
    for (const [ratio, level, decay] of partials) {
      for (const detune of [0, 0.9]) { // a twin partial a little apart makes the beating
        const osc = c.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f0 * ratio + detune * ratio;
        const g = c.createGain();
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(level * (detune ? 0.6 : 1), when + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
        osc.connect(g).connect(out);
        osc.start(when);
        osc.stop(when + decay + 0.1);
      }
    }
    // The strike itself: a short, soft burst of filtered noise.
    const len = Math.floor(c.sampleRate * 0.03);
    const noise = c.createBuffer(1, len, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = noise;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.8;
    const ng = c.createGain();
    ng.gain.value = 0.25;
    src.connect(bp).connect(ng).connect(out);
    src.start(when);
  };

  // times: 1 strike at the start, 3 at the end (each a little softer)
  const ringBell = (times = 1) => {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + 0.05;
    for (let i = 0; i < times; i++) strike(c, t + i * 5, 1 - i * 0.15);
  };

  // ---- Keep the screen on while meditating ----
  let wakeLock = null;
  const keepAwake = async () => {
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      }
    } catch (_) { wakeLock = null; }
  };
  const allowSleep = () => {
    if (wakeLock) wakeLock.release().catch(() => {});
    wakeLock = null;
  };

  // ---- Logging ----
  const logSession = (minutes, habitId, endedAt) => {
    let h = habitId !== NEW_HABIT ? App.findHabit(habitId) : null;
    if (!h) h = App.addHabit(DEFAULT_NAME);
    settings().habitId = h.id;
    const day = new Date(endedAt);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    h.sessions = Array.isArray(h.sessions) ? h.sessions : [];
    h.sessions.push({ date: key, minutes, at: new Date(endedAt).toISOString() });
    h.done[key] = true;
    App.save();
    return h;
  };

  const finish = ({ late = false } = {}) => {
    const t = timer;
    const endedAt = late ? t.endAt : Date.now();
    timer = null;
    saveTimer();
    stopTicking();
    allowSleep();
    const h = logSession(t.minutes, t.habitId, endedAt);
    const streak = App.currentStreak(h);
    lastResult = `Session complete. ${t.minutes} min logged to “${h.name}”` +
      (streak > 1 ? ` · ${streak}-day streak` : "") + ".";
    if (!late) ringBell(3);
    App.render();
  };

  // ---- Controls ----
  const start = () => {
    unlockAudio(); // must happen inside the tap
    const s = settings();
    const minutes = s.minutes;
    timer = { status: "running", minutes, endAt: Date.now() + minutes * 60000, habitId: chosenHabitId() };
    lastResult = null;
    saveTimer();
    if (s.startBell) ringBell(1);
    keepAwake();
    startTicking();
    App.render();
  };
  const pause = () => {
    if (!timer) return;
    if (timer.status === "running") {
      timer = { ...timer, status: "paused", remaining: remainingMs() };
      delete timer.endAt;
      allowSleep();
    } else {
      unlockAudio();
      timer = { ...timer, status: "running", endAt: Date.now() + timer.remaining };
      delete timer.remaining;
      keepAwake();
    }
    saveTimer();
    App.render();
  };
  const endEarly = () => {
    if (!timer) return;
    if (!confirm("End this session early? It won't be logged.")) return;
    timer = null;
    saveTimer();
    stopTicking();
    allowSleep();
    lastResult = "Session ended early and not logged.";
    App.render();
  };

  const tick = () => {
    if (timer && timer.status === "running" && remainingMs() <= 0) { finish(); return; }
    if (location.hash === "#meditate") paintClock();
  };
  const startTicking = () => { if (!tickHandle) tickHandle = setInterval(tick, 250); };
  const stopTicking = () => { clearInterval(tickHandle); tickHandle = null; };

  // ---- Rendering ----
  const fmt = (ms) => {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60), s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };
  const CIRC = 2 * Math.PI * 54;
  const paintClock = () => {
    const left = remainingMs();
    const total = (timer ? timer.minutes : settings().minutes) * 60000;
    $("#time-left").textContent = fmt(left);
    $("#ring-fill").style.strokeDasharray = `${CIRC}`;
    $("#ring-fill").style.strokeDashoffset = `${CIRC * (1 - left / total)}`;
  };

  const render = () => {
    const s = settings();
    const running = timer && timer.status === "running";
    const paused = timer && timer.status === "paused";

    $("#timer-status").textContent = running ? "Breathe" : paused ? "Paused" : "Ready";
    $("#setup").hidden = !!timer;
    $("#settings").hidden = !!timer;
    $("#start").hidden = !!timer;
    $("#pause").hidden = !timer;
    $("#end").hidden = !timer;
    $("#pause").textContent = paused ? "Resume" : "Pause";
    document.querySelector(".timer-face").classList.toggle("running", !!running);

    for (const b of document.querySelectorAll("#presets button")) {
      const on = Number(b.dataset.min) === s.minutes;
      b.classList.toggle("selected", on);
      b.setAttribute("aria-pressed", String(on));
    }
    const custom = $("#custom-min");
    if (document.activeElement !== custom) {
      custom.value = [5, 10, 15, 20, 30].includes(s.minutes) ? "" : s.minutes;
    }

    const sel = $("#log-habit");
    const chosen = chosenHabitId();
    sel.innerHTML = "";
    for (const h of App.state.habits) sel.add(new Option(h.name, h.id, false, h.id === chosen));
    if (chosen === NEW_HABIT) sel.add(new Option(`New habit: ${DEFAULT_NAME}`, NEW_HABIT, false, true));

    $("#start-bell").checked = !!s.startBell;
    $("#done-message").textContent = lastResult || "";
    $("#done-message").hidden = !lastResult || !!timer;
    paintClock();
  };

  // ---- Events ----
  $("#presets").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-min]");
    if (!b) return;
    settings().minutes = Number(b.dataset.min);
    lastResult = null;
    App.save();
    App.render();
  });
  $("#custom-min").addEventListener("change", (e) => {
    const n = Math.round(Number(e.target.value));
    if (n >= 1 && n <= 180) {
      settings().minutes = n;
      lastResult = null;
      App.save();
    }
    e.target.blur();
    App.render();
  });
  $("#log-habit").addEventListener("change", (e) => {
    settings().habitId = e.target.value === NEW_HABIT ? null : e.target.value;
    App.save();
  });
  $("#start-bell").addEventListener("change", (e) => {
    settings().startBell = e.target.checked;
    App.save();
  });
  $("#test-bell").addEventListener("click", () => { unlockAudio(); ringBell(1); });
  $("#start").addEventListener("click", start);
  $("#pause").addEventListener("click", pause);
  $("#end").addEventListener("click", endEarly);

  // Coming back to the app: catch up on a session that ended while away,
  // and take the screen lock again (iOS drops it when the app is hidden).
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || !timer) return;
    if (timer.status === "running") {
      if (remainingMs() <= 0) finish();
      else keepAwake();
    }
  });

  // ---- Start up ----
  window.Meditation = { render };
  loadTimer();
  if (timer && timer.status === "running") {
    // The app was closed during a session: log it if its time has passed.
    if (remainingMs() <= 0) finish({ late: true });
    else startTicking();
  }
  App.render();
})();
