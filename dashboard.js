chrome.storage.local.get(
  ["totalXP", "streak", "curricula", "browseTimeToday", "browseInterval"],
  (d) => {
    const xp = d.totalXP || 0;
    const streak = d.streak || 0;
    const curricula = d.curricula || [];
    const browseMin = Math.round((d.browseTimeToday || 0) / 60);
    const interval = d.browseInterval || 45;

    let html = `
      <div class="curriculum-card">
        <h2 style="color:#fff;margin-bottom:12px">Overview</h2>
        <div style="display:flex;gap:2rem;flex-wrap:wrap;margin-bottom:12px">
          <div><span style="font-size:2rem;color:#4f46e5;font-weight:700">${xp}</span><br><span style="color:#888;font-size:0.85rem">Total XP</span></div>
          <div><span style="font-size:2rem;color:#4ade80;font-weight:700">${streak}</span><br><span style="color:#888;font-size:0.85rem">Day Streak</span></div>
          <div><span style="font-size:2rem;color:#fbbf24;font-weight:700">${browseMin}/${interval}</span><br><span style="color:#888;font-size:0.85rem">Browse min today</span></div>
        </div>
      </div>`;

    curricula.forEach(c => {
      const totalV = c.videos.length;
      const doneV = c.videos.filter(v => v.completed).length;
      const totalQ = c.videos.reduce((s, v) => s + v.questions.length, 0);
      const doneQ = c.videos.reduce((s, v) => s + v.questionsCompleted, 0);
      const pct = totalV ? Math.round(doneV / totalV * 100) : 0;
      html += `
        <div class="curriculum-card">
          <h2 style="color:#fff;margin-bottom:8px">${esc(c.name)}</h2>
          <div class="progress-bar"><div class="fill" style="width:${pct}%"></div></div>
          <div class="progress-text">${doneV}/${totalV} videos completed, ${doneQ}/${totalQ} questions completed (${pct}%)</div>
        </div>`;
    });

    if (!curricula.length) html += '<div class="empty-state">No curricula yet. <a href="curriculum.html">Create one</a>.</div>';
    document.getElementById("dashboard").innerHTML = html;
  }
);

function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
