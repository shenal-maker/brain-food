// ============================================================
// background.js — The "brain" of Brain Food
// ============================================================
// This file runs in the background as a "service worker."
// Think of it like a receptionist: it doesn't show anything
// on screen, but it listens for events and coordinates everything.
//
// Key concept: EVENT-DRIVEN programming
// Instead of running in a loop, this code says:
//   "When X happens, do Y."
// For example:
//   "When the extension is first installed, set up default settings."
//   "When midnight hits, reset today's exercise."
// ============================================================

// --- EVENT 1: Extension installed for the first time ---
// chrome.runtime.onInstalled fires ONCE when the user installs the extension.
// We use it to set up default settings in chrome.storage.local,
// which is a simple key-value store (like a tiny database in your browser).

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    // Has the user completed today's exercise?
    completed: false,

    // Which date was it completed? (so we know when to reset)
    completedDate: null,

    // Sites to block — user can change these in settings
    blockedSites: ["twitter.com", "x.com", "reddit.com", "instagram.com", "tiktok.com"],

    // Timer duration in seconds (10 minutes)
    timerDuration: 600,

    // Which video index the user is on (cycles through 3Blue1Brown playlist)
    currentVideoIndex: 0,

    // XP tracking
    totalXP: 0,
    streak: 0,

    // Personal challenge categories with filler challenges
    // The user will customize these later
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
  });

  // Set up a daily alarm to reset the exercise at midnight
  // chrome.alarms is like a cron job — it fires at scheduled times.
  chrome.alarms.create("midnightReset", {
    // Calculate milliseconds until next midnight
    when: getNextMidnight(),
    // Then repeat every 24 hours
    periodInMinutes: 24 * 60
  });
});

// --- EVENT 2: Alarm fires (midnight reset) ---
// When the "midnightReset" alarm fires, mark exercise as incomplete
// so the user is blocked again tomorrow.

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "midnightReset") {
    chrome.storage.local.get(["completed", "streak"], (data) => {
      // If they didn't complete yesterday, reset streak
      const newStreak = data.completed ? data.streak : 0;
      chrome.storage.local.set({
        completed: false,
        completedDate: null,
        streak: newStreak
      });
    });
  }
});

// --- EVENT 3: Messages from content.js ---
// content.js (injected into web pages) asks the background:
//   "Is this site blocked?" or "Has today's exercise been completed?"
// This is how different parts of the extension communicate.
// Think of it like an API: content.js sends a request, background.js responds.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "checkStatus") {
    chrome.storage.local.get(["completed", "completedDate", "blockedSites"], (data) => {
      // Check if completion was today
      const today = new Date().toDateString();
      const isCompletedToday = data.completed && data.completedDate === today;

      sendResponse({
        completed: isCompletedToday,
        blockedSites: data.blockedSites || []
      });
    });
    // Return true = "I'll respond asynchronously" (needed for chrome.storage callback)
    return true;
  }

  if (message.type === "exerciseComplete") {
    const today = new Date().toDateString();
    chrome.storage.local.get(["totalXP", "streak"], (data) => {
      chrome.storage.local.set({
        completed: true,
        completedDate: today,
        totalXP: (data.totalXP || 0) + (message.xp || 10),
        streak: (data.streak || 0) + 1
      });
      sendResponse({ success: true });
    });
    return true;
  }
});

// --- HELPER: Calculate next midnight ---
function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight
  return midnight.getTime();
}
