"use strict";

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const pad = n => String(n).padStart(2, "0");

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

const Settings = {
   _d: {},

   init() {
      const def = { theme: "dark", accent: "cyan", notifications: false, alertSound: true, alertVolume: 0.3 };
      try { this._d = { ...def, ...JSON.parse(localStorage.getItem("chronos_settings") || "{}") }; }
      catch { this._d = { ...def }; }
      this.apply();
   },

   get(k) { return this._d[k]; },

   set(k, v) {
      this._d[k] = v;
      try { localStorage.setItem("chronos_settings", JSON.stringify(this._d)); } catch {}
   },

   apply() {
      document.documentElement.setAttribute("data-theme", this._d.theme);
      document.documentElement.setAttribute("data-accent", this._d.accent);
   },

   notify(title, body) {
      if (!this._d.notifications) return;
      if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body });
   }
};

const Alerts = {
   _ctx: null,

   _ensure() {
      if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this._ctx.state === "suspended") this._ctx.resume();
   },

   bell() {
      if (!Settings.get("alertSound")) return;
      this._ensure();
      const c = this._ctx, vol = Settings.get("alertVolume") || 0.3;
      [523.25, 783.99].forEach((freq, i) => {
         const o = c.createOscillator(), g = c.createGain();
         o.type = "sine";
         o.frequency.value = freq;
         g.gain.setValueAtTime(0, c.currentTime + i * 0.12);
         g.gain.linearRampToValueAtTime(vol * 0.5, c.currentTime + i * 0.12 + 0.08);
         g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 1.2);
         o.connect(g);
         g.connect(c.destination);
         o.start(c.currentTime + i * 0.12);
         o.stop(c.currentTime + i * 0.12 + 1.2);
      });
   },

   back() {
      if (!Settings.get("alertSound")) return;
      this._ensure();
      const c = this._ctx, vol = Settings.get("alertVolume") || 0.3;
      [392, 440, 523.25].forEach((freq, i) => {
         const o = c.createOscillator(), g = c.createGain();
         o.type = "triangle";
         o.frequency.value = freq;
         g.gain.setValueAtTime(0, c.currentTime + i * 0.1);
         g.gain.linearRampToValueAtTime(vol * 0.4, c.currentTime + i * 0.1 + 0.06);
         g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.1 + 0.8);
         o.connect(g);
         g.connect(c.destination);
         o.start(c.currentTime + i * 0.1);
         o.stop(c.currentTime + i * 0.1 + 0.8);
      });
   },

   complete() {
      if (!Settings.get("alertSound")) return;
      this._ensure();
      const c = this._ctx, vol = Settings.get("alertVolume") || 0.3;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
         const o = c.createOscillator(), g = c.createGain();
         o.type = "sine";
         o.frequency.value = freq;
         g.gain.setValueAtTime(0, c.currentTime + i * 0.15);
         g.gain.linearRampToValueAtTime(vol * 0.45, c.currentTime + i * 0.15 + 0.06);
         g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.15 + 0.9);
         o.connect(g);
         g.connect(c.destination);
         o.start(c.currentTime + i * 0.15);
         o.stop(c.currentTime + i * 0.15 + 0.9);
      });
   }
};

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
      this.focusMin = f;
      this.breakMin = b;
      this.totalSessions = s;
      this.currentSession = 1;
      this.phase = "focus";
      this.state = "idle";
   },

   start() {
      this.state = "running";
      this._begin(this.phase);
   },

   pause() {
      if (this.state !== "running") return;
      this.state = "paused";
      clearInterval(this._iv);
      this._iv = null;
      this._syncBtn();
   },

   resume() {
      if (this.state !== "paused") return;
      this.state = "running";
      this._iv = setInterval(() => this._tick(), 1000);
      this._syncBtn();
   },

   toggle() {
      this.state === "running" ? this.pause() : this.resume();
   },

   reset() {
      clearInterval(this._iv);
      this._iv = null;
      this.state = "idle";
      this.phase = "focus";
      this.currentSession = 1;
      document.title = "Chronos Timer";
      UI.showPanel("config");
   },

   skip() {
      clearInterval(this._iv);
      this._iv = null;
      this._end();
   },

   _begin(ph) {
      this.phase = ph;
      this.totalSec = (ph === "focus" ? this.focusMin : this.breakMin) * 60;
      this.remainSec = this.totalSec;
      this._render();
      this._iv = setInterval(() => this._tick(), 1000);
   },

   _tick() {
      this.remainSec--;
      this._render();
      if (this.remainSec <= 0) {
         clearInterval(this._iv);
         this._iv = null;
         this._end();
      }
   },

   _end() {
      if (this.phase === "focus") Alerts.bell();
      else Alerts.back();

      Settings.notify(
         this.phase === "focus" ? "⏸ Pausa!" : "⚡ Foco!",
         this.phase === "focus" ? "Descanse." : `Sessão ${this.currentSession}`
      );

      if (this.phase === "focus") {
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
      $("#done-minutes").textContent = total;
      $("#done-sessions").textContent = this.totalSessions;
      document.title = "Chronos Timer";
      UI.showPanel("done");
   },

   _render() {
      const m = Math.floor(Math.max(0, this.remainSec) / 60);
      const s = Math.max(0, this.remainSec) % 60;
      const prog = this.totalSec > 0 ? 1 - this.remainSec / this.totalSec : 0;
      const brk = this.phase === "break";

      $("#timer-min").textContent = pad(m);
      $("#timer-sec").textContent = pad(s);
      $("#timer-phase-label").textContent = brk ? "PAUSA" : "FOCO";
      $("#timer-session-label").textContent = `Sessão ${this.currentSession} de ${this.totalSessions}`;

      const ring = $("#timer-ring-progress");
      ring.style.strokeDasharray = CIRC;
      ring.style.strokeDashoffset = CIRC * (1 - prog);
      ring.classList.toggle("break-mode", brk);
      $("#timer-phase-label").classList.toggle("break-mode", brk);

      document.title = `${pad(m)}:${pad(s)} - ${brk ? "Pausa" : "Foco"} | Chronos`;

      const dots = $("#session-dots");
      dots.innerHTML = "";
      for (let i = 1; i <= this.totalSessions; i++) {
         const d = document.createElement("div");
         d.className = "session-dot";
         if (i < this.currentSession) d.classList.add("done");
         if (i === this.currentSession) d.classList.add("now");
         dots.appendChild(d);
      }
   },

   _syncBtn() {
      $("#btn-pause i").className = this.state === "paused" ? "fa-solid fa-play" : "fa-solid fa-pause";
   }
};

