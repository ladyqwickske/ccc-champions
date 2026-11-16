/**
 * 📦 Player Chests — Profiling page (superiors only).
 *
 * One player's chests over a chosen date range of at most 6 months, grouped
 * by chest type like the Dashboard (click a type for its levels, or for the
 * chest names of Store and other chests without a level), with points, totals
 * and a per-period breakdown.
 *
 * Data: the database Worker's getPlayerChestsForRange (superiors only there
 * too). The same file is used on every cCc site; colours come from the page's
 * own CSS variables where it has them.
 *
 * Use: <div id="tabChests"></div> and PlayerChests.mount(element). The player
 * list is taken from the page's #memberSelect (the Individual tab's list).
 */
(function () {
  var MAX_MONTHS = 6;
  var CHEST_ORDER = ['Epic Crypt', 'Rare Crypt', 'Common Crypt', 'Epic Squad'];
  var mounted = null;

  var CSS = ''
    + '.pcx { --pcx-accent: var(--primary, #ffb300); --pcx-accent-soft: var(--primary-soft, #ffb300);'
    + ' --pcx-accent-hover: var(--primary-hover, #ffa000); --pcx-text: var(--text, #e0e0e0);'
    + ' --pcx-muted: var(--text-muted, #9e9e9e); --pcx-border: var(--border, #444); --pcx-soft: var(--bg-card-soft, rgba(255,255,255,0.05));'
    + ' --pcx-strong: var(--gold, var(--primary-strong, #ffb300)); --pcx-danger: var(--danger, #ef5350);'
    + ' max-width: 720px; margin: 0 auto; color: var(--pcx-text); }'
    + '.pcx-intro { font-size: 0.85em; color: var(--pcx-muted); margin: 4px 0 12px; }'
    + '.pcx-form { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px 12px; align-items: end; }'
    + '.pcx-form label { display: flex; flex-direction: column; gap: 4px; font-size: 0.8em; color: var(--pcx-muted); min-width: 0; }'
    + '.pcx-form input { width: 100%; box-sizing: border-box; padding: 9px 10px; background: rgba(0,0,0,0.18); border: 1px solid var(--pcx-border);'
    + ' border-radius: 8px; color: var(--pcx-text); font-size: 0.95em; color-scheme: dark; margin: 0; }'
    + '.pcx-form input:focus { outline: none; border-color: var(--pcx-accent); }'
    + '.pcx-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 10px 0 4px; }'
    + '.pcx-row button { background: var(--pcx-soft); color: var(--pcx-text); border: 1px solid var(--pcx-border); border-radius: 8px;'
    + ' padding: 6px 12px; cursor: pointer; font-size: 0.82em; }'
    + '.pcx-row button:hover { border-color: var(--pcx-accent); color: var(--pcx-accent-soft); }'
    + '.pcx-row .pcx-show { margin-left: auto; background: var(--pcx-accent); color: #fff; border-color: var(--pcx-accent); font-weight: 600; padding: 8px 18px; font-size: 0.9em; }'
    + '.pcx-row .pcx-show:hover { background: var(--pcx-accent-hover); color: #fff; }'
    + '.pcx-row .pcx-show:disabled { opacity: 0.6; cursor: default; }'
    + '.pcx-note { font-size: 0.75em; color: var(--pcx-muted); margin: 4px 0 12px; }'
    + '.pcx-error { color: var(--pcx-danger); font-size: 0.9em; margin: 10px 0; }'
    + '.pcx-empty { text-align: center; color: var(--pcx-muted); padding: 24px; }'
    + '.pcx-head { font-size: 0.88em; color: var(--pcx-muted); margin-top: 10px; }'
    + '.pcx-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0 12px; }'
    + '.pcx-summary div { background: var(--pcx-soft); border: 1px solid var(--pcx-border); border-radius: 10px; padding: 8px; text-align: center; }'
    + '.pcx-summary b { display: block; font-size: 1.35em; color: var(--pcx-strong); }'
    + '.pcx-summary span { font-size: 0.75em; color: var(--pcx-muted); }'
    + '.pcx-table { width: 100%; border-collapse: collapse; font-size: 0.9em; }'
    + '.pcx-table th { text-align: left; color: var(--pcx-muted); font-weight: 600; font-size: 0.8em; padding: 6px 8px; border-bottom: 1px solid var(--pcx-border); }'
    + '.pcx-table td { padding: 7px 8px; border-bottom: 1px solid rgba(128,128,128,0.25); }'
    + '.pcx-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }'
    + '.pcx-type td:first-child { font-weight: 600; color: var(--pcx-accent-soft); }'
    + '.pcx-type.open-able { cursor: pointer; }'
    + '.pcx-type.open-able:hover td { background: var(--pcx-soft); }'
    + '.pcx-tog { display: inline-block; width: 14px; font-size: 0.75em; }'
    + '.pcx-sub { display: none; }'
    + '.pcx-sub.open { display: table-row; }'
    + '.pcx-sub td { color: var(--pcx-muted); font-size: 0.92em; }'
    + '.pcx-sub td:first-child { padding-left: 30px; }'
    + '.pcx-total td { font-weight: 700; border-top: 2px solid var(--pcx-border); border-bottom: none; }'
    + '.pcx-periods { margin-top: 14px; font-size: 0.85em; color: var(--pcx-muted); }'
    + '.pcx-periods summary { cursor: pointer; color: var(--pcx-accent-soft); }'
    + '.pcx-periods .pcx-table { margin-top: 6px; }'
    + '.pcx .spinner-sm { display: inline-block; width: 22px; height: 22px; border: 3px solid var(--pcx-border);'
    + ' border-top-color: var(--pcx-accent); border-radius: 50%; animation: pcx-spin 0.8s linear infinite; }'
    + '@keyframes pcx-spin { to { transform: rotate(360deg); } }'
    + '@media (max-width: 560px) { .pcx-form { grid-template-columns: 1fr 1fr; } .pcx-form .pcx-player { grid-column: 1 / -1; }'
    + ' .pcx-row .pcx-show { margin-left: 0; width: 100%; } .pcx-summary b { font-size: 1.1em; } }';

  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function today() { return iso(new Date()); }
  function addMonths(day, n) {
    var p = day.split('-').map(Number);
    var last = new Date(Date.UTC(p[0], p[1] - 1 + n + 1, 0)).getUTCDate();
    return iso(new Date(Date.UTC(p[0], p[1] - 1 + n, Math.min(p[2], last))));
  }
  function fmtDate(day) {
    if (!day) return '?';
    var d = new Date(day + 'T00:00:00Z');
    if (isNaN(d.getTime())) return day;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  function num(n) { return Number(n || 0).toLocaleString(); }
  function levelSort(a, b) {
    var na = Number(a), nb = Number(b);
    if (isFinite(na) && isFinite(nb)) return na - nb;
    if (isFinite(na)) return -1;
    if (isFinite(nb)) return 1;
    return a.localeCompare(b);
  }

  function addCss() {
    if (document.getElementById('pcx-style')) return;
    var st = document.createElement('style');
    st.id = 'pcx-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function memberNames() {
    var sel = document.getElementById('memberSelect');
    if (!sel) return [];
    var names = [];
    Array.prototype.forEach.call(sel.options, function (o) { if (o.value) names.push(o.value); });
    return names.sort(function (a, b) { return a.localeCompare(b); });
  }

  function mount(root) {
    if (!root) return;
    addCss();
    if (mounted !== root) {
      mounted = root;
      root.innerHTML = '<div class="pcx">'
        + '<p class="pcx-intro">Every chest a player opened in a chosen period, grouped by chest type. At most 6 months.</p>'
        + '<form class="pcx-form" autocomplete="off">'
        + '<label class="pcx-player">Player<input type="text" name="player" list="pcxPlayers" placeholder="Type or pick a player" required></label>'
        + '<label>From<input type="date" name="from" required></label>'
        + '<label>To<input type="date" name="to" required></label>'
        + '<datalist id="pcxPlayers"></datalist>'
        + '</form>'
        + '<div class="pcx-row">'
        + '<button type="button" data-months="1">Last month</button>'
        + '<button type="button" data-months="3">Last 3 months</button>'
        + '<button type="button" data-months="6">Last 6 months</button>'
        + '<button type="button" class="pcx-show">Show chests</button>'
        + '</div>'
        + '<div class="pcx-note">Chests count by the day they were opened, under the player\'s earlier names too.</div>'
        + '<div class="pcx-result"></div>'
        + '</div>';
      var form = root.querySelector('form');
      form.addEventListener('submit', function (e) { e.preventDefault(); load(root); });
      form.elements.from.addEventListener('change', function () { clampTo(root); });
      root.querySelector('.pcx-show').addEventListener('click', function () { load(root); });
      Array.prototype.forEach.call(root.querySelectorAll('[data-months]'), function (b) {
        b.addEventListener('click', function () { preset(root, Number(b.getAttribute('data-months'))); });
      });
      root.querySelector('.pcx-result').addEventListener('click', function (e) {
        var row = e.target.closest ? e.target.closest('.pcx-type.open-able') : null;
        if (!row) return;
        var open = row.classList.toggle('open');
        row.querySelector('.pcx-tog').textContent = open ? '▼' : '▶';
        Array.prototype.forEach.call(root.querySelectorAll('.pcx-sub[data-i="' + row.getAttribute('data-i') + '"]'), function (tr) {
          tr.classList.toggle('open', open);
        });
      });
      preset(root, 1);
    }
    // the member list fills in once the page's profiling data has loaded
    root.querySelector('#pcxPlayers').innerHTML = memberNames().map(function (n) {
      return '<option value="' + esc(n) + '"></option>';
    }).join('');
  }

  function preset(root, months) {
    var f = root.querySelector('form').elements;
    f.to.value = today();
    f.from.value = addMonths(today(), -months);
    clampTo(root);
  }

  // "To" stays within 6 months of "From" and not after today
  function clampTo(root) {
    var f = root.querySelector('form').elements;
    if (!f.from.value) return;
    var limit = addMonths(f.from.value, MAX_MONTHS);
    var max = limit < today() ? limit : today();
    f.to.min = f.from.value;
    f.to.max = max;
    if (f.to.value && f.to.value > limit) f.to.value = limit;
    if (f.to.value && f.to.value < f.from.value) f.to.value = f.from.value;
  }

  function load(root) {
    var f = root.querySelector('form').elements;
    var out = root.querySelector('.pcx-result');
    var player = f.player.value.trim(), from = f.from.value, to = f.to.value;
    if (!player || !from || !to) { out.innerHTML = '<div class="pcx-error">Choose a player, a start and an end date.</div>'; return; }
    if (from > to) { out.innerHTML = '<div class="pcx-error">The start date is after the end date.</div>'; return; }
    if (to > addMonths(from, MAX_MONTHS)) { out.innerHTML = '<div class="pcx-error">The period can be at most 6 months.</div>'; return; }

    var btn = root.querySelector('.pcx-show');
    btn.disabled = true;
    out.innerHTML = '<div class="pcx-empty"><span class="spinner-sm"></span></div>';
    fetch(window.GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getPlayerChestsForRange', player: player, startDate: from, endDate: to })
    })
      .then(function (res) { return res.json(); })
      .then(function (payload) {
        var data = payload && payload.ok === true ? payload.data : null;
        if (!data) throw new Error((payload && (payload.error || payload.message)) || 'Could not load the chests.');
        render(out, data);
      })
      .catch(function (err) { out.innerHTML = '<div class="pcx-error">' + esc(err.message || err) + '</div>'; })
      .then(function () { btn.disabled = false; });
  }

  function render(out, r) {
    var groups = r.chestsByTypeGrouped || {};
    var head = '<div class="pcx-head"><b>' + esc(r.player) + '</b>'
      + (r.names && r.names.length > 1 ? ' (also ' + r.names.slice(1).map(esc).join(', ') + ')' : '')
      + ' · ' + fmtDate(r.startDate) + ' → ' + fmtDate(r.endDate) + '</div>';
    if (!r.totalChests) { out.innerHTML = head + '<div class="pcx-empty">No chests in this period.</div>'; return; }

    var summary = '<div class="pcx-summary">'
      + '<div><b>' + num(r.totalChests) + '</b><span>Chests</span></div>'
      + '<div><b>' + num(r.totalPoints) + '</b><span>Points</span></div>'
      + '<div><b>' + (r.periods || []).length + '</b><span>Periods</span></div></div>';

    var rank = function (t) { var i = CHEST_ORDER.indexOf(t); return i >= 0 ? i : CHEST_ORDER.length; };
    var types = Object.keys(groups).sort(function (a, b) { return rank(a) - rank(b) || a.localeCompare(b); });
    var rows = '';
    types.forEach(function (type, i) {
      var g = groups[type];
      var levels = Object.keys(g.levels || {}).sort(levelSort);
      var names = Object.keys(g.names || {}).sort(function (a, b) { return (g.names[b] - g.names[a]) || a.localeCompare(b); });
      var openable = levels.length > 0 || names.length > 0;
      rows += '<tr class="pcx-type' + (openable ? ' open-able' : '') + '" data-i="' + i + '">'
        + '<td><span class="pcx-tog">' + (openable ? '▶' : '') + '</span> ' + esc(type) + '</td>'
        + '<td class="num">' + num(g.total) + '</td><td class="num">' + num(g.points) + '</td></tr>';
      levels.forEach(function (l) {
        rows += '<tr class="pcx-sub" data-i="' + i + '"><td>' + esc(/^\d+$/.test(l) ? 'Lvl ' + l : l) + '</td>'
          + '<td class="num">' + num(g.levels[l]) + '</td><td></td></tr>';
      });
      names.forEach(function (n) {
        rows += '<tr class="pcx-sub" data-i="' + i + '"><td>' + esc(n) + '</td><td class="num">' + num(g.names[n]) + '</td><td></td></tr>';
      });
    });
    rows += '<tr class="pcx-total"><td>Total</td><td class="num">' + num(r.totalChests) + '</td><td class="num">' + num(r.totalPoints) + '</td></tr>';
    var table = '<table class="pcx-table"><thead><tr><th>Chest type</th><th class="num">Chests</th><th class="num">Points</th></tr></thead><tbody>'
      + rows + '</tbody></table>';

    var periods = (r.periods || []).map(function (p) {
      var name = p.name && p.name !== 'manual' && p.name !== 'fallback' ? esc(p.name) + ' · ' : '';
      return '<tr><td>' + name + fmtDate(p.start) + ' → ' + fmtDate(p.end) + '</td>'
        + '<td class="num">' + num(p.chests) + '</td><td class="num">' + num(p.points) + '</td></tr>';
    }).join('');
    var perPeriod = periods ? '<details class="pcx-periods"><summary>Per period</summary><table class="pcx-table">'
      + '<thead><tr><th>Period</th><th class="num">Chests</th><th class="num">Points</th></tr></thead><tbody>' + periods + '</tbody></table></details>' : '';
    out.innerHTML = head + summary + table + perPeriod;
  }

  window.PlayerChests = { mount: mount };
})();
