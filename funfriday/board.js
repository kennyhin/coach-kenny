import { FUNFRIDAY_WEB_APP_URL } from "./config.js";
import {
  DEFAULT_SESSIONS,
  addMinutes,
  findConflicts,
  formatPacific,
  prettyTime,
} from "./schedule.mjs";
import { parseScheduleResponse, scheduleGetRequest, schedulePostRequest } from "./remote.js";

const LOCAL_KEY = "funfriday-board-v1";
const PASS_KEY = "funfriday-edit-passcode";
const DISMISS_KEY = "funfriday-dismiss-local";

let sessions = [];
let updatedAt = null;
let editing = false;
let unlocked = false;
let passcode = "";
let drag = null;
let saveTimer = null;
let saveTail = Promise.resolve();
let loadError = "";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function lineupSignature(list) {
  return JSON.stringify(list.map((s) => ({
    name: s.name,
    start: s.start,
    end: s.end,
    kinder: s.kinder,
    big: s.big,
  })));
}

function renderStatus(extra) {
  const el = document.getElementById("updated");
  el.replaceChildren();
  const when = formatPacific(updatedAt);
  el.append(when ? "Last updated " + when : "Last updated —");
  if (!extra) return;
  const span = document.createElement("span");
  span.className = "save-state" + (extra.bad ? " bad" : "");
  span.textContent = extra.text;
  el.append(span);
}

function refreshConflicts() {
  const el = document.getElementById("conflicts");
  const lines = findConflicts(sessions);
  if (!lines.length) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = lines.join("\n");
}

function hideNotice() {
  const el = document.getElementById("notice");
  el.hidden = true;
  el.replaceChildren();
}

function showTextNotice(text) {
  const el = document.getElementById("notice");
  el.hidden = false;
  el.replaceChildren(document.createTextNode(text));
}

function readLocalDraft() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function maybeOfferLocalDraft() {
  if (loadError || !unlocked || !FUNFRIDAY_WEB_APP_URL) return;
  if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
  const draft = readLocalDraft();
  if (!draft || lineupSignature(draft) === lineupSignature(sessions)) return;
  const el = document.getElementById("notice");
  el.hidden = false;
  el.replaceChildren();
  el.append(document.createTextNode("This browser still has a lineup other teachers can't see. "));
  const publish = document.createElement("button");
  publish.type = "button";
  publish.className = "tool";
  publish.id = "publish-local";
  publish.textContent = "Publish it for everyone";
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "tool";
  dismiss.textContent = "Dismiss";
  publish.addEventListener("click", async () => {
    sessions = draft;
    editing = true;
    render();
    const ok = await (saveTail = saveTail.then(() => persist(), () => persist()));
    if (ok) localStorage.removeItem(LOCAL_KEY);
    hideNotice();
  });
  dismiss.addEventListener("click", () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    hideNotice();
  });
  el.append(publish, dismiss);
}

function render() {
  const root = document.getElementById("sessions");
  root.innerHTML = sessions.map((s, i) => {
    const walkStart = s.end;
    const walkEnd = addMinutes(s.end, 5);
    const times = editing
      ? `<label>Start <input type="time" data-field="start" value="${s.start}"></label>
         <span class="dash">–</span>
         <label>End <input type="time" data-field="end" value="${s.end}"></label>
         ${sessions.length > 1 ? `<button class="tool" data-remove="${i}" type="button">Remove</button>` : ""}`
      : `<label>Start <span class="time-read">${prettyTime(s.start)}</span></label>
         <span class="dash">–</span>
         <label>End <span class="time-read">${prettyTime(s.end)}</span></label>`;
    return `
      <article class="session" data-session="${i}">
        <div class="session-top">
          <div class="session-name">${escapeHtml(s.name)}</div>
          <div class="times">${times}</div>
        </div>
        <p class="walk">Walk back ${prettyTime(walkStart)}–${prettyTime(walkEnd)}</p>
        <div class="yards">
          ${yardHtml(i, "kinder", "Kinder playground", s.kinder)}
          ${yardHtml(i, "big", "Big playground", s.big)}
        </div>
      </article>`;
  }).join("");

  document.getElementById("hint").textContent = editing
    ? "Drag grade blocks between yards. Click a name to edit it. Change session times — walk-back is always 5 minutes after. Saves are shared with every teacher."
    : (FUNFRIDAY_WEB_APP_URL && !loadError
      ? "Shared lineup. Everyone sees these times."
      : "Built-in times on this screen.");
  document.getElementById("add-session").hidden = !editing;
  document.getElementById("reset").hidden = !editing;
  const editBtn = document.getElementById("edit-toggle");
  editBtn.textContent = editing ? "Done editing" : "Edit lineup";
  editBtn.setAttribute("aria-pressed", editing ? "true" : "false");
  refreshConflicts();
  renderStatus();
  bind();
}

