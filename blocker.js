let timeLeft;
let timerInterval;
let currentProblems = [];
let currentVideo = null;
let currentVideoId = null;

async function init() {
  const data = await chrome.storage.local.get([
    "curricula", "timerDuration", "totalXP", "streak", "challengeCategories"
  ]);

  const totalXP = data.totalXP || 0;
  const streak = data.streak || 0;
  document.getElementById("xp-text").textContent = `${totalXP} XP`;
  document.getElementById("streak-text").textContent = `${streak} day streak`;
  document.getElementById("xp-fill").style.width = `${Math.min(totalXP % 100, 100)}%`;

  // Find next incomplete video from curricula
  const curricula = data.curricula || [];
  for (const cur of curricula) {
    for (const v of cur.videos) {
      if (!v.completed && v.questions.length > 0) {
        currentVideo = v;
        currentVideoId = v.id;
        break;
      }
    }
    if (currentVideo) break;
  }

  // Fallback: pick any video with questions
  if (!currentVideo) {
    for (const cur of curricula) {
      for (const v of cur.videos) {
        if (v.questions.length > 0) {
          currentVideo = v;
          currentVideoId = v.id;
          break;
        }
      }
      if (currentVideo) break;
    }
  }

  if (!currentVideo) {
    document.getElementById("video-title").textContent = "No videos available";
    document.getElementById("problems-container").innerHTML = "<p>Add videos and questions in the <a href='curriculum.html' style='color:#4f46e5'>Curriculum Manager</a>.</p>";
    return;
  }

  document.getElementById("video-title").textContent = currentVideo.title;
  let embedUrl = `https://www.youtube.com/embed/${currentVideo.videoId}?`;
  if (currentVideo.start) embedUrl += `start=${currentVideo.start}&`;
  if (currentVideo.end) embedUrl += `end=${currentVideo.end}&`;
  document.getElementById("video-frame").src = embedUrl;

  // Fallback link
  const link = document.getElementById("video-link");
  if (link) {
    link.href = currentVideo.url;
    link.style.display = "inline";
  }

  // Pick up to 2 questions
  const qs = shuffle(currentVideo.questions);
  currentProblems = qs.slice(0, Math.min(2, qs.length));
  renderProblems();
  renderChallenges(data.challengeCategories || {});

  timeLeft = data.timerDuration || 600;
  startTimer();

  // Load saved notes
  const saved = await chrome.storage.local.get(["videoNotes"]);
  const allNotes = saved.videoNotes || {};
  if (allNotes[currentVideoId]) {
    document.getElementById("notes").value = allNotes[currentVideoId].notes || "";
    document.getElementById("takeaway").value = allNotes[currentVideoId].takeaway || "";
  }

  // Auto-save notes on input
  const saveNotes = () => {
    chrome.storage.local.get(["videoNotes"], (d) => {
      const n = d.videoNotes || {};
      n[currentVideoId] = {
        notes: document.getElementById("notes").value,
        takeaway: document.getElementById("takeaway").value,
        title: currentVideo.title
      };
      chrome.storage.local.set({ videoNotes: n });
    });
  };
  document.getElementById("notes").addEventListener("input", saveNotes);
  document.getElementById("takeaway").addEventListener("input", saveNotes);

  document.addEventListener("change", checkReady);
  document.getElementById("takeaway").addEventListener("input", checkReady);
  document.getElementById("submit-btn").addEventListener("click", submit);
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      document.getElementById("result").className = "result fail";
      document.getElementById("result").textContent = "Time's up! Refresh to try again.";
      document.getElementById("submit-btn").disabled = true;
      playBeep(300, 0.3); setTimeout(() => playBeep(300, 0.3), 400);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const min = Math.floor(timeLeft / 60);
  const sec = timeLeft % 60;
  const el = document.getElementById("timer");
  el.textContent = `${min}:${sec.toString().padStart(2, "0")}`;
  el.className = timeLeft <= 60 ? "timer warning" : "timer";
}

