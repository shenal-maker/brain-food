// Load current settings
chrome.storage.local.get(["blockedSites", "timerDuration", "totalXP", "streak"], (data) => {
  document.getElementById("sites").value = (data.blockedSites || []).join("\n");
  document.getElementById("timer").value = data.timerDuration || 600;
  document.getElementById("xp-stat").textContent = `XP: ${data.totalXP || 0}`;
  document.getElementById("streak-stat").textContent = `Streak: ${data.streak || 0} days`;
});

// Save settings
document.getElementById("save").addEventListener("click", () => {
  const sites = document.getElementById("sites").value.split("\n").map(s => s.trim()).filter(Boolean);
  const timer = parseInt(document.getElementById("timer").value) || 600;
  chrome.storage.local.set({ blockedSites: sites, timerDuration: timer }, () => {
    document.getElementById("save").textContent = "Saved!";
    setTimeout(() => { document.getElementById("save").textContent = "Save"; }, 1000);
  });
});
