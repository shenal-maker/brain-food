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

  document.addEventListener("change", checkReady);
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
  document.getElementById("submit-btn").disabled = !(allAnswered && challengeChecked);
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
    const xpEarned = 20;
    resultEl.className = "result success";
    resultEl.textContent = `All correct! +${xpEarned} XP. Browsing unlocked!`;
    chrome.runtime.sendMessage({ type: "exerciseComplete", xp: xpEarned });
    if (currentVideoId) {
      chrome.runtime.sendMessage({ type: "markVideoComplete", videoId: currentVideoId });
    }
    setTimeout(() => window.close(), 2000);
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

init();