const Tasks = {
   _items: [],
   _filter: "all",

   init() {
      try { this._items = JSON.parse(localStorage.getItem("chronos_tasks") || "[]"); }
      catch { this._items = []; }
      this.render();
   },

   add(t, p) {
      this._items.unshift({
         id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
         text: t.trim(),
         priority: p,
         completed: false
      });
      this._save();
      this.render();
   },

   toggle(id) {
      const t = this._items.find(i => i.id === id);
      if (t) { t.completed = !t.completed; this._save(); this.render(); }
   },

   remove(id) {
      this._items = this._items.filter(i => i.id !== id);
      this._save();
      this.render();
   },

   setFilter(f) { this._filter = f; this.render(); },

   clearAll() { this._items = []; this._save(); this.render(); },

   _filt() {
      if (this._filter === "active") return this._items.filter(i => !i.completed);
      if (this._filter === "completed") return this._items.filter(i => i.completed);
      return this._items;
   },

   render() {
      const list = $("#task-list"), empty = $("#task-empty"), items = this._filt();
      if (!items.length) { list.innerHTML = ""; empty.style.display = "block"; return; }
      empty.style.display = "none";

      list.innerHTML = items.map(t => `
         <li class="task-item${t.completed ? " completed" : ""}">
            <button class="task-checkbox" data-id="${t.id}">
               ${t.completed ? '<i class="fa-solid fa-check"></i>' : ""}
            </button>
            <span class="task-item-text">${this._e(t.text)}</span>
            <span class="task-priority-tag ${t.priority}">
               ${t.priority === "high" ? "Alta" : t.priority === "medium" ? "Média" : "Baixa"}
            </span>
            <button class="task-delete-btn" data-id="${t.id}"><i class="fa-solid fa-trash"></i></button>
         </li>
      `).join("");

      list.querySelectorAll(".task-checkbox").forEach(b => b.onclick = () => this.toggle(b.dataset.id));
      list.querySelectorAll(".task-delete-btn").forEach(b => b.onclick = () => { this.remove(b.dataset.id); showToast("Removida", "info"); });
   },

   _e(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; },

   _save() { try { localStorage.setItem("chronos_tasks", JSON.stringify(this._items)); } catch {} }
};

