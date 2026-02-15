let curricula = [];

async function load() {
  const data = await chrome.storage.local.get(["curricula"]);
  curricula = data.curricula || [];
  render();
}

function save() {
  chrome.storage.local.set({ curricula });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function extractVideoId(url) {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function render() {
  const el = document.getElementById("curricula-list");
  if (!curricula.length) {
    el.innerHTML = '<div class="empty-state">No curricula yet. Create one above.</div>';
    return;
  }
  el.innerHTML = curricula.map((c, ci) => {
    const totalV = c.videos.length;
    const doneV = c.videos.filter(v => v.completed).length;
    const totalQ = c.videos.reduce((s, v) => s + v.questions.length, 0);
    const doneQ = c.videos.reduce((s, v) => s + v.questionsCompleted, 0);
    const pct = totalV ? Math.round(doneV / totalV * 100) : 0;
    return `
      <div class="curriculum-card">
        <div class="curriculum-header">
          <h2>${esc(c.name)}</h2>
          <div class="actions">
            <button class="btn btn-sm btn-danger" data-delete-cur="${ci}">Delete</button>
          </div>
        </div>
        <div class="progress-bar"><div class="fill" style="width:${pct}%"></div></div>
        <div class="progress-text">${doneV}/${totalV} videos, ${doneQ}/${totalQ} questions</div>
        <ul class="video-list">
          ${c.videos.map((v, vi) => `
            <li class="video-item">
              <div class="video-item-header">
                <span class="video-item-title ${v.completed ? 'completed' : ''}">${esc(v.title)}</span>
                <div class="video-item-actions">
                  <button class="btn btn-sm btn-ghost collapsible-toggle" data-toggle-qs="${ci}-${vi}">Questions (${v.questions.length})</button>
                  <button class="btn btn-sm btn-danger" data-delete-vid="${ci}-${vi}">x</button>
                </div>
              </div>
              <div class="video-item-meta">${esc(v.url)}${v.start != null || v.end != null ? ` (${fmtTime(v.start)}–${fmtTime(v.end)})` : ''}</div>
              <div id="qs-${ci}-${vi}" style="display:none"></div>
            </li>
          `).join("")}
        </ul>
        <div class="add-form">
          <h3>Add Video</h3>
          <div class="form-row">
            <input id="vurl-${ci}" placeholder="YouTube URL">
            <input id="vtitle-${ci}" placeholder="Title (e.g. Eigenvalues - Intro)">
          </div>
          <div class="form-row">
            <input id="vstart-${ci}" placeholder="Start (e.g. 18:30) optional">
            <input id="vend-${ci}" placeholder="End (e.g. 45:00) optional">
            <button class="btn btn-sm" data-add-vid="${ci}">Add</button>
          </div>
        </div>
      </div>`;
  }).join("");

  // Bind event listeners
  el.querySelectorAll("[data-delete-cur]").forEach(btn => {
    btn.addEventListener("click", () => {
      const ci = parseInt(btn.dataset.deleteCur);
      if (confirm("Delete this curriculum?")) { curricula.splice(ci, 1); save(); render(); }
    });
  });
  el.querySelectorAll("[data-delete-vid]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [ci, vi] = btn.dataset.deleteVid.split("-").map(Number);
      curricula[ci].videos.splice(vi, 1); save(); render();
    });
  });
  el.querySelectorAll("[data-add-vid]").forEach(btn => {
    btn.addEventListener("click", () => addVideo(parseInt(btn.dataset.addVid)));
  });
  el.querySelectorAll("[data-toggle-qs]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [ci, vi] = btn.dataset.toggleQs.split("-").map(Number);
      toggleQuestions(btn, ci, vi);
    });
  });
}