function yardHtml(sessionIdx, yard, label, grades) {
  const chips = grades.map((g, gi) => editing
    ? `<div class="grade" draggable="true" data-grade="${sessionIdx}:${yard}:${gi}">
         <input value="${escapeHtml(g)}" maxlength="8" aria-label="${yard} grade">
       </div>`
    : `<div class="grade grade-locked">${escapeHtml(g)}</div>`
  ).join("");
  const add = editing
    ? `<button class="add-grade" data-add="${sessionIdx}:${yard}" type="button">+ Grade</button>`
    : "";
  return `
    <div class="yard ${yard}" data-drop="${sessionIdx}:${yard}">
      <div class="pill">${label}</div>
      <div class="grades">${chips}${add}</div>
    </div>`;
}

function queueSave(immediate) {
  if (!editing) return;
  clearTimeout(saveTimer);
  const run = () => persist();
  if (immediate) {
    saveTail = saveTail.then(run, run);
    return saveTail;
  }
  saveTimer = setTimeout(() => {
    saveTail = saveTail.then(run, run);
  }, 400);
  return saveTail;
}

async function postLineup(sessionsOrNull) {
  const req = schedulePostRequest(FUNFRIDAY_WEB_APP_URL, passcode, sessionsOrNull);
  const res = await fetch(req.url, {
    method: req.method,
    headers: req.headers,
    body: req.body,
    redirect: req.redirect,
  });
  return parseScheduleResponse(await res.text());
}

async function persist() {
  const snapshot = structuredClone(sessions);
  renderStatus({ text: "Saving…" });
  let data;
  try {
    data = await postLineup(snapshot);
  } catch {
    renderStatus({ text: "Couldn't reach the lineup. Try again.", bad: true });
    return false;
  }
  if (!data.ok && data.error === "That code is not right.") {
    passcode = "";
    unlocked = false;
    editing = false;
    sessionStorage.removeItem(PASS_KEY);
    render();
    openGate(data.error);
    return false;
  }
  if (!data.ok) {
    renderStatus({ text: data.error || "Couldn't save.", bad: true });
    return false;
  }
  updatedAt = data.updatedAt;
  renderStatus({ text: "Saved" });
  refreshConflicts();
  return true;
}

function bind() {
  if (!editing) return;
  document.querySelectorAll(".times input[type='time']").forEach((input) => {
    const apply = (e) => {
      const article = e.target.closest("[data-session]");
      const idx = Number(article.dataset.session);
      const field = e.target.dataset.field;
      sessions[idx][field] = e.target.value || sessions[idx][field];
      const s = sessions[idx];
      article.querySelector(".walk").textContent =
        "Walk back " + prettyTime(s.end) + "–" + prettyTime(addMinutes(s.end, 5));
      refreshConflicts();
      queueSave(false);
    };
    input.addEventListener("input", apply);
    input.addEventListener("change", apply);
  });
  document.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      sessions.splice(Number(btn.dataset.remove), 1);
      sessions.forEach((s, i) => { s.name = "Session " + (i + 1); });
      render();
      queueSave(true);
    });
  });
  document.querySelectorAll(".grade").forEach((el) => {
    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") onPointerDown(e);
    });
    el.addEventListener("dragstart", (e) => {
      const [si, yard, gi] = el.dataset.grade.split(":");
      drag = { from: { si: Number(si), yard, gi: Number(gi) } };
      e.dataTransfer.setData("text/plain", el.dataset.grade);
      e.dataTransfer.effectAllowed = "move";
    });
  });
  document.querySelectorAll(".yard").forEach((z) => {
    z.addEventListener("dragover", (e) => {
      e.preventDefault();
      z.classList.add("over");
    });
    z.addEventListener("dragleave", () => z.classList.remove("over"));
    z.addEventListener("drop", (e) => {
      e.preventDefault();
      z.classList.remove("over");
      const payload = e.dataTransfer.getData("text/plain") || "";
      const from = drag?.from || (() => {
        const [si, yard, gi] = payload.split(":");
        return { si: Number(si), yard, gi: Number(gi) };
      })();
      const [tsi, tyard] = z.dataset.drop.split(":");
      moveGrade(from, { si: Number(tsi), yard: tyard });
      drag = null;
    });
  });
  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [si, yard] = btn.dataset.add.split(":");
      sessions[Number(si)][yard].push("Grade");
      render();
      queueSave(true);
    });
  });
  document.querySelectorAll(".grade input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const [si, yard, gi] = e.target.closest("[data-grade]").dataset.grade.split(":");
      sessions[Number(si)][yard][Number(gi)] = e.target.value.trim() || e.target.value;
      refreshConflicts();
      queueSave(false);
    });
    input.addEventListener("pointerdown", (e) => e.stopPropagation());
  });
}

