// ============================================================
// background.js — The "brain" of Brain Food v2
// ============================================================

// --- Seed data: default Linear Algebra curriculum from videos.json + problems.json ---
function buildDefaultCurriculum() {
  const videos = [
    { index: 0, title: "Vectors, what even are they?", videoId: "fNk_zzcIR7s", topic: "Vectors" },
    { index: 1, title: "Linear combinations, span, and basis vectors", videoId: "k7RM-ot2NWY", topic: "Linear combinations" },
    { index: 2, title: "Linear transformations and matrices", videoId: "kYB8IZa5AuE", topic: "Linear transformations" },
    { index: 3, title: "Matrix multiplication as composition", videoId: "XkY2DOUCWMU", topic: "Matrix multiplication" },
    { index: 4, title: "Three-dimensional linear transformations", videoId: "rHLEWRxRGiM", topic: "3D transformations" },
    { index: 5, title: "The determinant", videoId: "Ip3X9LOh2dk", topic: "Determinants" },
    { index: 6, title: "Inverse matrices, column space and null space", videoId: "uQhTuRlWMxw", topic: "Inverse matrices" },
    { index: 7, title: "Nonsquare matrices as transformations", videoId: "v8VSDg_WQlA", topic: "Nonsquare matrices" },
    { index: 8, title: "Dot products and duality", videoId: "LyGKycYT2v0", topic: "Dot products" },
    { index: 9, title: "Cross products", videoId: "eu6i7WJeinw", topic: "Cross products" },
    { index: 10, title: "Cross products in the light of linear transformations", videoId: "BaM7OCEm3G0", topic: "Cross products extended" },
    { index: 11, title: "Cramer's rule, explained geometrically", videoId: "jBsC34PxzoM", topic: "Cramer's rule" },
    { index: 12, title: "Change of basis", videoId: "P2LTAUO1TdA", topic: "Change of basis" },
    { index: 13, title: "Eigenvectors and eigenvalues", videoId: "PFDu9oVAE1g", topic: "Eigenvalues" },
    { index: 14, title: "A quick trick for computing eigenvalues", videoId: "e50Bj7jn9IQ", topic: "Eigenvalue computation" },
    { index: 15, title: "Abstract vector spaces", videoId: "TgKwz5Ikpc8", topic: "Abstract vector spaces" }
  ];

  const problems = [
    { video: 0, q: "What is [2,3] + [1,-1]?", opts: ["[3,2]","[2,2]","[1,4]"], a: 0, exp: "Add component-wise: [2+1, 3-1] = [3,2]" },
    { video: 0, q: "What is 3 × [2,1]?", opts: ["[6,3]","[5,4]","[6,1]"], a: 0, exp: "Multiply each component: [3×2, 3×1] = [6,3]" },
    { video: 0, q: "A vector [4,0] points in which direction?", opts: ["Along x-axis","Along y-axis","Diagonal"], a: 0, exp: "y=0 means purely horizontal" },
    { video: 1, q: "What is 2[1,0] + 3[0,1]?", opts: ["[2,3]","[3,2]","[5,0]"], a: 0, exp: "2[1,0]=[2,0], 3[0,1]=[0,3], sum=[2,3]" },
    { video: 1, q: "Can [1,0] and [2,0] span all of R²?", opts: ["No","Yes","Only if scaled"], a: 0, exp: "They point in the same direction — only span a line" },
    { video: 1, q: "Two vectors are linearly independent if:", opts: ["Neither is a scalar multiple of the other","They are perpendicular","They have equal length"], a: 0, exp: "Independence means you can't make one from the other by scaling" },
    { video: 2, q: "A linear transformation must preserve:", opts: ["Lines and origin","Angles","Distances"], a: 0, exp: "Lines stay lines, origin stays fixed" },
    { video: 2, q: "A 2×2 matrix represents a transformation of:", opts: ["2D space","3D space","1D space"], a: 0, exp: "2 columns = 2D input, 2 rows = 2D output" },
    { video: 3, q: "If A then B, the combined matrix is:", opts: ["BA","AB","A+B"], a: 0, exp: "Right-to-left: apply A first, then B, so BA" },
    { video: 3, q: "Is matrix multiplication commutative (AB = BA)?", opts: ["No, generally not","Yes, always","Only for square matrices"], a: 0, exp: "Order matters — AB ≠ BA in general" },
    { video: 5, q: "A determinant of 0 means:", opts: ["Space is squished to lower dimension","No transformation","Space is doubled"], a: 0, exp: "det=0 means the transformation collapses a dimension" },
    { video: 5, q: "A negative determinant means:", opts: ["Orientation is flipped","Transformation is invalid","Space is shrunk"], a: 0, exp: "Negative det = orientation reversal (like flipping a page)" },
    { video: 6, q: "A⁻¹A equals:", opts: ["Identity matrix","Zero matrix","A²"], a: 0, exp: "Inverse undoes the transformation, returning to identity" },
    { video: 6, q: "When does A⁻¹ NOT exist?", opts: ["When det(A) = 0","When A is square","When A has negatives"], a: 0, exp: "Can't undo a transformation that squishes to lower dimension" },
    { video: 8, q: "[1,2] · [3,4] = ?", opts: ["11","7","14"], a: 0, exp: "1×3 + 2×4 = 3+8 = 11" },
    { video: 8, q: "If the dot product of two vectors is 0, they are:", opts: ["Perpendicular","Parallel","Equal"], a: 0, exp: "Zero dot product = 90° angle between vectors" },
    { video: 13, q: "An eigenvector is a vector that, after transformation:", opts: ["Stays on its own span (only scaled)","Doesn't change at all","Rotates 90°"], a: 0, exp: "Eigenvectors only get scaled, not knocked off their line" },
    { video: 13, q: "The eigenvalue represents:", opts: ["How much the eigenvector is scaled","The angle of rotation","The determinant"], a: 0, exp: "λ is the scaling factor for that eigenvector" }
  ];

  // Group problems by video index
  const problemsByVideo = {};
  problems.forEach(p => {
    if (!problemsByVideo[p.video]) problemsByVideo[p.video] = [];
    problemsByVideo[p.video].push(p);
  });

  return {
    id: "default-linear-algebra",
    name: "Linear Algebra (3Blue1Brown)",
    videos: videos.map(v => ({
      id: `seed-${v.index}`,
      title: v.title,
      url: `https://www.youtube.com/watch?v=${v.videoId}`,
      videoId: v.videoId,
      completed: false,
      questions: (problemsByVideo[v.index] || []).map(p => ({
        q: p.q,
        opts: p.opts,
        a: p.a,
        exp: p.exp
      })),
      questionsCompleted: 0
    }))
  };
}