function fmtTime(s) {
  if (s == null) return "end";
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function timeToSeconds(t) {
  if (!t) return null;
  const parts = t.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function addVideo(ci) {
  const url = document.getElementById(`vurl-${ci}`).value.trim();
  const title = document.getElementById(`vtitle-${ci}`).value.trim();
  if (!url || !title) return;
  const videoId = extractVideoId(url);
  if (!videoId) { alert("Invalid YouTube URL"); return; }
  const start = timeToSeconds(document.getElementById(`vstart-${ci}`).value.trim());
  const end = timeToSeconds(document.getElementById(`vend-${ci}`).value.trim());
  curricula[ci].videos.push({
    id: uid(), title, url, videoId, start, end, completed: false, questions: [], questionsCompleted: 0
  });
  save(); render();
}

function toggleQuestions(btn, ci, vi) {
  const el = document.getElementById(`qs-${ci}-${vi}`);
  const open = el.style.display !== "none";
  el.style.display = open ? "none" : "block";
  btn.classList.toggle("open", !open);
  if (!open) renderQuestions(ci, vi);
}

function renderQuestions(ci, vi) {
  const v = curricula[ci].videos[vi];
  const el = document.getElementById(`qs-${ci}-${vi}`);
  el.innerHTML = `
    <div class="question-list">
      ${v.questions.map((q, qi) => `
        <div class="question-item">
          <div>
            <div class="q-text">${esc(q.q)}</div>
            <div class="q-answer">Answer: ${esc(q.opts[q.a])}${q.exp ? ' — ' + esc(q.exp) : ''}</div>
          </div>
          <button class="btn btn-sm btn-danger" data-delete-q="${ci}-${vi}-${qi}">x</button>
        </div>
      `).join("") || '<div class="empty-state" style="padding:1rem">No questions yet</div>'}
    </div>
    <div class="question-form">
      <h4>Add Question</h4>
      <input id="qq-${ci}-${vi}" placeholder="Question text">
      <div class="opts-row">
        <input id="qo0-${ci}-${vi}" placeholder="Option A">
        <input id="qo1-${ci}-${vi}" placeholder="Option B">
        <input id="qo2-${ci}-${vi}" placeholder="Option C">
      </div>
      <div class="form-footer">
        <select id="qa-${ci}-${vi}">
          <option value="0">A is correct</option>
          <option value="1">B is correct</option>
          <option value="2">C is correct</option>
        </select>
        <input id="qe-${ci}-${vi}" placeholder="Explanation (optional)" style="flex:1">
        <button class="btn btn-sm" data-add-q="${ci}-${vi}">Add</button>
      </div>
    </div>
    <div class="question-form" style="margin-top:8px">
      <h4>Bulk Import JSON</h4>
      <textarea id="qbulk-${ci}-${vi}" placeholder='[{"q":"...","opts":["A","B","C"],"a":0,"exp":"..."}]' style="width:100%;height:60px;background:#252525;border:1px solid #333;border-radius:6px;color:#e0e0e0;font-size:0.8rem;padding:8px;resize:vertical;font-family:monospace"></textarea>
      <button class="btn btn-sm" data-bulk-q="${ci}-${vi}" style="margin-top:6px">Import</button>
    </div>`;

  el.querySelectorAll("[data-delete-q]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [c, v2, q] = btn.dataset.deleteQ.split("-").map(Number);
      curricula[c].videos[v2].questions.splice(q, 1); save(); renderQuestions(c, v2);
    });
  });
  el.querySelector("[data-add-q]").addEventListener("click", () => addQuestion(ci, vi));
  el.querySelector("[data-bulk-q]").addEventListener("click", () => {
    const raw = document.getElementById(`qbulk-${ci}-${vi}`).value.trim();
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw "Not an array";
      arr.forEach(q => {
        if (!q.q || !q.opts || q.a === undefined) throw "Invalid format";
        curricula[ci].videos[vi].questions.push({ q: q.q, opts: q.opts, a: q.a, exp: q.exp || "" });
      });
      save(); renderQuestions(ci, vi);
    } catch (e) { alert("Invalid JSON: " + e); }
  });
}

function addQuestion(ci, vi) {
  const q = document.getElementById(`qq-${ci}-${vi}`).value.trim();
  const opts = [0,1,2].map(i => document.getElementById(`qo${i}-${ci}-${vi}`).value.trim());
  const a = parseInt(document.getElementById(`qa-${ci}-${vi}`).value);
  const exp = document.getElementById(`qe-${ci}-${vi}`).value.trim();
  if (!q || opts.some(o => !o)) { alert("Fill in question and all options"); return; }
  curricula[ci].videos[vi].questions.push({ q, opts, a, exp });
  save(); renderQuestions(ci, vi);
}

document.getElementById("create-btn").addEventListener("click", () => {
  const name = document.getElementById("new-curriculum-name").value.trim();
  if (!name) return;
  curricula.push({ id: uid(), name, videos: [] });
  document.getElementById("new-curriculum-name").value = "";
  save(); render();
});

load();
