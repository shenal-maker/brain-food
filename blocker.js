// ============================================================
// blocker.js — The exercise page logic
// ============================================================

let timeLeft;
let timerInterval;
let problems = [];
let currentProblems = [];
let currentVideo = null;

// --- INIT ---
async function init() {
  // Load data files
  const [videosRes, problemsRes] = await Promise.all([
    fetch(chrome.runtime.getURL("videos.json")),
    fetch(chrome.runtime.getURL("problems.json"))
  ]);
  const videos = await videosRes.json();
  problems = await problemsRes.json();

  // Get user state from storage
  const data = await chrome.storage.local.get([
    "currentVideoIndex", "timerDuration", "totalXP", "streak", "challengeCategories"
  ]);

  // Set up XP display
  const totalXP = data.totalXP || 0;
  const streak = data.streak || 0;
  document.getElementById("xp-text").textContent = `${totalXP} XP`;
  document.getElementById("streak-text").textContent = `${streak} day streak`;
  document.getElementById("xp-fill").style.width = `${Math.min((totalXP % 100), 100)}%`;

  // Pick today's video (cycle through playlist)
  const videoIndex = (data.currentVideoIndex || 0) % videos.length;
  currentVideo = videos[videoIndex];
  document.getElementById("video-title").textContent = currentVideo.title;
  document.getElementById("video-frame").src =
    `https://www.youtube.com/embed/${currentVideo.videoId}`;

  // Pick 2 random problems matching this video (or random if not enough)
  const matching = problems.filter(p => p.video === currentVideo.index);
  if (matching.length >= 2) {
    currentProblems = shuffle(matching).slice(0, 2);
  } else {
    currentProblems = shuffle(problems).slice(0, 2);
  }
  renderProblems();

  // Render personal challenges
  renderChallenges(data.challengeCategories || {});

  // Start timer
  timeLeft = data.timerDuration || 600;
  startTimer();

  // Enable submit when all problems answered and at least one challenge checked
  document.addEventListener("change", checkReady);
  document.getElementById("submit-btn").addEventListener("click", submit);
}

// --- TIMER ---
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

// --- RENDER PROBLEMS ---
function renderProblems() {
  const container = document.getElementById("problems-container");
  container.innerHTML = currentProblems.map((p, i) => `
    <div class="problem">
      <p><strong>Q${i + 1}:</strong> ${p.q}</p>
      <div class="options">
        ${p.opts.map((opt, j) => `
          <label>
            <input type="radio" name="problem${i}" value="${j}">
            ${opt}
          </label>
        `).join("")}
      </div>
    </div>
  `).join("");
}

// --- RENDER PERSONAL CHALLENGES ---
function renderChallenges(categories) {
  const container = document.getElementById("challenge-container");
  // Pick one random category and one challenge from it
  const catNames = Object.keys(categories);
  if (catNames.length === 0) {
    container.innerHTML = "<p>No challenges configured.</p>";
    return;
  }
  const catName = catNames[Math.floor(Math.random() * catNames.length)];
  const challenges = categories[catName];
  const challenge = challenges[Math.floor(Math.random() * challenges.length)];

  container.innerHTML = `
    <div class="challenge-category">
      <h3>${catName}</h3>
      <label class="challenge-item">
        <input type="checkbox" id="challenge-check">
        ${challenge}
      </label>
    </div>
  `;
}

// --- CHECK IF READY TO SUBMIT ---
function checkReady() {
  const allAnswered = currentProblems.every((_, i) =>
    document.querySelector(`input[name="problem${i}"]:checked`)
  );
  const challengeChecked = document.getElementById("challenge-check")?.checked;
  document.getElementById("submit-btn").disabled = !(allAnswered && challengeChecked);
}

// --- SUBMIT ---
function submit() {
  clearInterval(timerInterval);

  // Check math answers
  let correct = 0;
  currentProblems.forEach((p, i) => {
    const selected = document.querySelector(`input[name="problem${i}"]:checked`);
    if (selected && parseInt(selected.value) === p.a) correct++;
  });

  const resultEl = document.getElementById("result");

  if (correct === currentProblems.length) {
    // All correct — unlock!
    const xpEarned = 20;
    resultEl.className = "result success";
    resultEl.textContent = `All correct! +${xpEarned} XP. Browsing unlocked!`;

    // Tell background.js we're done
    chrome.runtime.sendMessage({ type: "exerciseComplete", xp: xpEarned });

    // Advance to next video for tomorrow
    chrome.storage.local.get("currentVideoIndex", (data) => {
      chrome.storage.local.set({
        currentVideoIndex: ((data.currentVideoIndex || 0) + 1)
      });
    });

    // Auto-close after 2 seconds
    setTimeout(() => window.close(), 2000);
  } else {
    resultEl.className = "result fail";
    resultEl.textContent = `${correct}/${currentProblems.length} correct. Try again!`;
    // Show explanations
    currentProblems.forEach((p, i) => {
      const selected = document.querySelector(`input[name="problem${i}"]:checked`);
      if (selected && parseInt(selected.value) !== p.a) {
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

// --- UTILS ---
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

init();
