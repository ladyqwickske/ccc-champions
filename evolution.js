/*
 * 📈 Evolution — Profiling page → Individual (cCc Champions, cCc Legends, cCc Masters Of Battle).
 * The same file on all three sites: keep the copies identical.
 *
 *   CCCEvolution.setup({ el, call, fmtDate, theme })
 *     el       the element to draw in
 *     call     async (params) => the Worker's getMemberEvolution answer ({ success, … })
 *     fmtDate  (yyyy-MM-dd) => text shown for a date
 *     theme    'dark' (Champions) or 'light' (Legends, Masters)
 *   CCCEvolution.load(memberName)   load + draw a member (after picking one)
 *
 * Shows, for the period picked (2 weeks … 12 months): a few totals, one chart with
 * every norm (% of the norm reached per event) and chest target (% per period) by
 * date with a trend line, warnings and time away from the clan, and an overview
 * of the norms per event type. No comparisons: just the member's evolution.
 */
(function () {
  const THEMES = {
    dark: {
      surface: '#232526', border: '#444', text: '#e0e0e0', muted: '#9a9a9a', faint: '#888', grid: '#34373a', axis: '#5a5d60',
      away: '#3a3d40', warn: '#ef5350', tipBg: '#1a1b1c', tipBorder: '#555', tipStrong: '#f0f0f0', label: '#c8c8c8', hl: '#e0e0e0',
      norm: '#3987e5', chest: '#d95926', trend: '#199e70', link: '#ffb300',
      good: '#8bc34a', mid: '#ff9800', bad: '#ef5350',
      types: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
    },
    light: {
      surface: '#ffffff', border: 'var(--border, #cfd8dc)', text: 'var(--text, #1d2b36)', muted: '#5f6b75', faint: '#6b7780', grid: '#e8ebee', axis: '#b8c0c7',
      away: '#eceff1', warn: '#c62828', tipBg: '#ffffff', tipBorder: '#c9d1d6', tipStrong: '#111', label: '#37474f', hl: '#37474f',
      norm: '#2a78d6', chest: '#eb6834', trend: '#1baf7a', link: 'var(--primary, #1565c0)',
      good: '#2e7d32', mid: '#e67e22', bad: '#c0392b',
      types: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
    },
  };
  const NS = 'http://www.w3.org/2000/svg', DAY = 86400000, YMAX = 150;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let opt = null, T = THEMES.dark, data = null, seq = 0, member = '', focusType = null;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (n) => (n == null ? '—' : Number(n).toLocaleString());
  const fd = (d) => (d ? (opt && opt.fmtDate ? opt.fmtDate(d) : d) : '');
  const range = (a, b) => (a && b && a !== b ? fd(a) + ' – ' + fd(b) : fd(a || b));
  const pctColor = (p) => (p >= 100 ? T.good : p >= 50 ? T.mid : T.bad);

  function css() {
    if (document.getElementById('evo-css')) return;
    const s = document.createElement('style');
    s.id = 'evo-css';
    s.textContent = `
      .evo-controls { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:8px 0 12px; }
      .evo-controls select { padding:6px 10px; border:1px solid ${T.border}; border-radius:6px; font-size:13px; background:${T.surface}; color:${T.text}; }
      .evo-hint { font-size:11px; color:${T.faint}; }
      .evo-tiles { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-bottom:12px; }
      .evo-tile { background:${T.surface}; border:1px solid ${T.border}; border-radius:8px; padding:10px 12px; }
      .evo-tile .t-label { font-size:11px; color:${T.muted}; margin-bottom:4px; }
      .evo-tile .t-value { font-size:18px; font-weight:700; color:${T.text}; }
      .evo-tile .t-sub { font-size:11px; color:${T.faint}; margin-top:2px; }
      .evo-box { position:relative; background:${T.surface}; border:1px solid ${T.border}; border-radius:8px; padding:8px 8px 4px; }
      .evo-box > svg { display:block; width:100%; height:auto; touch-action:pan-y; }
      .evo-box text { font-family:inherit; font-size:11px; fill:${T.muted}; font-variant-numeric:tabular-nums; }
      .evo-legend { display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color:${T.muted}; padding:6px 4px 2px; }
      .evo-legend span { display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
      .evo-legend .wrap { white-space:normal; }
      .evo-tip { position:absolute; pointer-events:none; background:${T.tipBg}; border:1px solid ${T.tipBorder}; border-radius:6px; padding:8px 10px; font-size:12px; color:${T.muted}; min-width:170px; max-width:260px; box-shadow:0 4px 14px rgba(0,0,0,0.25); display:none; z-index:5; }
      .evo-tip .tv { color:${T.tipStrong}; font-weight:700; font-size:14px; }
      .evo-tip .tn { color:${T.text}; margin-bottom:4px; }
      .evo-tip .tr { display:flex; align-items:center; gap:6px; margin-top:2px; }
      .evo-tip .key { display:inline-block; width:12px; height:2px; border-radius:1px; flex-shrink:0; }
      .evo-subhead { font-size:13px; font-weight:600; color:${T.text}; margin:16px 0 8px; }
      .evo-subhead span { font-weight:400; color:${T.faint}; font-size:12px; }
      .evo-note { font-size:11px; color:${T.faint}; margin:-4px 0 8px; }
      .evo-chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
      .evo-chip { display:inline-flex; align-items:center; gap:8px; flex-wrap:wrap; text-align:left; background:${T.surface}; border:1px solid ${T.border}; border-radius:8px; padding:6px 10px; cursor:pointer; font:inherit; color:${T.muted}; font-size:12px; transition:opacity .15s, border-color .15s; }
      .evo-chip:hover { border-color:${T.link}; }
      .evo-chip.dim { opacity:.45; }
      .evo-chip .c-name { color:${T.text}; font-weight:600; font-size:13px; }
      .evo details summary { cursor:pointer; font-size:12px; color:${T.link}; margin:10px 0 6px; }
      .evo .evo-table { overflow-x:auto; border:1px solid ${T.border}; border-radius:8px; }
      .evo table { width:100%; border-collapse:collapse; background:${T.surface}; }
      .evo th { padding:8px; font-size:11px; text-align:left; color:${T.muted}; border-bottom:1px solid ${T.border}; text-transform:uppercase; letter-spacing:.4px; }
      .evo td { padding:8px; font-size:13px; color:${T.text}; border-bottom:1px solid ${T.grid}; }
      .evo td.num, .evo th.num { text-align:right; white-space:nowrap; }
      .evo .pill { display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; }
      .evo-empty { text-align:center; padding:20px; color:${T.faint}; font-size:13px; }
    `;
    document.head.appendChild(s);
  }

  function setup(o) {
    opt = o; T = THEMES[o.theme] || THEMES.dark;
    css();
    o.el.classList.add('evo');
    o.el.innerHTML = '<div class="evo-controls"><select class="evo-days">'
      + '<option value="14">Last 2 weeks</option><option value="30" selected>Last month</option>'
      + '<option value="91">Last 3 months</option><option value="182">Last 6 months</option><option value="365">Last 12 months</option>'
      + '</select><span class="evo-hint">100% = norm / target reached. Filled = met, hollow = missed. Hover or tap a point for details.</span></div>'
      + '<div class="evo-body"></div>';
    o.el.querySelector('.evo-days').addEventListener('change', () => load(member));
    window.addEventListener('resize', () => { if (data && opt.el.querySelector('.evo-main')) { drawMain(); drawTypes(); } });
  }

  async function load(name) {
    if (!opt || !name) return;
    member = name;
    const body = opt.el.querySelector('.evo-body');
    const mine = ++seq;
    if (data && data.member === name) body.style.opacity = '0.5'; // keep the frame while reloading
    else body.innerHTML = '<div class="evo-empty">Loading evolution…</div>';
    try {
      const res = await opt.call({ playerName: name, days: Number(opt.el.querySelector('.evo-days').value) });
      if (mine !== seq) return; // another member was picked meanwhile
      body.style.opacity = '';
      if (!res || !res.success) { data = null; body.innerHTML = '<div class="evo-empty">' + esc((res && (res.message || res.error)) || 'Could not load the evolution.') + '</div>'; return; }
      data = res;
      render();
    } catch (e) {
      if (mine !== seq) return;
      body.style.opacity = '';
      body.innerHTML = '<div class="evo-empty">Error: ' + esc(e.message) + '</div>';
    }
  }

  function tile(label, value, sub, color) {
    return '<div class="evo-tile"><div class="t-label">' + label + '</div><div class="t-value"' + (color ? ' style="color:' + color + '"' : '') + '>' + value + '</div>'
      + (sub ? '<div class="t-sub">' + sub + '</div>' : '') + '</div>';
  }

  function render() {
    const e = data, body = opt.el.querySelector('.evo-body');
    const pts = e.events.concat(e.periods);
    const s = e.summary || {};
    if (!pts.length && !(e.warnings || []).length && !(e.away || []).length) {
      body.innerHTML = '<div class="evo-empty">No finished norms or chest targets for this member in this period.</div>';
      return;
    }
    const ratio = (x) => (x && x.count ? x.met + '/' + x.count : '—');
    const last = s.last;
    let html = '<div class="evo-tiles">'
      + tile('Met', ratio(s), 'norms + chest targets', s.count ? pctColor(Math.round(100 * s.met / s.count)) : '')
      + tile('Avg % reached', s.average != null ? s.average + '%' : '—', 'capped at 100% per result')
      + tile('Event norms met', ratio(s.norms), '')
      + tile('Chest targets met', ratio(s.chests), '')
      + tile('Latest', last ? last.percent + '%' : '—', last ? esc(last.name) + ' · ' + fd(last.date) : '', last ? pctColor(last.percent) : '')
      + '</div>';
    if ((e.away || []).length) {
      html += '<div class="evo-note">Shaded = not in the clan (' + e.away.map((a) => range(a.start, a.end) + ', ' + esc(a.why)).join('; ') + '): what was missed then doesn’t count.</div>';
    }
    html += '<div class="evo-box"><svg class="evo-main" role="img" aria-label="Percent of the norm or chest target reached per date"></svg>'
      + '<div class="evo-legend">'
      + '<span><svg width="12" height="12"><circle cx="6" cy="6" r="4.5" fill="' + T.norm + '"/></svg>Event norm</span>'
      + '<span><svg width="20" height="12"><line x1="1" y1="6" x2="19" y2="6" stroke="' + T.chest + '" stroke-width="2" opacity="0.55"/><rect x="5.5" y="1.5" width="9" height="9" rx="1.5" fill="' + T.chest + '"/></svg>Chest target (period)</span>'
      + '<span><svg width="20" height="12"><line x1="2" y1="6" x2="18" y2="6" stroke="' + T.trend + '" stroke-width="3" stroke-linecap="round"/></svg>Trend (avg of last 5)</span>'
      + ((e.warnings || []).length ? '<span><svg width="10" height="14"><line x1="5" y1="1" x2="5" y2="13" stroke="' + T.warn + '" stroke-width="1.5"/></svg>⚠️ Warning</span>' : '')
      + ((e.away || []).length ? '<span><svg width="14" height="12"><rect width="14" height="12" fill="' + T.away + '"/></svg>Not in the clan</span>' : '')
      + '</div><div class="evo-tip"></div></div>';
    html += typesHtml();

    // Table view (newest first), warnings included
    const rows = pts.map((x) => ({
      date: x.date,
      html: '<tr><td style="white-space:nowrap;">' + fd(x.date) + '</td><td>' + (x.kind === 'chest' ? '📦 ' : '🎯 ') + esc(x.name) + '</td>'
        + '<td class="num">' + (x.target === 'Title' ? esc(x.title || 'No title') : num(x.achieved)) + '</td>'
        + '<td class="num">' + (x.target === 'Title' ? 'Title' : num(x.target)) + '</td>'
        + '<td class="num"><span class="pill" style="color:' + (x.met ? T.good : T.bad) + ';background:' + (x.met ? T.good : T.bad) + '22">' + x.percent + '%</span></td></tr>',
    })).concat((e.warnings || []).map((w) => ({
      date: w.date + 'z',
      html: '<tr><td style="white-space:nowrap;">' + fd(w.date) + '</td><td colspan="4">⚠️ Warning' + (w.type ? ': ' + esc(w.type) : '') + (w.comment ? ' — ' + esc(w.comment) : '') + '</td></tr>',
    }))).sort((a, b) => b.date.localeCompare(a.date));
    html += '<details><summary>Show as table</summary><div class="evo-table"><table><thead><tr><th>Date</th><th>What</th><th class="num">Result</th><th class="num">Norm / target</th><th class="num">% reached</th></tr></thead><tbody>'
      + rows.map((r) => r.html).join('') + '</tbody></table></div></details>';
    body.innerHTML = html;
    body.querySelectorAll('.evo-chip').forEach((c) => c.addEventListener('click', () => toggleType(c.dataset.type)));
    drawMain();
    drawTypes();
  }

  // ── chart helpers ──
  function frame(svg, H, M) {
    const box = svg.parentNode;
    const W = Math.max(300, box.clientWidth - 16);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = '';
    const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); svg.appendChild(n); return n; };
    const t0 = Date.parse(data.from), t1 = Date.parse(data.to) + DAY / 2;
    const xt = (ms) => M.l + (ms - t0) / (t1 - t0) * (W - M.l - M.r);
    const x = (d) => xt(Date.parse(d));
    const y = (p) => M.t + (1 - Math.min(p, YMAX) / YMAX) * (H - M.t - M.b);
    (data.away || []).forEach((a) => {
      const xa = Math.max(M.l, x(a.start)), xb = Math.min(W - M.r, x(a.end) + 4);
      if (xb > xa) {
        el('rect', { x: xa, y: M.t, width: xb - xa, height: H - M.t - M.b, fill: T.away });
        if (xb - xa > 70) el('text', { x: (xa + xb) / 2, y: H - M.b - 8, 'text-anchor': 'middle' }).textContent = 'not in the clan';
      }
    });
    [0, 50, 100, 150].forEach((v) => {
      el('line', { x1: M.l, x2: W - M.r, y1: y(v), y2: y(v), stroke: v === 100 ? T.axis : T.grid, 'stroke-width': 1 });
      el('text', { x: M.l - 6, y: y(v) + 4, 'text-anchor': 'end' }).textContent = v + '%';
    });
    const span = (t1 - t0) / DAY, ticks = [];
    if (span <= 45) {
      const every = span <= 16 ? (W < 520 ? 3 : 2) : 7;
      for (let t = t1 - DAY / 2; t >= t0; t -= every * DAY) { const d = new Date(t); ticks.unshift({ t, label: d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] }); }
    } else {
      const d0 = new Date(t0); let m = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1), i = 0;
      const step = W < 520 && span > 200 ? 2 : 1;
      while (m <= t1) {
        const dm = new Date(m);
        if (i++ % step === 0) ticks.push({ t: m, label: MONTHS[dm.getUTCMonth()] + (dm.getUTCMonth() === 0 ? ' ' + dm.getUTCFullYear() : '') });
        m = Date.UTC(dm.getUTCFullYear(), dm.getUTCMonth() + 1, 1);
      }
    }
    ticks.forEach((tk) => {
      const xm = xt(tk.t);
      el('line', { x1: xm, x2: xm, y1: H - M.b, y2: H - M.b + 4, stroke: T.axis });
      el('text', { x: xm, y: H - 8, 'text-anchor': 'middle' }).textContent = tk.label;
    });
    el('line', { x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b, stroke: T.axis });
    const warnMarks = [];
    (data.warnings || []).forEach((w) => {
      const xw = x(w.date) + 2;
      el('line', { x1: xw, x2: xw, y1: M.t, y2: H - M.b, stroke: T.warn, 'stroke-width': 1.5 });
      el('text', { x: xw, y: M.t - 4, 'text-anchor': 'middle', style: 'font-size:12px' }).textContent = '⚠️';
      warnMarks.push({ w, cx: xw, cy: M.t + 2 });
    });
    return { W, el, x, y, warnMarks };
  }
  const awayBetween = (a, b) => (data.away || []).some((r) => r.start <= b && r.end >= a);
  function lines(f, list, val, attrs) {
    let seg = [];
    const flush = () => { if (seg.length > 1) f.el('polyline', Object.assign({ points: seg.join(' '), fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, attrs)); seg = []; };
    list.forEach((p, i) => { if (i && awayBetween(list[i - 1].date, p.date)) flush(); seg.push(f.x(p.date) + ',' + f.y(val(p))); });
    flush();
  }
  function hover(svg, f, marks, fill) {
    const box = svg.parentNode, tip = box.querySelector('.evo-tip');
    const hl = f.el('circle', { r: 8, fill: 'none', stroke: T.hl, 'stroke-width': 1.5, visibility: 'hidden' });
    const hide = () => { tip.style.display = 'none'; hl.setAttribute('visibility', 'hidden'); };
    const show = (ev) => {
      const r = svg.getBoundingClientRect(), k = f.W / r.width;
      const px = (ev.clientX - r.left) * k, py = (ev.clientY - r.top) * k;
      let best = null, bd = 24 * k;
      marks.forEach((mk) => {
        const dd = mk.w ? Math.abs(mk.cx - px) + (py < 48 ? 0 : 1000) : Math.hypot(mk.cx - px, mk.cy - py);
        if (dd < bd) { bd = dd; best = mk; }
      });
      if (!best) { hide(); return; }
      hl.setAttribute('cx', best.cx); hl.setAttribute('cy', best.cy); hl.setAttribute('visibility', 'visible');
      tip.textContent = '';
      const add = (cls, text, key) => {
        const d = document.createElement('div'); d.className = cls;
        if (key) { const s = document.createElement('span'); s.className = 'key'; s.style.background = key; d.appendChild(s); }
        d.appendChild(document.createTextNode(text)); tip.appendChild(d);
      };
      if (best.w) {
        add('tv', '⚠️ Warning' + (best.w.number !== '' && best.w.number != null ? ' #' + best.w.number : ''));
        if (best.w.type) add('tn', best.w.type);
        add('tr', fd(best.w.date));
        if (best.w.comment) add('tr', best.w.comment);
      } else fill(best, add);
      tip.style.display = 'block';
      const tw = tip.offsetWidth, th = tip.offsetHeight, bx = best.cx / k + 8, by = best.cy / k + 8;
      tip.style.left = (bx + 14 + tw > box.clientWidth ? Math.max(4, bx - tw - 14) : bx + 14) + 'px';
      tip.style.top = Math.max(4, Math.min(by - th / 2, box.clientHeight - th - 4)) + 'px';
    };
    svg.onpointermove = show; svg.onpointerdown = show; svg.onpointerleave = hide;
  }
  const resultLine = (p) => (p.target === 'Title' ? (p.title || 'No title') + ' (norm: a title)'
    : num(p.achieved) + ' of ' + num(p.target) + (p.met ? '' : ' · short by ' + num(Math.max(0, p.target - p.achieved))));

  // ── main chart: every norm and chest target ──
  function drawMain() {
    const svg = opt.el.querySelector('.evo-main');
    if (!svg) return;
    const H = svg.parentNode.clientWidth < 520 ? 240 : 300;
    const f = frame(svg, H, { l: 40, r: 12, t: 18, b: 26 });
    const periods = data.periods.slice().sort((a, b) => a.date.localeCompare(b.date));
    lines(f, periods, (p) => p.percent, { stroke: T.chest, 'stroke-width': 2, opacity: 0.55 });
    lines(f, data.trend, (p) => p.value, { stroke: T.trend, 'stroke-width': 3 });
    const marks = f.warnMarks.slice();
    periods.forEach((p) => {
      const cx = f.x(p.date), cy = f.y(p.percent);
      f.el('rect', { x: cx - 4.5, y: cy - 4.5, width: 9, height: 9, rx: 1.5, fill: p.met ? T.chest : T.surface, stroke: p.met ? T.surface : T.chest, 'stroke-width': 2 });
      marks.push({ p, cx, cy, color: T.chest });
    });
    data.events.forEach((p) => {
      const cx = f.x(p.date), cy = f.y(p.percent);
      f.el('circle', { cx, cy, r: 4.5, fill: p.met ? T.norm : T.surface, stroke: p.met ? T.surface : T.norm, 'stroke-width': 2 });
      marks.push({ p, cx, cy, color: T.norm });
    });
    marks.forEach((mk) => { if (mk.p && mk.p.percent > YMAX) f.el('text', { x: mk.cx, y: 12, 'text-anchor': 'middle' }).textContent = '▲'; });
    const trendAt = {}; data.trend.forEach((t) => { trendAt[t.date] = t.value; });
    hover(svg, f, marks, (best, add) => {
      const p = best.p;
      add('tv', p.percent + '% ' + (p.met ? '✓ met' : '✗ missed'));
      add('tn', (p.kind === 'chest' ? 'Chest target · ' : '') + p.name);
      add('tr', range(p.start, p.end));
      add('tr', resultLine(p), best.color);
      if (trendAt[p.date] != null) add('tr', 'Trend ' + trendAt[p.date] + '%', T.trend);
    });
  }

  // ── norms per event type: one line per type ──
  function typeGroups() {
    const groups = {};
    data.events.forEach((ev) => { (groups[ev.type || 'Other'] = groups[ev.type || 'Other'] || []).push(ev); });
    return Object.keys(groups).sort((a, b) => a.localeCompare(b)).map((type, i) => {
      const list = groups[type].slice().sort((a, b) => a.date.localeCompare(b.date));
      return {
        type, list, color: T.types[i] || T.faint,
        met: list.filter((x) => x.met).length,
        avg: Math.round(list.reduce((t, x) => t + Math.min(100, x.percent), 0) / list.length),
        last: list[list.length - 1],
      };
    });
  }
  function typesHtml() {
    const groups = typeGroups();
    if (!groups.length) return '';
    if (focusType && !groups.some((g) => g.type === focusType)) focusType = null;
    return '<div class="evo-subhead">🎯 Norms per event type <span>(% of the norm reached in each event · tap a type to show only that one)</span></div>'
      + '<div class="evo-chips">' + groups.map((g) => {
        const col = g.met === g.list.length ? T.good : g.met === 0 ? T.bad : T.mid;
        return '<button type="button" class="evo-chip' + (focusType && focusType !== g.type ? ' dim' : '') + '" data-type="' + esc(g.type) + '">'
          + '<svg width="20" height="12" aria-hidden="true"><line x1="1" y1="6" x2="19" y2="6" stroke="' + g.color + '" stroke-width="2"/><circle cx="10" cy="6" r="4" fill="' + g.color + '"/></svg>'
          + '<span class="c-name">' + esc(g.type) + '</span>'
          + '<span><b style="color:' + col + '">' + g.met + '/' + g.list.length + ' met</b> · avg ' + g.avg + '% · last ' + g.last.percent + '%</span></button>';
      }).join('') + '</div>'
      + '<div class="evo-box"><svg class="evo-types" role="img" aria-label="Percent of the norm reached per event, one line per event type"></svg>'
      + '<div class="evo-legend"><span><svg width="12" height="12"><circle cx="6" cy="6" r="4.5" fill="' + T.faint + '"/></svg>met</span>'
      + '<span><svg width="12" height="12"><circle cx="6" cy="6" r="4" fill="' + T.surface + '" stroke="' + T.faint + '" stroke-width="2"/></svg>missed</span>'
      + '<span class="wrap">100% = norm reached</span></div><div class="evo-tip"></div></div>';
  }
  function toggleType(type) {
    focusType = focusType === type ? null : type;
    opt.el.querySelectorAll('.evo-chip').forEach((c) => c.classList.toggle('dim', !!focusType && c.dataset.type !== focusType));
    drawTypes();
  }
  function drawTypes() {
    const svg = opt.el.querySelector('.evo-types');
    if (!svg) return;
    const groups = typeGroups();
    const wide = svg.parentNode.clientWidth >= 640;
    const H = wide ? 320 : 260;
    const f = frame(svg, H, { l: 40, r: wide ? 170 : 12, t: 18, b: 26 });
    const marks = f.warnMarks.slice();
    groups.slice().sort((a, b) => (a.type === focusType) - (b.type === focusType)).forEach((g) => {
      const faded = focusType && focusType !== g.type, op = faded ? 0.12 : 1;
      lines(f, g.list, (p) => p.percent, { stroke: g.color, 'stroke-width': 2, opacity: op * 0.85 });
      g.list.forEach((p) => {
        const cx = f.x(p.date), cy = f.y(p.percent);
        f.el('circle', { cx, cy, r: 4, fill: p.met ? g.color : T.surface, stroke: p.met ? T.surface : g.color, 'stroke-width': 2, opacity: op });
        if (p.percent > YMAX && !faded) f.el('text', { x: cx, y: 12, 'text-anchor': 'middle' }).textContent = '▲';
        if (!faded) marks.push({ p, g, cx, cy });
      });
    });
    if (wide) { // direct labels, spread out, with a leader line to each line's last point
      const labels = groups.filter((g) => !focusType || g.type === focusType).map((g) => {
        const last = g.list[g.list.length - 1];
        return { g, x0: f.x(last.date), y0: f.y(last.percent), y: f.y(last.percent), text: (g.type.length > 18 ? g.type.slice(0, 17) + '…' : g.type) + '  ' + last.percent + '%' };
      }).sort((a, b) => a.y - b.y);
      const GAP = 14, top = 24, bottom = H - 28;
      labels.forEach((l, i) => { if (i && l.y < labels[i - 1].y + GAP) l.y = labels[i - 1].y + GAP; });
      for (let i = labels.length - 1; i >= 0; i--) {
        const max = i === labels.length - 1 ? bottom : labels[i + 1].y - GAP;
        if (labels[i].y > max) labels[i].y = max;
        if (labels[i].y < top) labels[i].y = top;
      }
      const lx = f.W - 170 + 10;
      labels.forEach((l) => {
        f.el('polyline', { points: l.x0 + ',' + l.y0 + ' ' + (lx - 4) + ',' + l.y, fill: 'none', stroke: l.g.color, 'stroke-width': 1, opacity: 0.7 });
        f.el('text', { x: lx, y: l.y + 4, style: 'fill:' + T.label }).textContent = l.text;
      });
    }
    hover(svg, f, marks, (best, add) => {
      const p = best.p;
      add('tv', p.percent + '% of the norm ' + (p.met ? '✓ met' : '✗ missed'));
      add('tr', best.g.type, best.g.color);
      add('tn', p.name);
      add('tr', range(p.start, p.end));
      add('tr', resultLine(p));
    });
  }

  window.CCCEvolution = { setup, load };
})();
