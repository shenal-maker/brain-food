let courses = [];
let quizCache = {};
let state = { xp: 0, streak: 0, best: {}, notes: {} };
const TIME_PER_Q = 20;
const VIDEO_TIMER = 600; // 10 min

// Quiz state
let currentCourse, currentSet, currentQIdx, quizScore, quizStreak, quizCorrect, quizTotal, quizTimer, quizTimeLeft;
let videoTimer, videoTimeLeft;

async function boot() {
  courses = await fetch(chrome.runtime.getURL("courses.json")).then(r => r.json());
  const d = await chrome.storage.local.get(["totalXP", "streak", "quizBest", "videoNotes"]);
  state.xp = d.totalXP || 0;
  state.streak = d.streak || 0;
  state.best = d.quizBest || {};
  state.notes = d.videoNotes || {};
  renderSidebar();
  showHome();
}

function renderSidebar() {
  document.getElementById("stat-xp").textContent = state.xp;
  document.getElementById("stat-streak").textContent = state.streak;
  const el = document.getElementById("sidebar-courses");
  el.innerHTML = courses.map((c, i) => {
    if (c.comingSoon) return `<div class="sidebar-course" style="opacity:0.4;cursor:default"><h3>${c.title}</h3><div class="meta">Coming soon</div></div>`;
    const prog = getCourseProgress(c);
    return `<div class="sidebar-course" data-ci="${i}"><h3>${c.title}</h3><div class="meta">${prog.done}/${prog.total} sets mastered</div><div class="prog-bar"><div class="prog-fill" style="width:${prog.pct}%"></div></div></div>`;
  }).join("");
  el.querySelectorAll("[data-ci]").forEach(e => e.addEventListener("click", () => showCourse(parseInt(e.dataset.ci))));
}

function getCourseProgress(course) {
  const b = state.best[course.id] || {};
  const total = course.timestamps ? course.timestamps.length : 0;
  let done = 0;
  for (let i = 0; i < total; i++) { if (b[i] >= 8) done++; }
  return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
}

function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.style.display = "none");
  document.getElementById(id).style.display = "block";
}

