// ============================================================
// content.js — The "bouncer" of Brain Food
// ============================================================
// This file gets INJECTED into every webpage you visit.
// Chrome literally copies this code into the page's environment.
//
// Key concept: DOM MANIPULATION
// The DOM (Document Object Model) is the browser's representation
// of a webpage as a tree of elements. JavaScript can create, modify,
// or delete any element. That's how we overlay a blocker on top of
// Twitter — we just create a giant <div> that covers everything.
//
// Flow:
// 1. Page loads → this script runs
// 2. Ask background.js: "Is this site blocked? Is the exercise done?"
// 3. If blocked AND not completed → show full-screen overlay
// ============================================================

// --- Step 1: Check if this site should be blocked ---
// We send a message to background.js and wait for the response.
// This is asynchronous — the page keeps loading while we wait.

chrome.runtime.sendMessage({ type: "checkStatus" }, (response) => {
  // If the extension context is gone (e.g., during update), bail out
  if (!response) return;

  // Already completed today's exercise — let them browse freely
  if (response.completed) return;

  // Get the current site's hostname (e.g., "twitter.com" or "www.reddit.com")
  const hostname = window.location.hostname;

  // Check if this hostname matches any blocked site
  // .some() returns true if ANY item in the array passes the test
  // We check if the hostname includes the blocked domain because
  // "www.twitter.com" should still match "twitter.com"
  const isBlocked = response.blockedSites.some(site =>
    hostname.includes(site)
  );

  if (isBlocked) {
    showBlocker();
  }
});

// --- Step 2: Create the blocker overlay ---
// This is DOM manipulation in action. We create HTML elements
// with JavaScript and add them to the page.

function showBlocker() {
  // Create a full-screen container div
  const overlay = document.createElement("div");
  overlay.id = "brainfood-overlay";

  // Style it to cover EVERYTHING on the page
  // position:fixed = stays in place even if you scroll
  // z-index:2147483647 = maximum possible layer, so nothing can appear on top
  // inset:0 = shorthand for top:0 right:0 bottom:0 left:0 (fills entire screen)
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    background: #0f0f0f;
    color: #e0e0e0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    text-align: center;
    padding: 2rem;
  `;

  overlay.innerHTML = `
    <h1 style="font-size:2.5rem; margin-bottom:0.5rem; color:#fff;">
      Brain Food
    </h1>
    <p style="font-size:1.1rem; color:#888; margin-bottom:2rem; max-width:400px;">
      Complete your daily exercise to unlock browsing.
    </p>
    <button id="brainfood-start" style="
      background: #4f46e5;
      color: white;
      border: none;
      padding: 14px 36px;
      font-size: 1.1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    ">
      Start Exercise
    </button>
  `;

  // Add the overlay to the page
  // document.body.appendChild() = "add this element as the last child of <body>"
  // This is the fundamental DOM operation — creating an element and attaching it.
  document.body.appendChild(overlay);

  // Prevent scrolling the page behind the overlay
  document.body.style.overflow = "hidden";

  // --- Step 3: Handle the "Start Exercise" button ---
  // addEventListener is how you respond to user interactions.
  // "click" = when the user clicks this element, run this function.
  document.getElementById("brainfood-start").addEventListener("click", () => {
    // Open the exercise page in a new tab
    // chrome.runtime.getURL() converts a relative path (like "blocker.html")
    // into the full extension URL that Chrome understands
    window.location.href = chrome.runtime.getURL("blocker.html");
  });

  // --- Anti-bypass: Re-inject if someone tries to remove the overlay ---
  // MutationObserver watches for changes to the DOM.
  // If the overlay gets removed (e.g., via DevTools), we re-add it.
  // This isn't bulletproof (you CAN disable the extension), but it
  // prevents casual attempts to dismiss the blocker.
  const observer = new MutationObserver(() => {
    if (!document.getElementById("brainfood-overlay")) {
      document.body.appendChild(overlay);
    }
  });
  observer.observe(document.body, { childList: true });
}