function onPointerDown(e) {
  if (e.button != null && e.button !== 0) return;
  const el = e.currentTarget;
  const [si, yard, gi] = el.dataset.grade.split(":");
  const rect = el.getBoundingClientRect();
  drag = {
    from: { si: Number(si), yard, gi: Number(gi) },
    label: sessions[Number(si)][yard][Number(gi)],
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    moved: false,
    ghost: null,
    pointerId: e.pointerId,
  };
  el.setPointerCapture(e.pointerId);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(e) {
  if (!drag) return;
  const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
  if (!drag.moved && dist < 8) return;
  if (!drag.moved) {
    drag.moved = true;
    const src = e.currentTarget;
    const ghost = src.cloneNode(true);
    ghost.classList.add("ghost");
    ghost.style.width = src.offsetWidth + "px";
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    src.style.opacity = "0.35";
  }
  drag.ghost.style.left = (e.clientX - drag.offsetX) + "px";
  drag.ghost.style.top = (e.clientY - drag.offsetY) + "px";
  const over = dropzoneAt(e.clientX, e.clientY);
  document.querySelectorAll(".yard").forEach((z) => z.classList.toggle("over", z === over));
}

function onPointerUp(e) {
  const el = e.currentTarget;
  el.releasePointerCapture(drag?.pointerId || e.pointerId);
  el.removeEventListener("pointermove", onPointerMove);
  el.removeEventListener("pointerup", onPointerUp);
  el.removeEventListener("pointercancel", onPointerUp);
  if (!drag) return;
  const over = drag.moved ? dropzoneAt(e.clientX, e.clientY) : null;
  if (drag.ghost) drag.ghost.remove();
  document.querySelectorAll(".yard").forEach((z) => z.classList.remove("over"));
  el.style.opacity = "";
  if (over) {
    const [tsi, tyard] = over.dataset.drop.split(":");
    moveGrade(drag.from, { si: Number(tsi), yard: tyard });
  }
  drag = null;
}

function dropzoneAt(x, y) {
  const stack = document.elementsFromPoint(x, y);
  return stack.find((n) => n.classList?.contains("yard")) || null;
}

function moveGrade(from, to) {
  if (from.si === to.si && from.yard === to.yard) return;
  const item = sessions[from.si][from.yard].splice(from.gi, 1)[0];
  sessions[to.si][to.yard].push(item);
  render();
  queueSave(true);
}

function openGate(message) {
  const gate = document.getElementById("edit-gate");
  gate.classList.add("open");
  document.getElementById("edit-error").textContent = message || "";
  const input = document.getElementById("passcode");
  input.value = "";
  setTimeout(() => input.focus(), 30);
}

function closeGate() {
  document.getElementById("edit-gate").classList.remove("open");
  document.getElementById("edit-error").textContent = "";
}

async function tryUnlock(code) {
  if (!FUNFRIDAY_WEB_APP_URL) {
    document.getElementById("edit-error").textContent = "The shared lineup isn't connected yet.";
    return false;
  }
  passcode = code;
  let data;
  try {
    data = await postLineup(null);
  } catch {
    passcode = "";
    document.getElementById("edit-error").textContent = "Couldn't reach the lineup.";
    return false;
  }
  if (!data.ok) {
    passcode = "";
    const input = document.getElementById("passcode");
    document.getElementById("edit-error").textContent = data.error || "That code is not right.";
    input.value = "";
    if (document.getElementById("edit-gate").classList.contains("open")) input.focus();
    return false;
  }
  passcode = code;
  unlocked = true;
  editing = true;
  sessionStorage.setItem(PASS_KEY, code);
  closeGate();
  render();
  maybeOfferLocalDraft();
  return true;
}

document.getElementById("edit-toggle").addEventListener("click", () => {
  if (editing) {
    const due = saveTimer;
    clearTimeout(saveTimer);
    saveTimer = null;
    editing = false;
    render();
    if (due) saveTail = saveTail.then(() => persist(), () => persist());
    maybeOfferLocalDraft();
    return;
  }
  if (unlocked && passcode) {
    editing = true;
    render();
    return;
  }
  openGate(FUNFRIDAY_WEB_APP_URL ? "" : "The shared lineup isn't connected yet.");
});

document.getElementById("edit-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.getElementById("passcode").value;
  if (!code) return;
  tryUnlock(code);
});
document.getElementById("edit-cancel").addEventListener("click", closeGate);
document.getElementById("edit-gate").addEventListener("click", (e) => {
  if (e.target.id === "edit-gate") closeGate();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeGate();
});

