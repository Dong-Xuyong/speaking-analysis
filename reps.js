/* Daily rep: audio prompts listed in data/reps.json (newest first). Add a day by appending an entry. */
(function () {
  const root = document.getElementById('daily-rep');
  if (!root) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  fetch('data/reps.json?v=' + Date.now()).then(r => r.json()).then(async reps => {
    reps.sort((a, b) => b.date.localeCompare(a.date));
    const items = await Promise.all(reps.map(async rep => {
      let text = '';
      try { text = await (await fetch(rep.transcript)).text(); } catch (e) {}
      return `<article class="rep-item">
        <h3>${esc(rep.title)}</h3>
        <p class="rep-meta">Focus: ${esc(rep.focus)}${rep.note ? ' · ' + esc(rep.note) : ''}</p>
        <audio controls preload="metadata" src="${esc(rep.audio)}"></audio>
        <p><a href="${esc(rep.audio)}" download>Download MP3</a> · <a href="${esc(rep.transcript)}">Transcript (.txt)</a></p>
        <details open><summary>Transcript</summary><p class="rep-transcript">${esc(text)}</p></details>
      </article>`;
    }));
    root.querySelector('.rep-list').innerHTML = items.join('');
  }).catch(() => { root.querySelector('.rep-list').textContent = 'Could not load daily reps.'; });
})();
