/*
 * 🛡️ Captains — Helen and the epic captains (Hercules, Heimdall, Beowulf, Skadi): stars and level,
 * read daily from Voltron's Growth page (the chesttracker's voltron-import/voltron-growth.js).
 * The same file on every clan site: keep the copies identical.
 *
 *   CCCCaptains.loadAll()            Members page: { lowerName: { Helen: { stars, level, date }, … } },
 *                                    or null when the clan has no captain data (the columns stay hidden)
 *   CCCCaptains.helenCell(caps)      table cell: "★4 · 45"
 *   CCCCaptains.epicCell(caps)       table cell: "3/4 · ★9" (epic captains owned, their stars together); hover for each
 *   CCCCaptains.carterStars(caps)    after the Carter level (C): " ★2", or '' without Carter's stars
 *   CCCCaptains.helenSort(caps) / epicSort(caps)   numbers to sort by
 *   CCCCaptains.renderMember(el, memberName, stillCurrent)
 *                                    Profiling page → member detail: a card per captain and the history.
 *                                    Hides el's section (data-captain-section) when the clan has no captain data.
 *
 * Reads getCaptainLevels / getMemberCaptainHistory (superiors only).
 */
(function () {
  const EPIC = ['Hercules', 'Heimdall', 'Beowulf', 'Skadi'];
  const ALL = ['Helen'].concat(EPIC);

  const css = document.createElement('style');
  css.textContent = `
    .cap-star { color: #f5b301; font-weight: 700; }
    .cap-none { color: var(--text-muted, #888); }
    .cap-cell { white-space: nowrap; font-size: 0.85em; }
    .cap-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin: 0 0 12px; }
    .cap-card { border: 1px solid var(--border, #444); border-radius: 8px; padding: 10px 12px; text-align: center; }
    .cap-card.cap-missing { opacity: 0.45; }
    .cap-card .cap-name { font-weight: 700; margin-bottom: 4px; }
    .cap-card .cap-value { font-size: 1.15em; }
    .cap-card .cap-date { font-size: 0.75em; color: var(--text-muted, #888); margin-top: 4px; }
    .cap-history summary { cursor: pointer; margin: 4px 0 8px; }
    .cap-history table { width: 100%; border-collapse: collapse; }
    .cap-history th, .cap-history td { padding: 4px 8px; text-align: left; border-bottom: 1px solid var(--border, #444); }
  `;
  document.head.appendChild(css);

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const has = (c) => !!c && (c.stars != null || c.level != null);
  const text = (c) => (c.stars != null ? '★' + c.stars : '') + (c.stars != null && c.level != null ? ' · ' : '') + (c.level != null ? 'Lv ' + c.level : '');
  const NONE = '<span class="cap-none">—</span>';

  async function call(action, extra) {
    const res = await fetch(window.GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action }, extra || {})),
    });
    return res.json();
  }

  async function loadAll() {
    try {
      const r = await call('getCaptainLevels');
      if (!r || r.success === false || !r.players || !Object.keys(r.players).length) return null;
      const out = {};
      for (const [name, caps] of Object.entries(r.players)) out[name.trim().toLowerCase()] = caps;
      return out;
    } catch (e) {
      console.warn('Captains not loaded:', e);
      return null;
    }
  }

  function helenCell(caps) {
    const h = caps && caps.Helen;
    if (!has(h)) return NONE;
    return `<span class="cap-cell" title="Helen: ${esc(text(h))}${h.date ? ' (' + esc(h.date) + ')' : ''}">`
      + (h.stars != null ? `<span class="cap-star">★${h.stars}</span>` : '')
      + (h.stars != null && h.level != null ? ' · ' : '') + (h.level != null ? h.level : '') + '</span>';
  }

  function epicSummary(caps) {
    const owned = EPIC.filter(n => has(caps && caps[n]));
    const stars = owned.reduce((t, n) => t + (caps[n].stars || 0), 0);
    const levels = owned.reduce((t, n) => t + (caps[n].level || 0), 0);
    return { owned, stars, levels };
  }

  function epicCell(caps) {
    const s = epicSummary(caps);
    if (!s.owned.length) return NONE;
    const tip = EPIC.map(n => n + ': ' + (has(caps[n]) ? text(caps[n]) : 'not owned')).join('\n');
    return `<span class="cap-cell" title="${esc(tip)}">${s.owned.length}/${EPIC.length} · <span class="cap-star">★${s.stars}</span></span>`;
  }

  function carterStars(caps) {
    const c = caps && caps.Carter;
    if (!c || c.stars == null) return '';
    return ` <span class="cap-star cap-cell" title="Carter: ${esc(text(c))}${c.date ? ' (' + esc(c.date) + ')' : ''}">★${c.stars}</span>`;
  }

  const helenSort = (caps) => { const h = caps && caps.Helen; return has(h) ? (h.stars || 0) * 10000 + (h.level || 0) : -1; };
  const epicSort = (caps) => { const s = epicSummary(caps); return s.owned.length ? s.owned.length * 1e8 + s.stars * 1e4 + s.levels : -1; };

  async function renderMember(el, memberName, stillCurrent) {
    if (!el) return;
    const section = el.closest('[data-captain-section]') || el;
    el.innerHTML = '<p class="cap-none">Loading captains...</p>';
    let r;
    try { r = await call('getMemberCaptainHistory', { memberName }); }
    catch (e) { r = { success: false, message: e.message }; }
    if (stillCurrent && !stillCurrent()) return;   // another member was chosen meanwhile
    if (r && r.success && !r.clanHasCaptains) { section.style.display = 'none'; return; }
    section.style.display = '';
    if (!r || !r.success) { el.innerHTML = '<p class="cap-none">' + esc((r && (r.message || r.error)) || 'Could not load the captains.') + '</p>'; return; }
    const cur = r.current || {};
    const names = ALL.concat(Object.keys(cur).filter(n => !ALL.includes(n)));
    let html = '<div class="cap-grid">' + names.map(n => {
      const c = cur[n];
      if (!has(c)) return `<div class="cap-card cap-missing"><div class="cap-name">${esc(n)}</div><div class="cap-value cap-none">not owned</div></div>`;
      return `<div class="cap-card"><div class="cap-name">${esc(n)}</div><div class="cap-value">`
        + (c.stars != null ? `<span class="cap-star">★${c.stars}</span>` : '') + (c.stars != null && c.level != null ? ' · ' : '')
        + (c.level != null ? 'Lv ' + c.level : '') + `</div>${c.date ? `<div class="cap-date">${esc(c.date)}</div>` : ''}</div>`;
    }).join('') + '</div>';
    const s = epicSummary(cur);
    html += `<p style="margin:0 0 8px;">Epic captains: <strong>${s.owned.length}/${EPIC.length}</strong>${s.owned.length ? ', <span class="cap-star">★' + s.stars + '</span> together' : ''}.</p>`;
    if (r.entries && r.entries.length) {
      html += `<details class="cap-history"><summary>History (${r.entries.length})</summary><table><thead><tr><th>Date</th><th>Captain</th><th>Stars</th><th>Level</th></tr></thead><tbody>`
        + r.entries.map(e => `<tr><td>${esc(e.date)}</td><td>${esc(e.captain)}</td><td>${e.stars != null ? '★' + e.stars : '—'}</td><td>${e.level != null ? e.level : '—'}</td></tr>`).join('')
        + '</tbody></table></details>';
    } else {
      html += '<p class="cap-none">No captains recorded for this member yet (read daily from Voltron\'s Growth page).</p>';
    }
    el.innerHTML = html;
  }

  window.CCCCaptains = { EPIC, loadAll, helenCell, epicCell, carterStars, helenSort, epicSort, renderMember };
})();