document.getElementById("add-session").addEventListener("click", () => {
  if (!editing) return;
  const last = sessions[sessions.length - 1];
  const start = addMinutes(last.end, 5);
  const end = addMinutes(start, 10);
  sessions.push({
    name: "Session " + (sessions.length + 1),
    start,
    end,
    kinder: [],
    big: [],
  });
  render();
  queueSave(true);
});

document.getElementById("reset").addEventListener("click", () => {
  if (!editing) return;
  if (!confirm("Reset the shared lineup for everyone?")) return;
  sessions = structuredClone(DEFAULT_SESSIONS);
  render();
  queueSave(true);
});

async function boot() {
  document.getElementById("sessions").textContent = "Loading the lineup…";
  if (!FUNFRIDAY_WEB_APP_URL) {
    sessions = structuredClone(DEFAULT_SESSIONS);
    updatedAt = null;
    loadError = "These are the built-in times. They are not the shared lineup yet.";
    render();
    showTextNotice(loadError);
    return;
  }
  try {
    const req = scheduleGetRequest(FUNFRIDAY_WEB_APP_URL);
    const res = await fetch(req.url, { method: req.method, redirect: req.redirect, cache: req.cache });
    const data = parseScheduleResponse(await res.text());
    if (!data.ok || !Array.isArray(data.sessions)) {
      throw new Error(data.error || "Could not load the shared lineup.");
    }
    sessions = data.sessions;
    updatedAt = data.updatedAt || null;
  } catch (err) {
    sessions = structuredClone(DEFAULT_SESSIONS);
    updatedAt = null;
    loadError = err.message === "Failed to fetch"
      ? "Couldn't load the shared lineup, so these are the built-in times on this screen only."
      : (err.message || "Couldn't load the shared lineup, so these are the built-in times on this screen only.");
  }
  const stored = sessionStorage.getItem(PASS_KEY) || "";
  if (stored) {
    const ok = await tryUnlock(stored);
    if (!ok) {
      passcode = "";
      unlocked = false;
      editing = false;
      sessionStorage.removeItem(PASS_KEY);
      closeGate();
    }
  }
  render();
  if (loadError) showTextNotice(loadError);
  else maybeOfferLocalDraft();
}

boot();

(function supportAd() {
  const KEY = "funfriday-preseason-ad-v1";
  const scrim = document.getElementById("support-ad");
  const afterEvents = new Date("2026-09-06T00:00:00").getTime();
  const open = () => {
    scrim.classList.add("open");
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    scrim.classList.remove("open");
    document.body.style.overflow = "";
    localStorage.setItem(KEY, "1");
  };
  document.getElementById("show-ad").addEventListener("click", open);
  scrim.querySelector(".ad-close").addEventListener("click", close);
  scrim.querySelector(".ad-ok").addEventListener("click", close);
  scrim.addEventListener("click", (e) => { if (e.target === scrim) close(); });
  if (Date.now() >= afterEvents) return;
  if (!localStorage.getItem(KEY)) open();
})();