// --- EVENT 1: Extension installed ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["curricula"], (existing) => {
    // Only seed if no curricula exist (preserve data on update)
    const defaults = {
      completed: false,
      completedDate: null,
      blockedSites: ["twitter.com", "x.com", "reddit.com", "instagram.com", "tiktok.com"],
      timerDuration: 600,
      totalXP: 0,
      streak: 0,

      // Interval timer settings
      browseInterval: 45,        // minutes of browsing before nudge
      nudgeDuration: 5,          // minutes before nudge becomes full block
      browseTimeToday: 0,        // accumulated browsing seconds today
      lastExerciseTime: null,    // timestamp of last completed exercise

      challengeCategories: {
        "Court rejection": [
          "Send a cold email to someone you admire",
          "Ask for a discount at a store",
          "Pitch an idea to a stranger"
        ],
        "Seek real feedback": [
          "Ask someone to critique your latest work",
          "Post something vulnerable on social media",
          "Ask a mentor what your biggest weakness is"
        ],
        "Increase your surface area for luck": [
          "Attend an event or meetup this week",
          "Send 3 outreach emails to people in AI safety",
          "Apply to one fellowship or program"
        ],
        "Assume everything is learnable": [
          "Spend 20 minutes on a topic that intimidates you",
          "Watch a lecture on something outside your comfort zone",
          "Try to explain a hard concept in your own words"
        ],
        "Learn to love the moat of low status": [
          "Do a task that feels 'beneath' you with full effort",
          "Ask a basic question publicly without shame",
          "Celebrate a small win that nobody else would notice"
        ],
        "Don't work too hard": [
          "Take a 30-minute walk with no phone",
          "Stop working by 7pm today",
          "Do something fun that has zero productivity value"
        ]
      }
    };

    if (!existing.curricula) {
      defaults.curricula = [buildDefaultCurriculum()];
      defaults.currentVideoIndex = 0;
    }

    chrome.storage.local.set(defaults);
  });

  // Daily midnight reset
  chrome.alarms.create("midnightReset", {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60
  });

  // Browsing time tracker — fires every 60 seconds
  chrome.alarms.create("browseTimeTick", {
    delayInMinutes: 1,
    periodInMinutes: 1
  });
});

