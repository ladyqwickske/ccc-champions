/**
 * 📦 Player Chests — Profiling page (superiors only).
 *
 * Two views over a chosen date range of at most 6 months:
 *   👥 All players — one row per member: join date, latest troop level, chests, points and one column per
 *      chest type (▶ opens the levels, or the chest names of Store and other
 *      chests without a level); sortable, with a name filter. Click a player
 *      to see their own breakdown.
 *   📉 Lowest — the members with the fewest chests of the chosen chest types
 *      (quick picks: crypt chests, store chests), optionally only those who
 *      joined on or before a date; worst first.
 *   👤 One player — one player's chests by chest type (click a type for its
 *      levels / chest names), with points, totals and a per-period breakdown.
 *
 * Both views have ⬇ Export CSV (made in the browser from the data on screen).
 *
 * Data: the database Worker's getAllPlayersChestsForRange and
 * getPlayerChestsForRange (superiors only there too). The same file is used on
 * every cCc site; colours come from the page's own CSS variables where it has them.
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
    + ' --pcx-bg: var(--bg-card, #1e1e1e);'
    // solid colour behind the fixed headings / names (a card colour can be see-through)
    + ' --pcx-bg-solid: linear-gradient(var(--pcx-bg), var(--pcx-bg)), var(--bg-page, var(--bg-dark, #1e1e1e));'
    + ' max-width: 760px; margin: 0 auto; color: var(--pcx-text); }'
    + '.pcx.pcx-wide { max-width: none; }'
    + '.pcx-modes { display: flex; gap: 6px; margin: 4px 0 10px; }'
    + '.pcx-modes button { background: var(--pcx-soft); color: var(--pcx-text); border: 1px solid var(--pcx-border); border-radius: 8px;'
    + ' padding: 7px 14px; cursor: pointer; font-size: 0.88em; }'
    + '.pcx-modes button.on { background: var(--pcx-accent); border-color: var(--pcx-accent); color: #fff; font-weight: 600; }'
    + '.pcx-intro { font-size: 0.85em; color: var(--pcx-muted); margin: 0 0 12px; }'
    + '.pcx-form { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px 12px; align-items: end; max-width: 760px; }'
    + '.pcx-all .pcx-form { grid-template-columns: 1fr 1fr; max-width: 420px; }'
    + '.pcx-all .pcx-player { display: none; }'
    + '.pcx-form label { display: flex; flex-direction: column; gap: 4px; font-size: 0.8em; color: var(--pcx-muted); min-width: 0; }'
    + '.pcx-form input, .pcx-filter { width: 100%; box-sizing: border-box; padding: 9px 10px; background: rgba(0,0,0,0.18); border: 1px solid var(--pcx-border);'
    + ' border-radius: 8px; color: var(--pcx-text); font-size: 0.95em; color-scheme: dark; margin: 0; }'
    + '.pcx-form input:focus, .pcx-filter:focus { outline: none; border-color: var(--pcx-accent); }'
    + '.pcx-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 10px 0 4px; max-width: 760px; }'
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
    + '.pcx-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0 12px; max-width: 760px; }'
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
    // overview table
    + '.pcx-tools { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 4px 0 8px; }'
    + '.pcx-tools .pcx-filter { max-width: 280px; }'
    + '.pcx-tools span { font-size: 0.78em; color: var(--pcx-muted); }'
    + '.pcx-csv { margin-left: auto; background: var(--pcx-soft); color: var(--pcx-text); border: 1px solid var(--pcx-border); border-radius: 8px;'
    + ' padding: 7px 12px; cursor: pointer; font-size: 0.82em; white-space: nowrap; }'
    + '.pcx-csv:hover { border-color: var(--pcx-accent); color: var(--pcx-accent-soft); }'
    + '.pcx-head .pcx-csv { float: right; margin-top: -4px; }'
    // the table scrolls inside its own box, both ways; headings and player names stay in view
    + '.pcx-scroll { overflow: auto; max-height: 70vh; border: 1px solid var(--pcx-border); border-radius: 10px; }'
    + '.pcx-grid { border-collapse: collapse; font-size: 0.86em; min-width: 100%; }'
    + '.pcx-grid th, .pcx-grid td { padding: 6px 9px; border-bottom: 1px solid rgba(128,128,128,0.25); white-space: nowrap; }'
    + '.pcx-grid th { position: sticky; top: 0; background: var(--pcx-bg-solid); color: var(--pcx-muted); font-weight: 600; font-size: 0.85em;'
    + ' text-align: right; cursor: pointer; user-select: none; border-bottom: 1px solid var(--pcx-border); }'
    + '.pcx-grid th.txt, .pcx-grid td.txt { text-align: left; }'
    + '.pcx-grid td { text-align: right; font-variant-numeric: tabular-nums; }'
    + '.pcx-grid th:hover { color: var(--pcx-accent-soft); }'
    + '.pcx-grid th .pcx-sort { font-size: 0.8em; margin-left: 3px; color: var(--pcx-accent-soft); }'
    + '.pcx-grid th.typ { color: var(--pcx-accent-soft); }'
    + '.pcx-grid th.typ .pcx-tog { cursor: pointer; padding: 0 2px; }'
    + '.pcx-grid th.lvl, .pcx-grid td.lvl { background: rgba(128,128,128,0.08); font-weight: 400; }'
    + '.pcx-grid td.zero { color: var(--pcx-muted); opacity: 0.45; }'
    + '.pcx-grid td.who { font-weight: 600; }'
    + '.pcx-grid td.who a { color: var(--pcx-accent-soft); text-decoration: none; cursor: pointer; }'
    + '.pcx-grid td.who a:hover { text-decoration: underline; }'
    + '.pcx-grid .stick { position: sticky; left: 0; background: var(--pcx-bg-solid); z-index: 1; }'
    + '.pcx-grid th { z-index: 2; }'
    + '.pcx-grid th.stick { z-index: 3; }'
    + '.pcx-grid tr:hover td { background: var(--pcx-soft); }'
    + '.pcx-grid tr.none td.who a { color: var(--pcx-muted); }'
    + '.pcx-grid td.joined { color: var(--pcx-muted); }'
    + '.pcx-grid td.joined.new { color: #64b5f6; font-weight: 600; }'
    + '.pcx-grid td.troop { font-weight: 700; text-align: center; }'
    + '.pcx-grid th.troop { text-align: center; }'
    + '.pcx-low-opts { background: var(--pcx-soft); border: 1px solid var(--pcx-border); border-radius: 10px; padding: 10px 12px; margin: 6px 0 10px; font-size: 0.86em; }'
    + '.pcx-low-opts .pcx-low-line { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; margin: 4px 0; }'
    + '.pcx-low-opts b { color: var(--pcx-accent-soft); font-weight: 600; margin-right: 4px; }'
    + '.pcx-low-opts label { display: inline-flex; gap: 5px; align-items: center; cursor: pointer; white-space: nowrap; }'
    + '.pcx-low-opts input[type=date], .pcx-low-opts select { padding: 4px 6px; background: rgba(0,0,0,0.18); border: 1px solid var(--pcx-border);'
    + ' border-radius: 6px; color: var(--pcx-text); color-scheme: dark; font-size: 0.95em; }'
    + '.pcx-low-opts button { background: transparent; color: var(--pcx-accent-soft); border: 1px solid var(--pcx-border); border-radius: 6px;'
    + ' padding: 3px 9px; cursor: pointer; font-size: 0.92em; }'
    + '.pcx-low-opts button.on { background: var(--pcx-accent); border-color: var(--pcx-accent); color: #fff; }'
    + '.pcx-grid td.sel, .pcx-grid th.sel { font-weight: 700; color: var(--pcx-strong); }'
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
  function typeSort(a, b) {
    var ia = CHEST_ORDER.indexOf(a), ib = CHEST_ORDER.indexOf(b);
    ia = ia >= 0 ? ia : CHEST_ORDER.length; ib = ib >= 0 ? ib : CHEST_ORDER.length;
    return ia - ib || a.localeCompare(b);
  }
  function levelLabel(l) { return /^\d+$/.test(l) ? 'Lvl ' + l : l; }
  // troop categories from high to low (as on the Dashboard)
  var TROOP_ORDER = ['T9', 'G9', 'T8', 'G8', 'T7', 'G7', 'G6', 'G5', 'G4'];
  function troopRank(p) { var c = p.troops && p.troops.category; var i = TROOP_ORDER.indexOf(c); return i >= 0 ? TROOP_ORDER.length - i : 0; }
  function troopTitle(t) {
    if (!t) return 'No troop levels recorded';
    return ['G', 'M', 'S'].map(function (k) { return k + ' ' + (t[k] === null || t[k] === undefined ? '–' : t[k]); }).join(' · ')
      + (t.date ? ' (latest entry ' + fmtDate(t.date) + ')' : '');
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
    Array.prototype.forEach.call(sel.options, function (o) { if (o.value && names.indexOf(o.value) < 0) names.push(o.value); });
    return names.sort(function (a, b) { return a.localeCompare(b); });
  }

  // ─── Set-up ───
  function mount(root) {
    if (!root) return;
    addCss();
    if (mounted !== root) {
      mounted = root;
      root.innerHTML = '<div class="pcx pcx-all">'
        + '<div class="pcx-modes">'
        + '<button type="button" data-mode="all" class="on">👥 All players</button>'
        + '<button type="button" data-mode="low">📉 Lowest</button>'
        + '<button type="button" data-mode="one">👤 One player</button>'
        + '</div>'
        + '<p class="pcx-intro"></p>'
        + '<form class="pcx-form" autocomplete="off">'
        + '<label class="pcx-player">Player<input type="text" name="player" list="pcxPlayers" placeholder="Type or pick a player"></label>'
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
      root._pcx = { mode: 'all', overview: null, sortKey: 'points', sortDir: -1, open: {}, filter: '',
        low: { types: null, pick: 'crypt', useJoin: true, joinedBy: '', joinedByFor: '', show: 20 } };
      var form = root.querySelector('form');
      form.addEventListener('submit', function (e) { e.preventDefault(); load(root); });
      form.elements.from.addEventListener('change', function () { clampTo(root); });
      // The suggestion list only shows names that match the text in the field, so the
      // field empties itself when clicked (the last name stays as a grey hint) and the
      // whole list shows again; leaving it empty brings the last name back.
      var playerInput = form.elements.player;
      var hint = playerInput.placeholder;
      playerInput.addEventListener('focus', function () {
        if (!playerInput.value) return;
        playerInput.setAttribute('data-prev', playerInput.value);
        playerInput.placeholder = playerInput.value;
        playerInput.value = '';
      });
      playerInput.addEventListener('blur', function () {
        var prev = playerInput.getAttribute('data-prev');
        if (!playerInput.value.trim() && prev) playerInput.value = prev;
        playerInput.removeAttribute('data-prev');
        playerInput.placeholder = hint;
      });
      root.querySelector('.pcx-show').addEventListener('click', function () { load(root); });
      Array.prototype.forEach.call(root.querySelectorAll('[data-months]'), function (b) {
        b.addEventListener('click', function () { preset(root, Number(b.getAttribute('data-months'))); });
      });
      Array.prototype.forEach.call(root.querySelectorAll('[data-mode]'), function (b) {
        b.addEventListener('click', function () { setMode(root, b.getAttribute('data-mode')); });
      });
      root.querySelector('.pcx-result').addEventListener('click', function (e) { onResultClick(root, e); });
      root.querySelector('.pcx-result').addEventListener('change', function (e) { onLowChange(root, e); });
      root.querySelector('.pcx-result').addEventListener('input', function (e) {
        if (!e.target.classList.contains('pcx-filter')) return;
        root._pcx.filter = e.target.value;
        drawGrid(root);
      });
      preset(root, 1);
      setMode(root, 'all');
    }
    // the member list fills in once the page's profiling data has loaded
    root.querySelector('#pcxPlayers').innerHTML = memberNames().map(function (n) {
      return '<option value="' + esc(n) + '"></option>';
    }).join('');
  }

  function setMode(root, mode) {
    var st = root._pcx;
    st.mode = mode;
    var box = root.querySelector('.pcx');
    box.classList.toggle('pcx-all', mode === 'all' || mode === 'low');
    Array.prototype.forEach.call(root.querySelectorAll('[data-mode]'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-mode') === mode);
    });
    root.querySelector('.pcx-intro').textContent = mode === 'all'
      ? 'Every member\'s chests in a chosen period, by chest type. At most 6 months. Click a column to sort, ▶ to open a chest type, a name for that player.'
      : mode === 'low'
        ? 'The members with the fewest chests of the chest types you choose, worst first. At most 6 months. Click a name for that player.'
        : 'Every chest a player opened in a chosen period, grouped by chest type. At most 6 months.';
    var out = root.querySelector('.pcx-result');
    if (mode === 'all' && st.overview) { box.classList.add('pcx-wide'); drawOverview(root); }
    else if (mode === 'low' && st.overview) { box.classList.add('pcx-wide'); drawLow(root); }
    else { box.classList.remove('pcx-wide'); out.innerHTML = ''; }
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

  // ─── Loading ───
  function load(root) {
    var st = root._pcx;
    var f = root.querySelector('form').elements;
    var out = root.querySelector('.pcx-result');
    var player = f.player.value.trim(), from = f.from.value, to = f.to.value;
    if (st.mode === 'one' && !player) { out.innerHTML = '<div class="pcx-error">Choose a player.</div>'; return; }
    if (!from || !to) { out.innerHTML = '<div class="pcx-error">Choose a start and an end date.</div>'; return; }
    if (from > to) { out.innerHTML = '<div class="pcx-error">The start date is after the end date.</div>'; return; }
    if (to > addMonths(from, MAX_MONTHS)) { out.innerHTML = '<div class="pcx-error">The period can be at most 6 months.</div>'; return; }

    var body = st.mode !== 'one'
      ? { action: 'getAllPlayersChestsForRange', startDate: from, endDate: to }
      : { action: 'getPlayerChestsForRange', player: player, startDate: from, endDate: to };
    var mode = st.mode;
    var btn = root.querySelector('.pcx-show');
    btn.disabled = true;
    root.querySelector('.pcx').classList.remove('pcx-wide');
    out.innerHTML = '<div class="pcx-empty"><span class="spinner-sm"></span></div>';
    fetch(window.GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (res) { return res.json(); })
      .then(function (payload) {
        var data = payload && payload.ok === true ? payload.data : null;
        if (!data) throw new Error((payload && (payload.error || payload.message)) || 'Could not load the chests.');
        if (st.mode !== mode) return;   // switched view while loading
        if (mode === 'all') { st.overview = data; root.querySelector('.pcx').classList.add('pcx-wide'); drawOverview(root); }
        else if (mode === 'low') { st.overview = data; root.querySelector('.pcx').classList.add('pcx-wide'); drawLow(root); }
        else { st.one = data; renderOne(out, data); }
      })
      .catch(function (err) { out.innerHTML = '<div class="pcx-error">' + esc(err.message || err) + '</div>'; })
      .then(function () { btn.disabled = false; });
  }

  function onResultClick(root, e) {
    var st = root._pcx;
    var t = e.target;
    var exp = t.closest ? t.closest('[data-export]') : null;
    if (exp) { exportCsv(root, exp.getAttribute('data-export')); return; }
    var pick = t.closest ? t.closest('[data-lowpick]') : null;
    if (pick) { st.low.pick = pick.getAttribute('data-lowpick'); st.low.types = null; drawLow(root); return; }
    var tog = t.closest ? t.closest('[data-toggle]') : null;
    if (tog) {   // ▶ on a chest type column
      e.stopPropagation();
      var type = tog.getAttribute('data-toggle');
      st.open[type] = !st.open[type];
      drawGrid(root);
      return;
    }
    var th = t.closest ? t.closest('th[data-sort]') : null;
    if (th) {
      var key = th.getAttribute('data-sort');
      if (st.sortKey === key) st.sortDir = -st.sortDir;
      else { st.sortKey = key; st.sortDir = key === 'name' ? 1 : -1; }
      drawGrid(root);
      return;
    }
    var who = t.closest ? t.closest('[data-player]') : null;
    if (who) {   // a player in the overview → their own breakdown, same dates
      e.preventDefault();
      root.querySelector('form').elements.player.value = who.getAttribute('data-player');
      setMode(root, 'one');
      load(root);
      return;
    }
    var row = t.closest ? t.closest('.pcx-type.open-able') : null;
    if (row) {   // one player: open a chest type
      var open = row.classList.toggle('open');
      row.querySelector('.pcx-tog').textContent = open ? '▼' : '▶';
      Array.prototype.forEach.call(root.querySelectorAll('.pcx-sub[data-i="' + row.getAttribute('data-i') + '"]'), function (tr) {
        tr.classList.toggle('open', open);
      });
    }
  }

  // ─── 👥 All players ───
  function overviewColumns(o) {
    // every chest type with its levels and chest names, over all players
    var types = {};
    (o.players || []).forEach(function (p) {
      Object.keys(p.chestsByTypeGrouped || {}).forEach(function (t) {
        var g = p.chestsByTypeGrouped[t];
        var ty = types[t] || (types[t] = { levels: {}, names: {} });
        Object.keys(g.levels || {}).forEach(function (l) { ty.levels[l] = 1; });
        Object.keys(g.names || {}).forEach(function (n) { ty.names[n] = 1; });
      });
    });
    return Object.keys(types).sort(typeSort).map(function (t) {
      return { type: t, levels: Object.keys(types[t].levels).sort(levelSort), names: Object.keys(types[t].names).sort(function (a, b) { return a.localeCompare(b); }) };
    });
  }

  function drawOverview(root) {
    var o = root._pcx.overview;
    var out = root.querySelector('.pcx-result');
    var active = (o.players || []).filter(function (p) { return p.totalChests > 0; }).length;
    out.innerHTML = '<div class="pcx-head">' + fmtDate(o.startDate) + ' → ' + fmtDate(o.endDate) + '</div>'
      + '<div class="pcx-summary">'
      + '<div><b>' + num(o.totalChests) + '</b><span>Chests</span></div>'
      + '<div><b>' + num(o.totalPoints) + '</b><span>Points</span></div>'
      + '<div><b>' + active + ' / ' + num(o.members) + '</b><span>Members with chests</span></div></div>'
      + '<div class="pcx-tools"><input type="text" class="pcx-filter" placeholder="🔍 Filter by player name…" value="' + esc(root._pcx.filter) + '">'
      + '<span class="pcx-count"></span><button type="button" class="pcx-csv" data-export="all" title="Download this table (current order and filter) as a CSV file">⬇ Export CSV</button></div>'
      + '<div class="pcx-scroll"><table class="pcx-grid"></table></div>';
    drawGrid(root);
  }

  /** The overview's columns and its rows in the current order and filter. */
  function gridRows(root) {
    var st = root._pcx, o = st.overview;
    var cols = overviewColumns(o);
    // value getters per sort key
    var get = {
      name: function (p) { return p.name.toLowerCase(); },
      joined: function (p) { return p.joinDate || ''; },
      troops: troopRank,
      chests: function (p) { return p.totalChests; },
      points: function (p) { return p.totalPoints; },
    };
    cols.forEach(function (c) {
      get['t:' + c.type] = function (p) { var g = (p.chestsByTypeGrouped || {})[c.type]; return g ? g.total : 0; };
      c.levels.forEach(function (l) { get['l:' + c.type + '\u0000' + l] = function (p) { var g = (p.chestsByTypeGrouped || {})[c.type]; return g && g.levels ? g.levels[l] || 0 : 0; }; });
      c.names.forEach(function (n) { get['n:' + c.type + '\u0000' + n] = function (p) { var g = (p.chestsByTypeGrouped || {})[c.type]; return g && g.names ? g.names[n] || 0 : 0; }; });
    });
    if (!get[st.sortKey]) { st.sortKey = 'points'; st.sortDir = -1; }
    var by = get[st.sortKey];
    var q = st.filter.trim().toLowerCase();
    var rows = (o.players || []).filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) >= 0; });
    rows.sort(function (a, b) {
      var va = by(a), vb = by(b);
      var c = va < vb ? -1 : va > vb ? 1 : 0;
      return c * st.sortDir || b.totalPoints - a.totalPoints || a.name.localeCompare(b.name);
    });
    return { cols: cols, rows: rows, q: q };
  }

  function drawGrid(root) {
    var st = root._pcx, o = st.overview;
    if (!o) return;
    var table = root.querySelector('.pcx-grid');
    if (!table) return;
    var g0 = gridRows(root), cols = g0.cols, rows = g0.rows, q = g0.q;
    var count = root.querySelector('.pcx-count');
    if (count) count.textContent = q ? rows.length + ' of ' + (o.players || []).length + ' players' : (o.players || []).length + ' players';

    var arrow = function (key) { return st.sortKey === key ? '<span class="pcx-sort">' + (st.sortDir > 0 ? '▲' : '▼') + '</span>' : ''; };
    var th = function (key, label, cls, title) {
      return '<th data-sort="' + esc(key) + '" class="' + (cls || '') + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + label + arrow(key) + '</th>';
    };
    var head = '<tr><th class="txt" style="cursor:default">#</th>' + th('name', 'Player', 'txt stick')
      + th('joined', 'Joined', 'txt', 'Join date (blue: joined after the start of the chosen period)') + th('troops', 'Troops', 'troop', 'Latest troop level')
      + th('chests', 'Chests') + th('points', 'Points');
    cols.forEach(function (c) {
      var openable = c.levels.length > 0 || c.names.length > 0;
      var tog = openable ? '<span class="pcx-tog" data-toggle="' + esc(c.type) + '" title="Show the levels / chests">' + (st.open[c.type] ? '▼' : '▶') + '</span> ' : '';
      head += th('t:' + c.type, tog + esc(c.type), 'typ');
      if (st.open[c.type]) {
        c.levels.forEach(function (l) { head += th('l:' + c.type + '\u0000' + l, esc(levelLabel(l)), 'lvl', c.type + ' · ' + levelLabel(l)); });
        c.names.forEach(function (n) { head += th('n:' + c.type + '\u0000' + n, esc(n), 'lvl', c.type + ' · ' + n); });
      }
    });
    head += '</tr>';

    var cell = function (v, cls) { return '<td class="' + (cls || '') + (v ? '' : ' zero') + '">' + (v ? num(v) : '-') + '</td>'; };
    var body = rows.map(function (p, i) {
      var g = p.chestsByTypeGrouped || {};
      var tr = '<tr class="' + (p.totalChests ? '' : 'none') + '"><td class="txt">' + (i + 1) + '</td>'
        + '<td class="txt who stick"><a data-player="' + esc(p.name) + '" title="Show ' + esc(p.name) + '\'s chests">' + esc(p.name) + '</a></td>'
        + '<td class="txt joined' + (p.joinDate && p.joinDate > o.startDate ? ' new" title="Joined after the start of the chosen period' : '') + '">' + (p.joinDate ? fmtDate(p.joinDate) : '–') + '</td>'
        + '<td class="troop" title="' + esc(troopTitle(p.troops)) + '">' + (p.troops && p.troops.category ? esc(p.troops.category) : '–') + '</td>'
        + cell(p.totalChests) + cell(p.totalPoints);
      cols.forEach(function (c) {
        var t = g[c.type];
        tr += cell(t ? t.total : 0);
        if (st.open[c.type]) {
          c.levels.forEach(function (l) { tr += cell(t && t.levels ? t.levels[l] : 0, 'lvl'); });
          c.names.forEach(function (n) { tr += cell(t && t.names ? t.names[n] : 0, 'lvl'); });
        }
      });
      return tr + '</tr>';
    }).join('');
    table.innerHTML = '<thead>' + head + '</thead><tbody>' + (body || '<tr><td colspan="99" class="txt zero">No players match.</td></tr>') + '</tbody>';
  }

  // ─── 📉 Lowest ───
  var isCrypt = function (t) { return /crypt/i.test(t); };
  var isStore = function (t) { return /store|shop/i.test(t); };
  var PICKS = {
    crypt: { label: 'Crypt chests', test: isCrypt },
    store: { label: 'Store chests', test: isStore },
    both: { label: 'Crypt + store', test: function (t) { return isCrypt(t) || isStore(t); } },
    all: { label: 'All chests', test: function () { return true; } },
  };

  /** The chosen chest types (a quick pick, or the boxes ticked by hand). */
  function lowTypes(root, allTypes) {
    var lo = root._pcx.low;
    if (lo.types) return allTypes.filter(function (t) { return lo.types[t]; });
    var test = (PICKS[lo.pick] || PICKS.crypt).test;
    return allTypes.filter(test);
  }

  /** The members in the list (join filter), worst first, with their counts. */
  function lowRows(root) {
    var st = root._pcx, o = st.overview, lo = st.low;
    var allTypes = overviewColumns(o).map(function (c) { return c.type; });
    var chosen = lowTypes(root, allTypes);
    var crypts = allTypes.filter(isCrypt), stores = allTypes.filter(isStore);
    var sum = function (p, types) {
      var g = p.chestsByTypeGrouped || {};
      return types.reduce(function (n, t) { return n + (g[t] ? g[t].total : 0); }, 0);
    };
    var rows = (o.players || []).filter(function (p) {
      return !lo.useJoin || !lo.joinedBy || !p.joinDate || p.joinDate <= lo.joinedBy;
    }).map(function (p) {
      return { p: p, chosen: sum(p, chosen), crypt: sum(p, crypts), store: sum(p, stores) };
    });
    rows.sort(function (a, b) {
      return a.chosen - b.chosen || a.p.totalPoints - b.p.totalPoints || a.p.name.localeCompare(b.p.name);
    });
    return { allTypes: allTypes, chosen: chosen, rows: rows, shown: lo.show > 0 ? rows.slice(0, lo.show) : rows };
  }

  function drawLow(root) {
    var st = root._pcx, o = st.overview, lo = st.low;
    // "joined on or before" follows the start of the chosen dates until it is changed by hand
    if (!lo.joinedBy || lo.joinedByFor === lo.joinedBy) { lo.joinedBy = o.startDate; lo.joinedByFor = o.startDate; }
    var r = lowRows(root);
    var pickBtns = Object.keys(PICKS).map(function (k) {
      return '<button type="button" data-lowpick="' + k + '" class="' + (!lo.types && lo.pick === k ? 'on' : '') + '">' + PICKS[k].label + '</button>';
    }).join('');
    var boxes = r.allTypes.map(function (t) {
      return '<label><input type="checkbox" data-low="type" value="' + esc(t) + '"' + (r.chosen.indexOf(t) >= 0 ? ' checked' : '') + '> ' + esc(t) + '</label>';
    }).join('');
    var shows = [10, 20, 50, 0].map(function (n) {
      return '<option value="' + n + '"' + (lo.show === n ? ' selected' : '') + '>' + (n ? 'Lowest ' + n : 'Everyone') + '</option>';
    }).join('');
    var left = (o.players || []).length - r.rows.length;
    var out = root.querySelector('.pcx-result');
    out.innerHTML = '<div class="pcx-head">' + fmtDate(o.startDate) + ' → ' + fmtDate(o.endDate) + '</div>'
      + '<div class="pcx-low-opts">'
      + '<div class="pcx-low-line"><b>Count</b>' + pickBtns + '</div>'
      + '<div class="pcx-low-line">' + boxes + '</div>'
      + '<div class="pcx-low-line"><b>Members</b><label><input type="checkbox" data-low="usejoin"' + (lo.useJoin ? ' checked' : '') + '> only those who joined on or before</label>'
      + '<input type="date" data-low="joinedby" value="' + esc(lo.joinedBy) + '"' + (lo.useJoin ? '' : ' disabled') + '>'
      + '<select data-low="show">' + shows + '</select></div>'
      + '</div>'
      + '<div class="pcx-tools"><span>' + (r.chosen.length ? 'Counting: ' + r.chosen.map(esc).join(', ') : 'No chest types chosen')
      + ' · ' + r.rows.length + ' members' + (left > 0 ? ' (' + left + ' joined later, left out)' : '') + '</span>'
      + '<button type="button" class="pcx-csv" data-export="low" title="Download this list as a CSV file">⬇ Export CSV</button></div>'
      + '<div class="pcx-scroll"><table class="pcx-grid"><thead><tr>'
      + '<th class="txt">#</th><th class="txt stick">Player</th><th class="txt">Joined</th><th class="troop">Troops</th>'
      + '<th class="sel" title="Chests of the chosen types">Chosen</th><th>Crypt chests</th><th>Store chests</th><th>All chests</th><th>Points</th>'
      + '</tr></thead><tbody>'
      + (r.shown.map(function (x, i) {
          var p = x.p;
          var newer = p.joinDate && p.joinDate > o.startDate;
          return '<tr class="' + (p.totalChests ? '' : 'none') + '"><td class="txt">' + (i + 1) + '</td>'
            + '<td class="txt who stick"><a data-player="' + esc(p.name) + '" title="Show ' + esc(p.name) + '\'s chests">' + esc(p.name) + '</a></td>'
            + '<td class="txt joined' + (newer ? ' new" title="Joined after the start of the chosen period' : '') + '">' + (p.joinDate ? fmtDate(p.joinDate) : '–') + '</td>'
            + '<td class="troop" title="' + esc(troopTitle(p.troops)) + '">' + (p.troops && p.troops.category ? esc(p.troops.category) : '–') + '</td>'
            + '<td class="sel">' + num(x.chosen) + '</td>'
            + '<td' + (x.crypt ? '' : ' class="zero"') + '>' + (x.crypt ? num(x.crypt) : '-') + '</td>'
            + '<td' + (x.store ? '' : ' class="zero"') + '>' + (x.store ? num(x.store) : '-') + '</td>'
            + '<td' + (p.totalChests ? '' : ' class="zero"') + '>' + (p.totalChests ? num(p.totalChests) : '-') + '</td>'
            + '<td' + (p.totalPoints ? '' : ' class="zero"') + '>' + (p.totalPoints ? num(p.totalPoints) : '-') + '</td></tr>';
        }).join('') || '<tr><td colspan="9" class="txt zero">No members match.</td></tr>')
      + '</tbody></table></div>';
  }

  function onLowChange(root, e) {
    var t = e.target, kind = t.getAttribute && t.getAttribute('data-low');
    if (!kind) return;
    var st = root._pcx, lo = st.low;
    if (kind === 'type') {
      var allTypes = overviewColumns(st.overview).map(function (c) { return c.type; });
      var chosen = {};
      lowTypes(root, allTypes).forEach(function (x) { chosen[x] = true; });
      chosen[t.value] = t.checked;
      lo.types = chosen;
    } else if (kind === 'usejoin') lo.useJoin = t.checked;
    else if (kind === 'joinedby') lo.joinedBy = t.value;
    else if (kind === 'show') lo.show = Number(t.value);
    drawLow(root);
  }

  // ─── ⬇ Export CSV ───
  // Semicolons between the fields (Excel in Dutch, Turkish, German… reads them as
  // columns; Google Sheets finds them itself) and a UTF-8 mark, so names keep
  // their letters (ş, ğ, é…). Plain numbers, no thousands separators.
  var SEP = ';';
  function csvField(v) {
    if (typeof v === 'number') return String(v);
    var t = String(v === null || v === undefined ? '' : v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;   // never read as a spreadsheet formula
    return /[";\n\r,]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }
  function csvText(lines) {
    return '﻿' + lines.map(function (l) { return l.map(csvField).join(SEP); }).join('\r\n') + '\r\n';
  }
  // file names in plain letters (ş → s, ğ → g, ı → i): not every browser keeps others
  function fileSafe(t) {
    var plain = String(t).replace(/ı/g, 'i').replace(/ß/g, 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return plain.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'player';
  }
  function download(name, text) {
    var blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function exportCsv(root, which) {
    var st = root._pcx;
    if (which === 'all' && st.overview) {
      var o = st.overview, g = gridRows(root);
      var head = ['#', 'Player', 'Joined', 'Troops', 'G', 'M', 'S', 'Chests', 'Points'];
      g.cols.forEach(function (c) {
        head.push(c.type);
        c.levels.forEach(function (l) { head.push(c.type + ' - ' + levelLabel(l)); });
        c.names.forEach(function (n) { head.push(c.type + ' - ' + n); });
      });
      var lines = [head];
      g.rows.forEach(function (p, i) {
        var types = p.chestsByTypeGrouped || {};
        var tr = p.troops || {};
        var lv = function (k) { return tr[k] === null || tr[k] === undefined ? '' : tr[k]; };
        var line = [i + 1, p.name, p.joinDate || '', tr.category || '', lv('G'), lv('M'), lv('S'), p.totalChests || 0, p.totalPoints || 0];
        g.cols.forEach(function (c) {
          var t = types[c.type];
          line.push(t ? t.total : 0);
          c.levels.forEach(function (l) { line.push(t && t.levels ? t.levels[l] || 0 : 0); });
          c.names.forEach(function (n) { line.push(t && t.names ? t.names[n] || 0 : 0); });
        });
        lines.push(line);
      });
      download('player-chests_all_' + o.startDate + '_' + o.endDate + '.csv', csvText(lines));
    } else if (which === 'low' && st.overview) {
      var ov = st.overview, lr = lowRows(root);
      var lines2 = [['Counting', lr.chosen.join(', ')], ['From', ov.startDate], ['To', ov.endDate]];
      if (st.low.useJoin && st.low.joinedBy) lines2.push(['Joined on or before', st.low.joinedBy]);
      lines2.push([], ['#', 'Player', 'Joined', 'Troops', 'Chosen', 'Crypt chests', 'Store chests', 'All chests', 'Points']);
      lr.shown.forEach(function (x, i) {
        lines2.push([i + 1, x.p.name, x.p.joinDate || '', (x.p.troops && x.p.troops.category) || '', x.chosen, x.crypt, x.store, x.p.totalChests || 0, x.p.totalPoints || 0]);
      });
      download('player-chests_lowest_' + ov.startDate + '_' + ov.endDate + '.csv', csvText(lines2));
    } else if (which === 'one' && st.one) {
      var r = st.one, groups = r.chestsByTypeGrouped || {};
      var rows = [['Player', r.player], ['From', r.startDate], ['To', r.endDate]];
      if (r.names && r.names.length > 1) rows.push(['Earlier names', r.names.slice(1).join(', ')]);
      rows.push([], ['Chest type', 'Level / chest', 'Chests', 'Points']);
      Object.keys(groups).sort(typeSort).forEach(function (type) {
        var t = groups[type];
        rows.push([type, '', t.total || 0, t.points || 0]);
        Object.keys(t.levels || {}).sort(levelSort).forEach(function (l) { rows.push([type, levelLabel(l), t.levels[l], '']); });
        Object.keys(t.names || {}).sort(function (a, b) { return (t.names[b] - t.names[a]) || a.localeCompare(b); })
          .forEach(function (n) { rows.push([type, n, t.names[n], '']); });
      });
      rows.push(['Total', '', r.totalChests || 0, r.totalPoints || 0]);
      if ((r.periods || []).length) {
        rows.push([], ['Period', 'From', 'To', 'Chests', 'Points']);
        r.periods.forEach(function (p) {
          rows.push([p.name && p.name !== 'manual' && p.name !== 'fallback' ? p.name : '', p.start || '', p.end || '', p.chests || 0, p.points || 0]);
        });
      }
      download('player-chests_' + fileSafe(r.player) + '_' + r.startDate + '_' + r.endDate + '.csv', csvText(rows));
    }
  }

  // ─── 👤 One player ───
  function renderOne(out, r) {
    var groups = r.chestsByTypeGrouped || {};
    var head = '<div class="pcx-head">' + (r.totalChests ? '<button type="button" class="pcx-csv" data-export="one" title="Download this player\'s chests as a CSV file">⬇ Export CSV</button>' : '')
      + '<b>' + esc(r.player) + '</b>'
      + (r.names && r.names.length > 1 ? ' (also ' + r.names.slice(1).map(esc).join(', ') + ')' : '')
      + ' · ' + fmtDate(r.startDate) + ' → ' + fmtDate(r.endDate) + '</div>';
    if (!r.totalChests) { out.innerHTML = head + '<div class="pcx-empty">No chests in this period.</div>'; return; }

    var summary = '<div class="pcx-summary">'
      + '<div><b>' + num(r.totalChests) + '</b><span>Chests</span></div>'
      + '<div><b>' + num(r.totalPoints) + '</b><span>Points</span></div>'
      + '<div><b>' + (r.periods || []).length + '</b><span>Periods</span></div></div>';

    var types = Object.keys(groups).sort(typeSort);
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
        rows += '<tr class="pcx-sub" data-i="' + i + '"><td>' + esc(levelLabel(l)) + '</td>'
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
