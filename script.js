"use strict";

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const pad = n => String(n).padStart(2, "0");

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg, type = "success") {
   const icons = { success: "fa-circle-check", warning: "fa-triangle-exclamation", info: "fa-circle-info" };
   const el = document.createElement("div");
   el.className = "toast";
   el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${msg}`;
   $("#toast-container").appendChild(el);
   setTimeout(() => {
      el.style.animation = "toastOut .3s ease forwards";
      setTimeout(() => el.remove(), 300);
   }, 3000);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

const Settings = {
   _d: {},

   init() {
      const defaults = { theme: "dark", accent: "cyan", notifications: false, alertSound: true, alertVolume: 0.3 };
      try { this._d = { ...defaults, ...JSON.parse(localStorage.getItem("chronos_settings") || "{}") }; }
      catch { this._d = { ...defaults }; }
      this.apply();
   },

   get(k)    { return this._d[k]; },
   set(k, v) {
      this._d[k] = v;
      try { localStorage.setItem("chronos_settings", JSON.stringify(this._d)); } catch {}
   },

   apply() {
      document.documentElement.setAttribute("data-theme",  this._d.theme);
      document.documentElement.setAttribute("data-accent", this._d.accent);
   },

   notify(title, body) {
      if (!this._d.notifications) return;
      if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body });
   }
};

// ─── Alerts (Web Audio API) ───────────────────────────────────────────────────

const Alerts = {
   _ctx: null,

   _ensure() {
      if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this._ctx.state === "suspended") this._ctx.resume();
   },

   _play(freqs, { type, gain, spacing, ramp, dur }) {
      if (!Settings.get("alertSound")) return;
      this._ensure();
      const c = this._ctx, vol = Settings.get("alertVolume") || 0.3;
      freqs.forEach((freq, i) => {
         const t = c.currentTime + i * spacing;
         const o = c.createOscillator(), g = c.createGain();
         o.type = type;
         o.frequency.value = freq;
         g.gain.setValueAtTime(0, t);
         g.gain.linearRampToValueAtTime(vol * gain, t + ramp);
         g.gain.exponentialRampToValueAtTime(0.001, t + dur);
         o.connect(g); g.connect(c.destination);
         o.start(t); o.stop(t + dur);
      });
   },

   bell()     { this._play([523.25, 783.99],                 { type: "sine",     gain: 0.50, spacing: 0.12, ramp: 0.08, dur: 1.2 }); },
   back()     { this._play([392, 440, 523.25],               { type: "triangle", gain: 0.40, spacing: 0.10, ramp: 0.06, dur: 0.8 }); },
   complete() { this._play([523.25, 659.25, 783.99, 1046.5], { type: "sine",     gain: 0.45, spacing: 0.15, ramp: 0.06, dur: 0.9 }); }
};

// ─── Timer ────────────────────────────────────────────────────────────────────

const CIRC = 2 * Math.PI * 175;

const Timer = {
   state: "idle",
   phase: "focus",
   focusMin: 25,
   breakMin: 5,
   totalSessions: 4,
   currentSession: 1,
   totalSec: 0,
   remainSec: 0,
   _iv: null,

   configure(f, b, s) {
      this.focusMin = f; this.breakMin = b; this.totalSessions = s;
      this.currentSession = 1; this.phase = "focus"; this.state = "idle";
   },

   start()  { this.state = "running"; this._begin(this.phase); },
   toggle() { this.state === "running" ? this.pause() : this.resume(); },

   pause() {
      if (this.state !== "running") return;
      this.state = "paused";
      clearInterval(this._iv); this._iv = null;
      this._syncBtn();
   },

   resume() {
      if (this.state !== "paused") return;
      this.state = "running";
      this._iv = setInterval(() => this._tick(), 1000);
      this._syncBtn();
   },

   reset() {
      clearInterval(this._iv); this._iv = null;
      this.state = "idle"; this.phase = "focus"; this.currentSession = 1;
      document.title = "Chronos Timer";
      UI.showPanel("config");
   },

   skip() {
      clearInterval(this._iv); this._iv = null;
      this._end();
   },

   _begin(phase) {
      this.phase = phase;
      this.totalSec = (phase === "focus" ? this.focusMin : this.breakMin) * 60;
      this.remainSec = this.totalSec;
      this._render();
      this._iv = setInterval(() => this._tick(), 1000);
   },

   _tick() {
      this.remainSec--;
      this._render();
      if (this.remainSec <= 0) { clearInterval(this._iv); this._iv = null; this._end(); }
   },

   _end() {
      const isFocus = this.phase === "focus";
      isFocus ? Alerts.bell() : Alerts.back();
      Settings.notify(
         isFocus ? "⏸ Pausa!" : "⚡ Foco!",
         isFocus ? "Descanse." : `Sessão ${this.currentSession}`
      );
      if (isFocus) {
         if (this.currentSession >= this.totalSessions) { this._done(); return; }
         this._begin("break");
      } else {
         this.currentSession++;
         this._begin("focus");
      }
   },

   _done() {
      this.state = "idle";
      Alerts.complete();
      Settings.notify("🎉 Completo!", "Parabéns!");
      const total = this.focusMin * this.totalSessions;
      Stats.record(total, this.totalSessions);
      $("#done-minutes").textContent  = total;
      $("#done-sessions").textContent = this.totalSessions;
      document.title = "Chronos Timer";
      UI.showPanel("done");
   },

   _render() {
      const m       = Math.floor(Math.max(0, this.remainSec) / 60);
      const s       = Math.max(0, this.remainSec) % 60;
      const prog    = this.totalSec > 0 ? 1 - this.remainSec / this.totalSec : 0;
      const isBreak = this.phase === "break";

      $("#timer-min").textContent = pad(m);
      $("#timer-sec").textContent = pad(s);
      document.title = `${pad(m)}:${pad(s)} - ${isBreak ? "Pausa" : "Foco"} | Chronos`;

      const label = $("#timer-phase-label");
      label.textContent = isBreak ? "PAUSA" : "FOCO";
      label.classList.toggle("break-mode", isBreak);

      $("#timer-session-label").textContent = `Sessão ${this.currentSession} de ${this.totalSessions}`;

      const ring = $("#timer-ring-progress");
      ring.style.strokeDasharray  = CIRC;
      ring.style.strokeDashoffset = CIRC * (1 - prog);
      ring.classList.toggle("break-mode", isBreak);

      const dots = $("#session-dots");
      dots.innerHTML = "";
      for (let i = 1; i <= this.totalSessions; i++) {
         const dot = document.createElement("div");
         dot.className = "session-dot";
         if (i < this.currentSession) dot.classList.add("done");
         if (i === this.currentSession) dot.classList.add("now");
         dots.appendChild(dot);
      }
   },

   _syncBtn() {
      $("#btn-pause i").className = this.state === "paused" ? "fa-solid fa-play" : "fa-solid fa-pause";
   }
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

const PRIORITY_LABELS = { high: "Alta", medium: "Média", low: "Baixa" };

const Tasks = {
   _items: [],
   _filter: "all",

   init() {
      try { this._items = JSON.parse(localStorage.getItem("chronos_tasks") || "[]"); }
      catch { this._items = []; }
      this.render();
   },

   add(text, priority) {
      this._items.unshift({
         id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
         text: text.trim(),
         priority,
         completed: false
      });
      this._save();
      this.render();
   },

   toggle(id) {
      const task = this._items.find(i => i.id === id);
      if (task) { task.completed = !task.completed; this._save(); this.render(); }
   },

   remove(id) {
      this._items = this._items.filter(i => i.id !== id);
      this._save();
      this.render();
   },

   setFilter(f) { this._filter = f; this.render(); },
   clearAll()   { this._items = []; this._save(); this.render(); },

   _filtered() {
      if (this._filter === "active")    return this._items.filter(i => !i.completed);
      if (this._filter === "completed") return this._items.filter(i => i.completed);
      return this._items;
   },

   render() {
      const list  = $("#task-list");
      const empty = $("#task-empty");
      const items = this._filtered();

      if (!items.length) {
         list.innerHTML = "";
         empty.style.display = "block";
         return;
      }

      empty.style.display = "none";
      list.innerHTML = items.map(task => `
         <li class="task-item${task.completed ? " completed" : ""}">
            <button class="task-checkbox" data-id="${task.id}">
               ${task.completed ? '<i class="fa-solid fa-check"></i>' : ""}
            </button>
            <span class="task-item-text">${this._escape(task.text)}</span>
            <span class="task-priority-tag ${task.priority}">${PRIORITY_LABELS[task.priority]}</span>
            <button class="task-delete-btn" data-id="${task.id}"><i class="fa-solid fa-trash"></i></button>
         </li>
      `).join("");

      list.querySelectorAll(".task-checkbox").forEach(b =>
         b.onclick = () => this.toggle(b.dataset.id)
      );
      list.querySelectorAll(".task-delete-btn").forEach(b =>
         b.onclick = () => { this.remove(b.dataset.id); showToast("Removida", "info"); }
      );
   },

   _escape(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; },
   _save()    { try { localStorage.setItem("chronos_tasks", JSON.stringify(this._items)); } catch {} }
};

// ─── Stats ────────────────────────────────────────────────────────────────────

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const Stats = {
   _d: {},

   init() {
      try { this._d = JSON.parse(localStorage.getItem("chronos_stats") || "{}"); }
      catch { this._d = {}; }
      if (!this._d.days) this._d.days = {};
      this.render();
   },

   record(min, sessions) {
      const today = new Date().toISOString().slice(0, 10);
      if (!this._d.days[today]) this._d.days[today] = { min: 0, ses: 0 };
      this._d.days[today].min += min;
      this._d.days[today].ses += sessions;
      this._d.totalMin = (this._d.totalMin || 0) + min;
      this._d.totalSes = (this._d.totalSes || 0) + sessions;
      this._d.streak   = this._calcStreak();
      this._save();
      this.render();
   },

   clear() {
      this._d = { days: {}, totalMin: 0, totalSes: 0, streak: 0 };
      this._save();
      this.render();
   },

   _calcStreak() {
      let streak = 0;
      const d = new Date();
      for (let i = 0; i < 365; i++) {
         const key = d.toISOString().slice(0, 10);
         if (this._d.days[key]?.ses > 0) streak++;
         else if (i > 0) break;
         d.setDate(d.getDate() - 1);
      }
      return streak;
   },

   render() {
      const tm = this._d.totalMin || 0;
      const h  = Math.floor(tm / 60);
      const m  = tm % 60;

      $("#stat-streak").textContent         = this._d.streak || 0;
      $("#stat-total-time").textContent     = h > 0 ? `${h}h${m > 0 ? m + "m" : ""}` : `${m}m`;
      $("#stat-total-sessions").textContent = this._d.totalSes || 0;

      const best = Object.values(this._d.days).reduce((max, d) => Math.max(max, d.min || 0), 0);
      $("#stat-best-day").textContent = `${best}min`;

      this._renderWeekChart();
      this._renderHistory();
   },

   _renderWeekChart() {
      const now  = new Date();
      const week = Array.from({ length: 7 }, (_, i) => {
         const dt  = new Date(now);
         dt.setDate(dt.getDate() - (6 - i));
         const key = dt.toISOString().slice(0, 10);
         return { day: WEEK_DAYS[dt.getDay()], min: this._d.days[key]?.min || 0 };
      });
      const max = Math.max(...week.map(w => w.min), 1);

      $("#weekly-chart").innerHTML = week.map(w => `
         <div class="chart-col">
            <div class="chart-bar" style="height:${Math.max((w.min / max) * 100, 3)}%">
               ${w.min > 0 ? `<span class="chart-bar-val">${w.min}m</span>` : ""}
            </div>
            <span class="chart-bar-day">${w.day}</span>
         </div>
      `).join("");
   },

   _renderHistory() {
      const entries = Object.entries(this._d.days).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7);
      const list    = $("#history-list");

      if (!entries.length) {
         list.innerHTML = '<p style="color:var(--txt3);text-align:center;padding:18px">Nenhuma sessão registrada.</p>';
         return;
      }

      list.innerHTML = entries.map(([date, d]) => {
         const dt    = new Date(date + "T12:00:00");
         const label = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
         return `
            <li class="history-item">
               <span class="history-date">${label}</span>
               <span class="history-detail">${d.ses} sessão(ões)</span>
               <span class="history-time">${d.min}min</span>
            </li>
         `;
      }).join("");
   },

   _save() { try { localStorage.setItem("chronos_stats", JSON.stringify(this._d)); } catch {} }
};

// ─── UI ───────────────────────────────────────────────────────────────────────

const UI = {
   init() {
      this._setupSidebar();
      this._setupDate();
      this._setupConfigInputs();
      this._setupPresets();
      this._setupTimerBtns();
      this._setupTasks();
      this._setupSettings();
      this._setupKeyboard();
   },

   showPanel(name) {
      $("#timer-config").style.display = name === "config" ? "block" : "none";
      $("#timer-active").style.display = name === "active" ? "flex"  : "none";
      $("#timer-done").style.display   = name === "done"   ? "block" : "none";
   },

   switchView(name) {
      $$(".app-view").forEach(v => v.classList.remove("active"));
      $(`#view-${name}`)?.classList.add("active");
      $$(".sidebar-link").forEach(l => l.classList.toggle("active", l.dataset.view === name));
      this._closeSidebar();
      if (name === "stats") Stats.render();
      if (name === "tasks") { Tasks.render(); document.getElementById("task-input")?.focus(); }
   },

   // ── Helpers ────────────────────────────────────────────────────────────────

   _closeSidebar() {
      $("#sidebar").classList.remove("open");
      $("#sidebar-overlay").classList.remove("active");
   },

   _setThemeIcon(theme) {
      $("#theme-toggle-btn i").className = theme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
   },

   _setActive(selector, attr, value) {
      $$(selector).forEach(el => el.classList.toggle("active", el.dataset[attr] === value));
   },

   // ── Setup ──────────────────────────────────────────────────────────────────

   _setupSidebar() {
      $("#sidebar-open")?.addEventListener("click", () => {
         $("#sidebar").classList.add("open");
         $("#sidebar-overlay").classList.add("active");
      });
      $("#sidebar-close")?.addEventListener("click",   () => this._closeSidebar());
      $("#sidebar-overlay")?.addEventListener("click", () => this._closeSidebar());
      $$(".sidebar-link").forEach(l => l.addEventListener("click", () => this.switchView(l.dataset.view)));
   },

   _setupDate() {
      const el = $("#current-date");
      if (el) el.textContent = new Date().toLocaleDateString("pt-BR", {
         weekday: "long", day: "numeric", month: "long", year: "numeric"
      });
   },

   _setupConfigInputs() {
      $$(".config-step-btn").forEach(b => b.addEventListener("click", () => {
         const inp = $(`#${b.dataset.target}`);
         const v   = parseInt(inp.value) || 0;
         const min = parseInt(inp.min)   || 1;
         const max = parseInt(inp.max)   || 120;
         inp.value = b.dataset.action === "increase" ? Math.min(v + 1, max) : Math.max(v - 1, min);
      }));
   },

   _setupPresets() {
      $$(".preset-chip").forEach(b => b.addEventListener("click", () => {
         $("#input-focus").value    = b.dataset.focus;
         $("#input-break").value    = b.dataset.break;
         $("#input-sessions").value = b.dataset.sessions;
         showToast(`Preset "${b.textContent.trim()}" aplicado`, "info");
      }));
   },

   _setupTimerBtns() {
      $("#btn-start")?.addEventListener("click", () => {
         const f = parseInt($("#input-focus").value);
         const b = parseInt($("#input-break").value);
         const s = parseInt($("#input-sessions").value);
         if (!f || f < 1) { showToast("Defina o foco", "warning"); return; }
         if (!b || b < 1) { showToast("Defina a pausa", "warning"); return; }
         if (!s || s < 1) { showToast("Defina as sessões", "warning"); return; }
         Timer.configure(f, b, s);
         this.showPanel("active");
         Timer.start();
         showToast("Bom foco! ⚡", "success");
      });

      $("#btn-pause")?.addEventListener("click",       () => Timer.toggle());
      $("#btn-reset")?.addEventListener("click",       () => { Timer.reset(); showToast("Resetado", "info"); });
      $("#btn-skip")?.addEventListener("click",        () => Timer.skip());
      $("#btn-new-session")?.addEventListener("click", () => { this.showPanel("config"); document.title = "Chronos Timer"; });
   },

   _setupTasks() {
      const taskInput  = document.getElementById("task-input");
      const taskSelect = document.getElementById("task-priority-select");
      const addBtn     = document.getElementById("btn-add-task");

      const add = () => {
         if (!taskInput) return;
         const text = taskInput.value.trim();
         if (!text) { showToast("Digite o nome da tarefa", "warning"); taskInput.focus(); return; }
         Tasks.add(text, taskSelect?.value ?? "medium");
         taskInput.value = "";
         taskInput.focus();
         showToast("Adicionada ✓", "success");
      };

      addBtn?.addEventListener("click",     add);
      taskInput?.addEventListener("keydown", e => { if (e.key === "Enter") add(); });

      $$(".task-filter").forEach(b => b.addEventListener("click", () => {
         this._setActive(".task-filter", "filter", b.dataset.filter);
         Tasks.setFilter(b.dataset.filter);
      }));
   },

   _setupSettings() {
      $("#theme-toggle-btn")?.addEventListener("click", () => {
         const theme = Settings.get("theme") === "dark" ? "light" : "dark";
         Settings.set("theme", theme);
         Settings.apply();
         this._setThemeIcon(theme);
         this._setActive(".theme-opt", "theme", theme);
      });

      $$(".theme-opt").forEach(b => b.addEventListener("click", () => {
         Settings.set("theme", b.dataset.theme);
         Settings.apply();
         this._setThemeIcon(b.dataset.theme);
         this._setActive(".theme-opt", "theme", b.dataset.theme);
      }));

      $$(".color-dot").forEach(b => b.addEventListener("click", () => {
         Settings.set("accent", b.dataset.accent);
         Settings.apply();
         this._setActive(".color-dot", "accent", b.dataset.accent);
      }));

      $("#setting-notifications")?.addEventListener("change", e => {
         if (e.target.checked && "Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
         }
         Settings.set("notifications", e.target.checked);
      });

      $("#setting-alert-sound")?.addEventListener("change", e => Settings.set("alertSound",  e.target.checked));
      $("#alert-volume")?.addEventListener("input",         e => Settings.set("alertVolume", e.target.value / 100));

      // Sincroniza estado inicial dos controles
      const syncCheck = (id, key) => { const el = $(id); if (el) el.checked = Settings.get(key); };
      syncCheck("#setting-notifications", "notifications");
      syncCheck("#setting-alert-sound",   "alertSound");

      const vol = $("#alert-volume");
      if (vol) vol.value = Math.round((Settings.get("alertVolume") || 0.3) * 100);

      this._setActive(".theme-opt", "theme",  Settings.get("theme"));
      this._setActive(".color-dot", "accent", Settings.get("accent"));
      this._setThemeIcon(Settings.get("theme"));

      $("#btn-clear-stats")?.addEventListener("click", () => {
         if (confirm("Limpar estatísticas?")) { Stats.clear(); showToast("Estatísticas limpas", "info"); }
      });
      $("#btn-clear-tasks")?.addEventListener("click", () => {
         if (confirm("Remover todas as tarefas?")) { Tasks.clearAll(); showToast("Tarefas removidas", "info"); }
      });
   },

   _setupKeyboard() {
      document.addEventListener("keydown", e => {
         if (e.code === "Space" && Timer.state !== "idle" && !e.target.matches("input,textarea,select")) {
            e.preventDefault();
            Timer.toggle();
         }
      });
   }
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
   Settings.init();
   Tasks.init();
   Stats.init();
   UI.init();
});