// === HOME ===
function showHome() {
  showView("view-home");
  document.querySelectorAll(".sidebar-course").forEach(e => e.classList.remove("active"));
  const el = document.getElementById("view-home");
  el.innerHTML = `<h2 style="font-size:1.5rem;color:#fff;margin-bottom:0.25rem">Your Courses</h2>
    <p style="color:#888;margin-bottom:1rem">Pick a course to study</p>
    <div class="course-grid">${courses.map((c, i) => {
      if (c.comingSoon) return `<div class="course-card coming-soon"><h3>${c.title}</h3><div class="desc">${c.description}</div><div>${c.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div><div class="prog" style="color:#555">Coming soon</div></div>`;
      const p = getCourseProgress(c);
      return `<div class="course-card" data-ci="${i}"><h3>${c.title}</h3><div class="desc">${c.description}</div><div>${c.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div><div class="prog">${p.done}/${p.total} mastered (${p.pct}%)</div></div>`;
    }).join("")}</div>`;
  el.querySelectorAll("[data-ci]").forEach(e => e.addEventListener("click", () => showCourse(parseInt(e.dataset.ci))));
}

// === COURSE ===
async function showCourse(ci) {
  currentCourse = courses[ci];
  if (!quizCache[currentCourse.id] && currentCourse.quizFile) {
    quizCache[currentCourse.id] = await fetch(chrome.runtime.getURL(currentCourse.quizFile)).then(r => r.json());
  }
  showView("view-course");
  document.querySelectorAll(".sidebar-course").forEach(e => e.classList.toggle("active", e.dataset.ci == ci));
  const quiz = quizCache[currentCourse.id];
  const best = state.best[currentCourse.id] || {};
  const el = document.getElementById("view-course");
  el.innerHTML = `<div class="breadcrumb"><a onclick="showHome()">Courses</a> / ${currentCourse.title}</div>
    <h2 style="font-size:1.4rem;color:#fff;margin-bottom:0.25rem">${currentCourse.title}</h2>
    <p style="color:#888;margin-bottom:1.5rem">${currentCourse.description}</p>
    <div class="set-list">${quiz.sets.map((s, si) => {
      const b = best[si];
      const mastered = b >= 8;
      return `<div class="set-item" data-si="${si}">
        <div><h3>Set ${s.set_number}: ${s.title}</h3><div class="set-meta">${s.questions.length} questions</div></div>
        <div class="set-status">
          ${b !== undefined ? `<div class="set-score">${b}/10</div>` : ''}
          ${mastered ? '<div class="set-badge mastered">Mastered</div>' : b !== undefined ? '<div class="set-badge">Attempted</div>' : ''}
        </div></div>`;
    }).join("")}</div>`;
  el.querySelectorAll("[data-si]").forEach(e => e.addEventListener("click", () => showSetPreview(ci, parseInt(e.dataset.si))));
}

// === SET PREVIEW ===
function showSetPreview(ci, si) {
  const quiz = quizCache[currentCourse.id];
  currentSet = quiz.sets[si];
  showView("view-set");
  const el = document.getElementById("view-set");
  el.innerHTML = `<div class="breadcrumb"><a onclick="showHome()">Courses</a> / <a onclick="showCourse(${ci})">${currentCourse.title}</a> / Set ${currentSet.set_number}</div>
    <div class="preview-header">
      <h2>Set ${currentSet.set_number}: ${currentSet.title}</h2>
      <p>${currentSet.watch_before}</p>
      <div class="preview-topics">${currentSet.topics.map(t => `<span class="tag">${t}</span>`).join("")}</div>
    </div>
    <div class="preview-questions">
      <h3>Questions you'll need to answer:</h3>
      ${currentSet.questions.map((q, i) => `<div class="preview-q"><span>${i + 1}.</span> ${esc(q.q)}</div>`).join("")}
    </div>
    <button class="watch-btn" data-ci="${ci}" data-si="${si}">Watch Video (10 min) then Quiz</button>`;
  el.querySelector(".watch-btn").addEventListener("click", () => showVideo(ci, si));
}

// === VIDEO ===
function showVideo(ci, si) {
  showView("view-video");
  const ts = currentCourse.timestamps[si] || { start: 0, end: 600 };
  const noteKey = `${currentCourse.id}-set${si}`;
  const el = document.getElementById("view-video");
  el.innerHTML = `<div class="breadcrumb"><a onclick="showHome()">Courses</a> / <a onclick="showCourse(${ci})">${currentCourse.title}</a> / <a onclick="showSetPreview(${ci},${si})">Set ${currentSet.set_number}</a> / Video</div>
    <div class="video-container">
      <iframe src="https://www.youtube.com/embed/${currentCourse.videoId}?start=${ts.start}&end=${ts.end}&autoplay=1" allow="autoplay;encrypted-media" allowfullscreen></iframe>
    </div>
    <a class="video-link" href="${currentCourse.videoUrl}&t=${ts.start}" target="_blank">Open in YouTube</a>
    <div class="video-timer">
      <div class="time" id="vid-time">10:00</div>
      <p>Watch the video, then take the quiz</p>
    </div>
    <div class="notes-area">
      <h3>Notes</h3>
      <textarea id="vid-notes" placeholder="Jot down key concepts...">${esc(state.notes[noteKey] || "")}</textarea>
    </div>
    <button class="ready-btn" id="ready-btn">I'm Ready — Start Quiz</button>
    <button class="skip-btn" id="skip-btn">Skip to Quiz</button>`;

  // Save notes
  el.querySelector("#vid-notes").addEventListener("input", (e) => {
    state.notes[noteKey] = e.target.value;
    chrome.storage.local.set({ videoNotes: state.notes });
  });

  // Timer
  videoTimeLeft = VIDEO_TIMER;
  clearInterval(videoTimer);
  updateVideoTimer();
  videoTimer = setInterval(() => {
    videoTimeLeft--;
    updateVideoTimer();
    if (videoTimeLeft <= 0) {
      clearInterval(videoTimer);
      el.querySelector("#ready-btn").style.display = "block";
      playBeep(800, 0.15); setTimeout(() => playBeep(1000, 0.15), 150);
    }
  }, 1000);

  el.querySelector("#ready-btn").addEventListener("click", () => { clearInterval(videoTimer); startQuiz(ci, si); });
  el.querySelector("#skip-btn").addEventListener("click", () => { clearInterval(videoTimer); startQuiz(ci, si); });
}

function updateVideoTimer() {
  const m = Math.floor(videoTimeLeft / 60), s = videoTimeLeft % 60;
  const el = document.getElementById("vid-time");
  if (!el) return;
  el.textContent = `${m}:${s.toString().padStart(2, "0")}`;
  el.className = videoTimeLeft <= 60 ? "time warning" : "time";
}

// === QUIZ (Kahoot) ===
function startQuiz(ci, si) {
  showView("view-quiz");
  currentQIdx = 0; quizScore = 0; quizStreak = 0; quizCorrect = 0; quizTotal = currentSet.questions.length;
  showQuestion(ci, si);
}

function showQuestion(ci, si) {
  const q = currentSet.questions[currentQIdx];
  const el = document.getElementById("view-quiz");
  el.innerHTML = `<div class="breadcrumb"><a onclick="showHome()">Courses</a> / ${currentCourse.title} / Set ${currentSet.set_number} / Quiz</div>
    <div class="quiz-top">
      <span class="q-count">${currentQIdx + 1}/${quizTotal}</span>
      <span class="streak-badge" id="q-streak"></span>
      <span class="score" id="q-score">${quizScore}</span>
    </div>
    <div class="timer-bar"><div class="fill" id="q-timer-fill"></div></div>
    <div class="question-text">${esc(q.q)}</div>
    <div class="answers">${q.opts.map((o, i) => `<button class="answer-btn a${i}" data-i="${i}">${esc(o)}</button>`).join("")}</div>
    <div class="explanation" id="q-exp"></div>
    <button class="next-btn" id="q-next">Next</button>`;

  if (quizStreak >= 2) { const b = el.querySelector("#q-streak"); b.textContent = `${quizStreak} streak!`; b.className = "streak-badge show"; }

  el.querySelectorAll(".answer-btn").forEach(b => b.addEventListener("click", () => quizAnswer(parseInt(b.dataset.i), ci, si)));
  el.querySelector("#q-next").addEventListener("click", () => {
    currentQIdx++;
    if (currentQIdx < quizTotal) showQuestion(ci, si);
    else showResults(ci, si);
  });

  quizTimeLeft = TIME_PER_Q;
  clearInterval(quizTimer);
  quizTimer = setInterval(() => {
    quizTimeLeft -= 0.1;
    const fill = document.getElementById("q-timer-fill");
    if (fill) fill.style.width = `${Math.max(0, quizTimeLeft / TIME_PER_Q * 100)}%`;
    if (quizTimeLeft <= 0) { clearInterval(quizTimer); quizAnswer(-1, ci, si); }
  }, 100);
}

function quizAnswer(chosen, ci, si) {
  clearInterval(quizTimer);
  const q = currentSet.questions[currentQIdx];
  document.querySelectorAll(".answer-btn").forEach(b => {
    const i = parseInt(b.dataset.i);
    b.classList.add("disabled");
    if (i === q.a) b.classList.add("correct"); else b.classList.add("wrong");
  });

  if (chosen === q.a) {
    quizStreak++; quizCorrect++;
    const pts = 1000 + Math.round(quizTimeLeft / TIME_PER_Q * 500) + Math.min(quizStreak, 5) * 100;
    quizScore += pts;
    showPoints(`+${pts}`, "#4ade80");
    playBeep(800, 0.1); setTimeout(() => playBeep(1000, 0.1), 100);
  } else {
    quizStreak = 0;
    showPoints(chosen >= 0 ? "Wrong" : "Time's up!", "#f87171");
    playBeep(300, 0.2);
  }

  document.getElementById("q-score").textContent = quizScore;
  const badge = document.getElementById("q-streak");
  if (quizStreak >= 2) { badge.textContent = `${quizStreak} streak!`; badge.className = "streak-badge show"; }
  else badge.className = "streak-badge";

  document.getElementById("q-exp").textContent = q.exp;
  document.getElementById("q-exp").className = "explanation show";
  document.getElementById("q-next").style.display = "block";
}

// === RESULTS ===
async function showResults(ci, si) {
  showView("view-results");
  const pct = Math.round(quizCorrect / quizTotal * 100);
  const el = document.getElementById("view-results");
  el.innerHTML = `<div class="results-card">
    <h2>${pct >= 80 ? "Amazing!" : pct >= 50 ? "Good effort!" : "Keep studying!"}</h2>
    <div class="final-score">${quizScore}</div>
    <div class="detail">${quizCorrect}/${quizTotal} correct (${pct}%)${pct >= 80 ? " — Set mastered!" : ""}</div>
    <button id="res-retry">Retry</button>
    <button id="res-course" class="secondary">Back to Course</button>
    <button id="res-home" class="secondary">All Courses</button>
  </div>`;

  el.querySelector("#res-retry").addEventListener("click", () => startQuiz(ci, si));
  el.querySelector("#res-course").addEventListener("click", () => showCourse(ci));
  el.querySelector("#res-home").addEventListener("click", () => showHome());

  if (pct >= 80) fireConfetti();

  // Save best
  if (!state.best[currentCourse.id]) state.best[currentCourse.id] = {};
  if (!state.best[currentCourse.id][si] || quizCorrect > state.best[currentCourse.id][si]) {
    state.best[currentCourse.id][si] = quizCorrect;
  }
  chrome.storage.local.set({ quizBest: state.best });

  // XP
  const xp = quizCorrect * 5;
  if (xp > 0) {
    state.xp += xp;
    chrome.runtime.sendMessage({ type: "exerciseComplete", xp });
    renderSidebar();
  }
}

// === UTILS ===
function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

function showPoints(text, color) {
  const el = document.getElementById("points-popup");
  el.textContent = text; el.style.color = color;
  el.className = "points-popup"; void el.offsetWidth; el.className = "points-popup show";
}

function playBeep(freq, dur) {
  const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination); o.frequency.value = freq; g.gain.value = 0.2;
  o.start(); o.stop(ctx.currentTime + dur);
}

function fireConfetti() {
  const c = document.getElementById("confetti"), ctx = c.getContext("2d");
  c.width = innerWidth; c.height = innerHeight;
  const cols = ["#e21b3c","#1368ce","#d89e00","#26890c","#fff","#ffd700"];
  const p = Array.from({length:150},()=>({x:Math.random()*c.width,y:-10-Math.random()*c.height*0.5,w:4+Math.random()*6,h:6+Math.random()*8,color:cols[Math.floor(Math.random()*cols.length)],vy:2+Math.random()*4,vx:(Math.random()-0.5)*4,rot:Math.random()*Math.PI*2,rv:(Math.random()-0.5)*0.2}));
  let f=0;(function draw(){ctx.clearRect(0,0,c.width,c.height);p.forEach(i=>{i.x+=i.vx;i.y+=i.vy;i.vy+=0.05;i.rot+=i.rv;ctx.save();ctx.translate(i.x,i.y);ctx.rotate(i.rot);ctx.fillStyle=i.color;ctx.fillRect(-i.w/2,-i.h/2,i.w,i.h);ctx.restore()});if(++f<180)requestAnimationFrame(draw);else ctx.clearRect(0,0,c.width,c.height)})();
}

boot();
