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
      <div class="curriculum-card" data-ci="${ci}">
        <div class="curriculum-header">
          <h2>${esc(c.name)}</h2>
          <div class="actions">
            <button class="btn btn-sm btn-danger" onclick="deleteCur(${ci})">Delete</button>
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
                  <button class="btn btn-sm btn-ghost collapsible-toggle" onclick="toggleQuestions(this,${ci},${vi})">Questions (${v.questions.length})</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteVideo(${ci},${vi})">x</button>
                </div>
              </div>
              <div class="video-item-meta">${esc(v.url)}</div>
              <div id="qs-${ci}-${vi}" style="display:none"></div>
            </li>
          `).join("")}
        </ul>
        <div class="add-form">
          <h3>Add Video</h3>
          <div class="form-row">
            <input id="vurl-${ci}" placeholder="YouTube URL">
            <input id="vtitle-${ci}" placeholder="Title">
            <button class="btn btn-sm" onclick="addVideo(${ci})">Add</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function deleteCur(ci) {
  if (!confirm("Delete this curriculum?")) return;
  curricula.splice(ci, 1);
  save(); render();
}

function deleteVideo(ci, vi) {
  curricula[ci].videos.splice(vi, 1);
  save(); render();
}

function addVideo(ci) {
  const url = document.getElementById(`vurl-${ci}`).value.trim();
  const title = document.getElementById(`vtitle-${ci}`).value.trim();
  if (!url || !title) return;
  const videoId = extractVideoId(url);
  if (!videoId) { alert("Invalid YouTube URL"); return; }
  curricula[ci].videos.push({
    id: uid(), title, url, videoId, completed: false, questions: [], questionsCompleted: 0
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
          <button class="btn btn-sm btn-danger" onclick="deleteQuestion(${ci},${vi},${qi})">x</button>
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
        <button class="btn btn-sm" onclick="addQuestion(${ci},${vi})">Add</button>
      </div>
    </div>`;
}

function deleteQuestion(ci, vi, qi) {
  curricula[ci].videos[vi].questions.splice(qi, 1);
  save(); renderQuestions(ci, vi);
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
