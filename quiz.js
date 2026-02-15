let QUIZ_DATA = null;
const TIME_PER_Q = 20;

let sets, currentSet, currentQ, score, streak, correct, total, timer, timeLeft;

async function init() {
  if (!QUIZ_DATA) QUIZ_DATA = await fetch(chrome.runtime.getURL("llm_training_quiz.json")).then(r=>r.json()).catch(()=>null);
  if (!QUIZ_DATA) { document.body.innerHTML = "<h1 style='padding:3rem'>Quiz data not found</h1>"; return; }
  sets = QUIZ_DATA.sets;
  const best = (await chrome.storage.local.get(["quizBest"])).quizBest || {};
  const sel = document.getElementById("set-selector");
  sel.innerHTML = `<h1>${QUIZ_DATA.title}</h1><p>${QUIZ_DATA.description}</p><div class="set-grid">${
    sets.map((s,i) => `<div class="set-card" data-set="${i}">
      <h3>Set ${s.set_number}: ${s.title}</h3>
      <div class="meta">${s.questions.length} questions</div>
      ${best[i] !== undefined ? `<div class="best">Best: ${best[i]}/${s.questions.length}</div>` : ''}
    </div>`).join("")
  }</div>`;
  sel.querySelectorAll(".set-card").forEach(c => c.addEventListener("click", () => startSet(parseInt(c.dataset.set))));
}

function startSet(i) {
  currentSet = sets[i]; currentQ = 0; score = 0; streak = 0; correct = 0; total = currentSet.questions.length;
  document.getElementById("set-selector").style.display = "none";
  document.getElementById("results").style.display = "none";
  document.getElementById("quiz-area").style.display = "block";
  document.getElementById("set-name").textContent = `Set ${currentSet.set_number}: ${currentSet.title}`;
  document.getElementById("score-display").textContent = "0";
  showQuestion();
}

function showQuestion() {
  const q = currentSet.questions[currentQ];
  document.getElementById("q-counter").textContent = `${currentQ+1} of ${total}`;
  document.getElementById("question-text").textContent = q.q;
  document.getElementById("explanation").className = "explanation";
  document.getElementById("next-btn").style.display = "none";

  const ans = document.getElementById("answers");
  ans.innerHTML = q.opts.map((o,i) => `<button class="answer-btn a${i}" data-i="${i}">${o}</button>`).join("");
  ans.querySelectorAll(".answer-btn").forEach(b => b.addEventListener("click", () => answer(parseInt(b.dataset.i))));

  // Timer
  timeLeft = TIME_PER_Q;
  document.getElementById("timer-fill").style.width = "100%";
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft -= 0.1;
    document.getElementById("timer-fill").style.width = `${Math.max(0,timeLeft/TIME_PER_Q*100)}%`;
    if (timeLeft <= 0) { clearInterval(timer); answer(-1); }
  }, 100);
}

function answer(chosen) {
  clearInterval(timer);
  const q = currentSet.questions[currentQ];
  const btns = document.querySelectorAll(".answer-btn");
  btns.forEach(b => {
    const i = parseInt(b.dataset.i);
    b.classList.add("disabled");
    if (i === q.a) b.classList.add("correct");
    else b.classList.add("wrong");
  });

  const isCorrect = chosen === q.a;
  if (isCorrect) {
    streak++;
    correct++;
    const timeBonus = Math.round(timeLeft / TIME_PER_Q * 500);
    const streakBonus = Math.min(streak, 5) * 100;
    const pts = 1000 + timeBonus + streakBonus;
    score += pts;
    showPoints(`+${pts}`, "#4ade80");
    playBeep(800, 0.1); setTimeout(() => playBeep(1000, 0.1), 100);
  } else {
    streak = 0;
    if (chosen >= 0) showPoints("Wrong", "#f87171");
    else showPoints("Time's up!", "#fbbf24");
    playBeep(300, 0.2);
  }

  document.getElementById("score-display").textContent = score;
  const badge = document.getElementById("streak-badge");
  if (streak >= 2) { badge.textContent = `${streak} streak!`; badge.className = "streak-badge show"; }
  else { badge.className = "streak-badge"; }

  document.getElementById("explanation").textContent = q.exp;
  document.getElementById("explanation").className = "explanation show";
  document.getElementById("next-btn").style.display = "inline-block";
}

document.getElementById("next-btn").addEventListener("click", () => {
  currentQ++;
  if (currentQ < total) showQuestion();
  else endQuiz();
});

async function endQuiz() {
  document.getElementById("quiz-area").style.display = "none";
  const r = document.getElementById("results");
  const pct = Math.round(correct/total*100);
  r.style.display = "block";
  r.innerHTML = `<h1>${pct >= 80 ? "Amazing!" : pct >= 50 ? "Good effort!" : "Keep learning!"}</h1>
    <div class="final-score">${score}</div>
    <div class="detail">${correct}/${total} correct (${pct}%)</div>
    <button id="retry-btn">Retry Set</button>
    <button id="back-btn">All Sets</button>`;
  r.querySelector("#retry-btn").addEventListener("click", () => startSet(sets.indexOf(currentSet)));
  r.querySelector("#back-btn").addEventListener("click", () => { r.style.display="none"; document.getElementById("set-selector").style.display="block"; init(); });

  if (pct >= 80) fireConfetti();

  // Save best
  const d = await chrome.storage.local.get(["quizBest"]);
  const best = d.quizBest || {};
  const si = sets.indexOf(currentSet);
  if (!best[si] || correct > best[si]) { best[si] = correct; chrome.storage.local.set({ quizBest: best }); }

  // Award XP
  const xp = correct * 5;
  if (xp > 0) chrome.runtime.sendMessage({ type: "exerciseComplete", xp });
}

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
  const colors = ["#e21b3c","#1368ce","#d89e00","#26890c","#fff","#ffd700"];
  const p = Array.from({length:150},()=>({x:Math.random()*c.width,y:-10-Math.random()*c.height*0.5,w:4+Math.random()*6,h:6+Math.random()*8,color:colors[Math.floor(Math.random()*colors.length)],vy:2+Math.random()*4,vx:(Math.random()-0.5)*4,rot:Math.random()*Math.PI*2,rv:(Math.random()-0.5)*0.2}));
  let f=0;
  (function draw(){ctx.clearRect(0,0,c.width,c.height);p.forEach(i=>{i.x+=i.vx;i.y+=i.vy;i.vy+=0.05;i.rot+=i.rv;ctx.save();ctx.translate(i.x,i.y);ctx.rotate(i.rot);ctx.fillStyle=i.color;ctx.fillRect(-i.w/2,-i.h/2,i.w,i.h);ctx.restore()});if(++f<180)requestAnimationFrame(draw);else ctx.clearRect(0,0,c.width,c.height)})();
}

init();
