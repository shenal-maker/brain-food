chrome.runtime.sendMessage({ type: "checkStatus" }, (response) => {
  if (!response) return;
  if (response.completed) return;

  const hostname = window.location.hostname;
  const isBlocked = response.blockedSites.some(site => hostname.includes(site));

  if (isBlocked) showBlocker();
  if (response.blockEscalated) showBlocker();
});

// Listen for nudge/block messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "showNudge") showNudge(message.minutes);
  if (message.type === "showBlock") showBlocker();
});

function showNudge(minutes) {
  if (document.getElementById("brainfood-nudge")) return;
  const bar = document.createElement("div");
  bar.id = "brainfood-nudge";
  bar.style.cssText = `
    position:fixed; top:0; left:0; right:0; z-index:2147483646;
    background:#4f46e5; color:#fff; padding:12px 20px;
    font-family:-apple-system,sans-serif; font-size:14px;
    display:flex; justify-content:space-between; align-items:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
  `;
  bar.innerHTML = `
    <span>Time for Brain Food! Browsing will be blocked in ${minutes || 5} minutes.</span>
    <button id="brainfood-nudge-btn" style="
      background:#fff; color:#4f46e5; border:none; padding:8px 16px;
      border-radius:6px; cursor:pointer; font-weight:600; font-size:13px;
    ">Start Exercise</button>
  `;
  document.body.appendChild(bar);
  document.getElementById("brainfood-nudge-btn").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("blocker.html");
  });
}

function showBlocker() {
  if (document.getElementById("brainfood-overlay")) return;
  const nudge = document.getElementById("brainfood-nudge");
  if (nudge) nudge.remove();

  const overlay = document.createElement("div");
  overlay.id = "brainfood-overlay";
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:2147483647;
    background:#0f0f0f; color:#e0e0e0;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    text-align:center; padding:2rem;
  `;
  overlay.innerHTML = `
    <h1 style="font-size:2.5rem;margin-bottom:0.5rem;color:#fff;">Brain Food</h1>
    <p style="font-size:1.1rem;color:#888;margin-bottom:2rem;max-width:400px;">
      Complete your daily exercise to unlock browsing.
    </p>
    <button id="brainfood-start" style="
      background:#4f46e5;color:white;border:none;padding:14px 36px;
      font-size:1.1rem;border-radius:8px;cursor:pointer;
    ">Start Exercise</button>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  document.getElementById("brainfood-start").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("blocker.html");
  });

  const observer = new MutationObserver(() => {
    if (!document.getElementById("brainfood-overlay")) {
      document.body.appendChild(overlay);
    }
  });
  observer.observe(document.body, { childList: true });
}