const Stats = {
   _d: {},

   init() {
      try { this._d = JSON.parse(localStorage.getItem("chronos_stats") || "{}"); }
      catch { this._d = {}; }
      if (!this._d.days) this._d.days = {};
      this.render();
   },

   record(min, ses) {
      const t = new Date().toISOString().slice(0, 10);
      if (!this._d.days[t]) this._d.days[t] = { min: 0, ses: 0 };
      this._d.days[t].min += min;
      this._d.days[t].ses += ses;
      this._d.totalMin = (this._d.totalMin || 0) + min;
      this._d.totalSes = (this._d.totalSes || 0) + ses;

      let streak = 0;
      const d = new Date();
      for (let i = 0; i < 365; i++) {
         const k = d.toISOString().slice(0, 10);
         if (this._d.days[k]?.ses > 0) streak++;
         else if (i > 0) break;
         d.setDate(d.getDate() - 1);
      }
      this._d.streak = streak;
      this._save();
      this.render();
   },

   clear() {
      this._d = { days: {}, totalMin: 0, totalSes: 0, streak: 0 };
      this._save();
      this.render();
   },

   render() {
      const tm = this._d.totalMin || 0;
      const h = Math.floor(tm / 60), m = tm % 60;

      $("#stat-streak").textContent = this._d.streak || 0;
      $("#stat-total-time").textContent = h > 0 ? `${h}h${m > 0 ? m + "m" : ""}` : `${m}m`;
      $("#stat-total-sessions").textContent = this._d.totalSes || 0;

      const best = Object.values(this._d.days).reduce((mx, d) => Math.max(mx, d.min || 0), 0);
      $("#stat-best-day").textContent = `${best}min`;

      const dn = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const wk = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
         const dt = new Date(now);
         dt.setDate(dt.getDate() - i);
         const k = dt.toISOString().slice(0, 10);
         wk.push({ day: dn[dt.getDay()], min: this._d.days[k]?.min || 0 });
      }
      const mx = Math.max(...wk.map(w => w.min), 1);
      $("#weekly-chart").innerHTML = wk.map(w => `
         <div class="chart-col">
            <div class="chart-bar" style="height:${Math.max((w.min / mx) * 100, 3)}%">
               ${w.min > 0 ? `<span class="chart-bar-val">${w.min}m</span>` : ""}
            </div>
            <span class="chart-bar-day">${w.day}</span>
         </div>
      `).join("");

      const ent = Object.entries(this._d.days).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7);
      const hl = $("#history-list");
      if (!ent.length) {
         hl.innerHTML = '<p style="color:var(--txt3);text-align:center;padding:18px">Nenhuma sessão registrada.</p>';
      } else {
         hl.innerHTML = ent.map(([date, d]) => {
            const dt = new Date(date + "T12:00:00");
            return `
               <li class="history-item">
                  <span class="history-date">${dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                  <span class="history-detail">${d.ses} sessão(ões)</span>
                  <span class="history-time">${d.min}min</span>
               </li>
            `;
         }).join("");
      }
   },

   _save() { try { localStorage.setItem("chronos_stats", JSON.stringify(this._d)); } catch {} }
};

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

   showPanel(n) {
      $("#timer-config").style.display = n === "config" ? "block" : "none";
      $("#timer-active").style.display = n === "active" ? "flex" : "none";
      $("#timer-done").style.display = n === "done" ? "block" : "none";
   },

   switchView(name) {
      $$(".app-view").forEach(v => v.classList.remove("active"));
      $(`#view-${name}`)?.classList.add("active");
      $$(".sidebar-link").forEach(l => l.classList.toggle("active", l.dataset.view === name));
      $("#sidebar").classList.remove("open");
      $("#sidebar-overlay").classList.remove("active");
      if (name === "stats") Stats.render();
      if (name === "tasks") Tasks.render();
   },

   _setupSidebar() {
      $("#sidebar-open")?.addEventListener("click", () => {
         $("#sidebar").classList.add("open");
         $("#sidebar-overlay").classList.add("active");
      });
      $("#sidebar-close")?.addEventListener("click", () => {
         $("#sidebar").classList.remove("open");
         $("#sidebar-overlay").classList.remove("active");
      });
      $("#sidebar-overlay")?.addEventListener("click", () => {
         $("#sidebar").classList.remove("open");
         $("#sidebar-overlay").classList.remove("active");
      });
      $$(".sidebar-link").forEach(l => l.addEventListener("click", () => this.switchView(l.dataset.view)));
   },

   _setupDate() {
      const el = $("#current-date");
      if (el) el.textContent = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
   },

   _setupConfigInputs() {
      $$(".config-step-btn").forEach(b => b.addEventListener("click", () => {
         const inp = $(`#${b.dataset.target}`);
         const v = parseInt(inp.value) || 0;
         const mn = parseInt(inp.min) || 1;
         const mx = parseInt(inp.max) || 120;
         inp.value = b.dataset.action === "increase" ? Math.min(v + 1, mx) : Math.max(v - 1, mn);
      }));
   },

   _setupPresets() {
      $$(".preset-chip").forEach(b => b.addEventListener("click", () => {
         $("#input-focus").value = b.dataset.focus;
         $("#input-break").value = b.dataset.break;
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

      $("#btn-pause")?.addEventListener("click", () => Timer.toggle());
      $("#btn-reset")?.addEventListener("click", () => { Timer.reset(); showToast("Resetado", "info"); });
      $("#btn-skip")?.addEventListener("click", () => Timer.skip());
      $("#btn-new-session")?.addEventListener("click", () => { this.showPanel("config"); document.title = "Chronos Timer"; });
   },

   _setupTasks() {
      const add = () => {
         const t = $("#task-input").value.trim();
         if (!t) return;
         Tasks.add(t, $("#task-priority-select").value);
         $("#task-input").value = "";
         showToast("Adicionada ✓", "success");
      };
      $("#btn-add-task")?.addEventListener("click", add);
      $("#task-input")?.addEventListener("keydown", e => { if (e.key === "Enter") add(); });
      $$(".task-filter").forEach(b => b.addEventListener("click", () => {
         $$(".task-filter").forEach(f => f.classList.remove("active"));
         b.classList.add("active");
         Tasks.setFilter(b.dataset.filter);
      }));
   },

   _setupSettings() {
      $("#theme-toggle-btn")?.addEventListener("click", () => {
         const n = Settings.get("theme") === "dark" ? "light" : "dark";
         Settings.set("theme", n);
         Settings.apply();
         $("#theme-toggle-btn i").className = n === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
         $$(".theme-opt").forEach(o => o.classList.toggle("active", o.dataset.theme === n));
      });

      $$(".theme-opt").forEach(b => b.addEventListener("click", () => {
         Settings.set("theme", b.dataset.theme);
         Settings.apply();
         $$(".theme-opt").forEach(o => o.classList.remove("active"));
         b.classList.add("active");
         $("#theme-toggle-btn i").className = b.dataset.theme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
      }));

      $$(".color-dot").forEach(b => b.addEventListener("click", () => {
         Settings.set("accent", b.dataset.accent);
         Settings.apply();
         $$(".color-dot").forEach(o => o.classList.remove("active"));
         b.classList.add("active");
      }));

      $("#setting-notifications")?.addEventListener("change", e => {
         if (e.target.checked && "Notification" in window && Notification.permission === "default") Notification.requestPermission();
         Settings.set("notifications", e.target.checked);
      });

      $("#setting-alert-sound")?.addEventListener("change", e => Settings.set("alertSound", e.target.checked));
      $("#alert-volume")?.addEventListener("input", e => Settings.set("alertVolume", e.target.value / 100));

      const el = (id, key) => { const e = $(id); if (e) e.checked = Settings.get(key); };
      el("#setting-notifications", "notifications");
      el("#setting-alert-sound", "alertSound");
      const av = $("#alert-volume");
      if (av) av.value = Math.round((Settings.get("alertVolume") || 0.3) * 100);

      $$(".theme-opt").forEach(o => o.classList.toggle("active", o.dataset.theme === Settings.get("theme")));
      $$(".color-dot").forEach(o => o.classList.toggle("active", o.dataset.accent === Settings.get("accent")));
      $("#theme-toggle-btn i").className = Settings.get("theme") === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";

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

document.addEventListener("DOMContentLoaded", () => {
   Settings.init();
   Tasks.init();
   Stats.init();
   UI.init();
});