// --- EVENT 2: Alarms ---
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "midnightReset") {
    chrome.storage.local.get(["completed", "streak"], (data) => {
      const newStreak = data.completed ? data.streak : 0;
      chrome.storage.local.set({
        completed: false,
        completedDate: null,
        streak: newStreak,
        browseTimeToday: 0,
        nudgeShown: false,
        blockEscalated: false
      });
    });
  }

  if (alarm.name === "browseTimeTick") {
    trackBrowsingTime();
  }
});

// --- Browsing time tracking ---
let isUserActive = true;

chrome.idle.onStateChanged.addListener((state) => {
  isUserActive = (state === "active");
});

function trackBrowsingTime() {
  if (!isUserActive) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    const tab = tabs[0];
    if (!tab.url) return;

    // Only count time on non-extension pages
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) return;

    chrome.storage.local.get([
      "browseTimeToday", "browseInterval", "nudgeDuration",
      "lastExerciseTime", "nudgeShown", "blockEscalated", "completed"
    ], (data) => {
      if (data.completed) return; // Already done for today

      const browseTime = (data.browseTimeToday || 0) + 60; // +60 seconds per tick
      const browseInterval = (data.browseInterval || 45) * 60; // convert to seconds
      const nudgeDuration = (data.nudgeDuration || 5) * 60;

      const timeSinceExercise = data.lastExerciseTime
        ? (Date.now() - data.lastExerciseTime) / 1000
        : browseTime;

      const effectiveTime = Math.min(browseTime, timeSinceExercise);

      chrome.storage.local.set({ browseTimeToday: browseTime });

      // Check if we should nudge or block
      if (effectiveTime >= browseInterval + nudgeDuration && !data.blockEscalated) {
        // Escalate to full block
        chrome.storage.local.set({ blockEscalated: true });
        chrome.tabs.sendMessage(tab.id, { type: "showBlock" }).catch(() => {});
      } else if (effectiveTime >= browseInterval && !data.nudgeShown) {
        // Show gentle nudge
        chrome.storage.local.set({ nudgeShown: true });
        chrome.tabs.sendMessage(tab.id, { type: "showNudge", minutes: data.nudgeDuration || 5 }).catch(() => {});
      }
    });
  });
}

// --- EVENT 3: Messages ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "checkStatus") {
    chrome.storage.local.get([
      "completed", "completedDate", "blockedSites", "blockEscalated"
    ], (data) => {
      const today = new Date().toDateString();
      const isCompletedToday = data.completed && data.completedDate === today;

      sendResponse({
        completed: isCompletedToday,
        blockedSites: data.blockedSites || [],
        blockEscalated: data.blockEscalated || false
      });
    });
    return true;
  }

  if (message.type === "exerciseComplete") {
    const today = new Date().toDateString();
    chrome.storage.local.get(["totalXP", "streak"], (data) => {
      chrome.storage.local.set({
        completed: true,
        completedDate: today,
        totalXP: (data.totalXP || 0) + (message.xp || 10),
        streak: (data.streak || 0) + 1,
        lastExerciseTime: Date.now(),
        nudgeShown: false,
        blockEscalated: false,
        browseTimeToday: 0
      });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "getCurricula") {
    chrome.storage.local.get(["curricula"], (data) => {
      sendResponse({ curricula: data.curricula || [] });
    });
    return true;
  }

  if (message.type === "saveCurricula") {
    chrome.storage.local.set({ curricula: message.curricula }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "getStats") {
    chrome.storage.local.get([
      "totalXP", "streak", "curricula", "browseTimeToday", "browseInterval"
    ], (data) => {
      sendResponse({
        totalXP: data.totalXP || 0,
        streak: data.streak || 0,
        curricula: data.curricula || [],
        browseTimeToday: data.browseTimeToday || 0,
        browseInterval: data.browseInterval || 45
      });
    });
    return true;
  }

  if (message.type === "markVideoComplete") {
    chrome.storage.local.get(["curricula"], (data) => {
      const curricula = data.curricula || [];
      for (const cur of curricula) {
        const video = cur.videos.find(v => v.id === message.videoId);
        if (video) {
          video.completed = true;
          video.questionsCompleted = video.questions.length;
          break;
        }
      }
      chrome.storage.local.set({ curricula }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

// --- HELPER ---
function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}