function renderProblems() {
  const container = document.getElementById("problems-container");
  container.innerHTML = currentProblems.map((p, i) => `
    <div class="problem">
      <p><strong>Q${i + 1}:</strong> ${p.q}</p>
      <div class="options">
        ${p.opts.map((opt, j) => `
          <label><input type="radio" name="problem${i}" value="${j}"> ${opt}</label>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function renderChallenges(categories) {
  const container = document.getElementById("challenge-container");
  const catNames = Object.keys(categories);
  if (!catNames.length) { container.innerHTML = "<p>No challenges configured.</p>"; return; }
  const catName = catNames[Math.floor(Math.random() * catNames.length)];
  const challenge = categories[catName][Math.floor(Math.random() * categories[catName].length)];
  container.innerHTML = `
    <div class="challenge-category">
      <h3>${catName}</h3>
      <label class="challenge-item">
        <input type="checkbox" id="challenge-check"> ${challenge}
      </label>
    </div>`;
}

function checkReady() {
  const allAnswered = currentProblems.every((_, i) =>
    document.querySelector(`input[name="problem${i}"]:checked`)
  );
  const challengeChecked = document.getElementById("challenge-check")?.checked;
  const hasTakeaway = document.getElementById("takeaway").value.trim().length > 5;
  document.getElementById("submit-btn").disabled = !(allAnswered && challengeChecked && hasTakeaway);
}

function submit() {
  clearInterval(timerInterval);
  let correct = 0;
  currentProblems.forEach((p, i) => {
    const sel = document.querySelector(`input[name="problem${i}"]:checked`);
    if (sel && parseInt(sel.value) === p.a) correct++;
  });

  const resultEl = document.getElementById("result");

  if (correct === currentProblems.length) {
    const bonus = timeLeft > 0 ? 10 : 0;
    const xpEarned = 20 + bonus;
    resultEl.className = "result success";
    resultEl.textContent = `All correct! +${xpEarned} XP${bonus ? ' (+10 speed bonus!)' : ''}. Browsing unlocked!`;
    chrome.runtime.sendMessage({ type: "exerciseComplete", xp: xpEarned });
    if (currentVideoId) {
      chrome.runtime.sendMessage({ type: "markVideoComplete", videoId: currentVideoId });
    }
    if (timeLeft > 0) fireConfetti();
    playBeep(800, 0.15);
    setTimeout(() => window.close(), 3000);
  } else {
    resultEl.className = "result fail";
    resultEl.textContent = `${correct}/${currentProblems.length} correct. Try again!`;
    currentProblems.forEach((p, i) => {
      const sel = document.querySelector(`input[name="problem${i}"]:checked`);
      if (sel && parseInt(sel.value) !== p.a) {
        const problemEl = document.querySelectorAll(".problem")[i];
        if (!problemEl.querySelector(".explanation")) {
          const exp = document.createElement("p");
          exp.className = "explanation";
          exp.style.cssText = "color:#fbbf24; margin-top:8px; font-size:0.9rem;";
          exp.textContent = `Hint: ${p.exp}`;
          problemEl.appendChild(exp);
        }
      }
    });
    document.getElementById("submit-btn").disabled = true;
    setTimeout(() => { document.getElementById("submit-btn").disabled = false; }, 2000);
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function playBeep(freq, dur) {
  const ctx = new AudioContext();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.frequency.value = freq;
  g.gain.value = 0.3;
  o.start(); o.stop(ctx.currentTime + dur);
}

function fireConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ["#4f46e5","#4ade80","#fbbf24","#f87171","#a78bfa","#22d3ee"];
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * canvas.height * 0.5,
    w: 4 + Math.random() * 6,
    h: 6 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)],
    vy: 2 + Math.random() * 4,
    vx: (Math.random() - 0.5) * 4,
    rot: Math.random() * Math.PI * 2,
    rv: (Math.random() - 0.5) * 0.2
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.rv;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    if (++frame < 180) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

init();
