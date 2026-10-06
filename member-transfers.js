/**
 * Returning members and Member Transfers (Members page, superiors only).
 * The same file is used on the Champions, Legends and Masters sites — keep the
 * three copies identical. Talks to the database Worker directly with
 * { action: ... } (config.js adds the sign-in pass).
 *
 *  ReturningMember  ➕ Add Member → "Returning member": pick someone from the
 *                   Former Members list and restore them (their login comes
 *                   along; under a new name their history is renamed to it).
 *                   In "New member" mode a name that looks like a former
 *                   member's shows a hint.
 *  MemberTransfers  🔁 Member Transfers tab: ask another cCc clan for a
 *                   player's profile, answer the other clans' requests, view
 *                   / print a received profile and copy its troop and hero
 *                   levels into our records.
 */
(function () {
  'use strict';

  var post = function (body) {
    return fetch(window.GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  };
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; };
  var $ = function (id) { return document.getElementById(id); };
  var today = function () { return new Date().toISOString().slice(0, 10); };
  var setStatus = function (el, msg, ok) {
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'status' + (msg ? (ok === true ? ' ok' : ok === false ? ' err' : '') : '');
    el.style.display = msg ? '' : 'none';
  };
  var fmtDate = function (v) {
    if (!v) return '';
    var s = String(v);
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m) return s;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var d = (+m[3]) + ' ' + months[+m[2] - 1] + ' ' + m[1];
    return /T/.test(s) && m[4] && !(m[4] === '00' && m[5] === '00') ? d + ' ' + m[4] + ':' + m[5] + ' UTC' : d;
  };
  var muted = 'color:var(--text-muted, #b0b0b0);';
  var box = 'border:1px solid var(--border, #444);border-radius:8px;padding:10px;';
  var cell = 'padding:5px 8px;text-align:left;border-bottom:1px solid var(--border, #444);vertical-align:top;';
  var secondaryBtn = 'btn btn-secondary secondary';

  // Names compared loosely: case, accents, spaces and symbols ignored.
  function key(name) {
    return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function distance(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 99;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  /** How much a typed name looks like a former member (0 = not at all). */
  function likeness(typed, member) {
    var t = key(typed);
    if (!t) return 0;
    var best = 0;
    [member.name].concat(member.previousNames || []).forEach(function (n) {
      var k = key(n);
      if (!k) return;
      var s = 0;
      if (k === t) s = 100;
      else if (t.length >= 3 && (k.indexOf(t) !== -1 || t.indexOf(k) !== -1)) s = 80;
      else {
        var d = distance(t, k);
        if (d <= 2 && Math.min(t.length, k.length) >= 4) s = 70 - d * 10;
        else if (t.length >= 4 && k.slice(0, 4) === t.slice(0, 4)) s = 40;
      }
      if (s > best) best = s;
    });
    return best;
  }

  // ===========================================================================
  // Returning members

  var RM = { former: null, loading: null, selected: null, opts: {} };

  function loadFormer(force) {
    if (RM.former && !force) return Promise.resolve(RM.former);
    if (RM.loading && !force) return RM.loading;
    RM.loading = post({ action: 'getFormerMembers' }).then(function (r) {
      RM.loading = null;
      if (!r || !r.success) throw new Error((r && (r.message || r.error)) || 'Could not load the Former Members list.');
      RM.former = r.members || [];
      return RM.former;
    }).catch(function (e) { RM.loading = null; throw e; });
    return RM.loading;
  }

  function formerLabel(m) {
    var bits = [];
    if (m.joinDate || m.endDate) bits.push((fmtDate(m.joinDate) || '?') + ' → ' + (fmtDate(m.endDate) || '?'));
    if (m.reason) bits.push(m.reason);
    return bits.join(' · ');
  }

  function renderReturning() {
    var c = $(RM.opts.container);
    if (!c) return;
    c.innerHTML = ''
      + '<p style="' + muted + 'font-size:13px;margin:0 0 10px;text-align:left;">Pick the player from the Former Members list. Their linked login comes back, their join date becomes the date they came back, and their earlier membership is kept. '
      + 'Changed their name? Enter the name they use now: all their history (chests, troops, heroes, events, warnings, …) moves to it. '
      + 'Already added them as a new member? Enter that member\'s name to link the old history to them.</p>'
      + '<div class="form-grid" style="grid-template-columns:1fr;"><div><label for="rmSearch">Search former members</label>'
      + '<input type="text" id="rmSearch" placeholder="🔍 Name, old name, reason or e-mail…"></div></div>'
      + '<div id="rmList" style="' + box + 'max-height:40vh;overflow-y:auto;text-align:left;margin-bottom:12px;"><span style="' + muted + '">Loading…</span></div>'
      + '<div id="rmChosen" style="display:none;">'
      + '<div class="form-grid" style="grid-template-columns:1fr 1fr;">'
      + '<div><label for="rmName">Name they use now</label><input type="text" id="rmName"><div class="note" id="rmNameNote"></div></div>'
      + '<div><label for="rmDate">Date they came back</label><input type="date" id="rmDate"><div class="note">Their join date from now on (period targets count from here)</div></div>'
      + '</div>'
      + '<button class="btn" id="rmRestore">↩️ Restore member</button>'
      + '</div>'
      + '<div id="rmStatus" class="status" style="display:none;"></div>';
    $('rmDate').value = today();
    $('rmSearch').addEventListener('input', drawList);
    $('rmName').addEventListener('input', nameNote);
    $('rmRestore').addEventListener('click', restore);
    loadFormer().then(drawList).catch(function (e) { $('rmList').innerHTML = '<span style="color:#e57373;">' + esc(e.message) + '</span>'; });
  }

  function drawList() {
    var list = $('rmList');
    if (!list || !RM.former) return;
    var q = ($('rmSearch').value || '').trim();
    var rows = RM.former.map(function (m) {
      var text = [m.name, (m.previousNames || []).join(' '), m.reason, m.googleAccount].join(' ').toLowerCase();
      return { m: m, score: q ? Math.max(likeness(q, m), text.indexOf(q.toLowerCase()) !== -1 ? 60 : 0) : 1 };
    }).filter(function (r) { return r.score > 0; });
    rows.sort(function (a, b) { return b.score - a.score || String(b.m.endDate).localeCompare(String(a.m.endDate)); });
    if (!RM.former.length) { list.innerHTML = '<span style="' + muted + '">The Former Members list is empty.</span>'; return; }
    if (!rows.length) { list.innerHTML = '<span style="' + muted + '">No former member matches "' + esc(q) + '".</span>'; return; }
    list.innerHTML = rows.slice(0, 200).map(function (r) {
      var m = r.m, sel = RM.selected && RM.selected.row === m.row;
      return '<label style="display:flex;gap:8px;align-items:flex-start;padding:6px 4px;cursor:pointer;border-bottom:1px solid var(--border, #333);' + (sel ? 'background:rgba(127,127,127,0.18);' : '') + '">'
        + '<input type="radio" name="rmPick" value="' + m.row + '"' + (sel ? ' checked' : '') + ' style="margin-top:3px;width:auto;">'
        + '<span><b>' + esc(m.name) + '</b>' + (q && r.score >= 50 ? ' <span style="font-size:11px;color:#81c784;">likely match</span>' : '')
        + (m.previousNames && m.previousNames.length ? ' <span style="font-size:12px;' + muted + '">(before: ' + esc(m.previousNames.join(', ')) + ')</span>' : '')
        + '<br><span style="font-size:12px;' + muted + '">' + esc(formerLabel(m)) + (m.googleAccount ? ' · 🔐 ' + esc(m.googleAccount) : '') + '</span></span></label>';
    }).join('') + (rows.length > 200 ? '<div style="' + muted + 'padding:6px;">Showing 200 of ' + rows.length + ' — search to narrow down.</div>' : '');
    list.querySelectorAll('input[name="rmPick"]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        RM.selected = RM.former.find(function (m) { return String(m.row) === inp.value; }) || null;
        if (RM.selected) {
          $('rmChosen').style.display = '';
          $('rmName').value = RM.selected.name;
          nameNote();
        }
        drawList();
      });
    });
  }

  function currentMembers() {
    try { return (RM.opts.currentMembers && RM.opts.currentMembers()) || []; } catch (e) { return []; }
  }

  function nameNote() {
    var note = $('rmNameNote');
    if (!note || !RM.selected) return;
    var name = $('rmName').value.trim();
    var existing = currentMembers().find(function (n) { return String(n).trim().toLowerCase() === name.toLowerCase(); });
    if (!name) note.textContent = '';
    else if (existing) note.textContent = '🔗 "' + existing + '" is already a member: the old history of "' + RM.selected.name + '" will be linked to them (they keep their join date).';
    else if (name.toLowerCase() !== RM.selected.name.toLowerCase()) note.textContent = '✏️ History of "' + RM.selected.name + '" will be renamed to "' + name + '".';
    else note.textContent = 'Comes back under the same name.';
  }

  function restore() {
    var st = $('rmStatus');
    var m = RM.selected;
    if (!m) { setStatus(st, 'Pick the former member first.', false); return; }
    var name = $('rmName').value.trim();
    var joinDate = $('rmDate').value || today();
    if (!name) { setStatus(st, 'Enter the name they use now.', false); return; }
    var msg = 'Restore "' + m.name + '"' + (name !== m.name ? ' as "' + name + '"' : '') + ' (came back ' + joinDate + ')?';
    if (!confirm(msg)) return;
    setStatus(st, 'Restoring…');
    $('rmRestore').disabled = true;
    post({ action: 'restoreMember', formerRow: m.row, formerName: m.name, name: name, joinDate: joinDate }).then(function (r) {
      $('rmRestore').disabled = false;
      setStatus(st, (r && (r.message || r.error)) || 'Failed.', !!(r && r.success && !r.warning));
      if (r && r.success) {
        RM.selected = null;
        $('rmChosen').style.display = 'none';
        RM.former = RM.former.filter(function (x) { return x.row !== m.row; }).map(function (x) { return x.row > m.row ? Object.assign({}, x, { row: x.row - 1 }) : x; });
        drawList();
        loadFormer(true).then(drawList).catch(function () {});
        if (RM.opts.onDone) RM.opts.onDone(r);
      }
    }).catch(function (e) { $('rmRestore').disabled = false; setStatus(st, 'Error: ' + e.message, false); });
  }

  /** "New member" mode: a hint when the typed name looks like a former member's. */
  function hintFor(name) {
    var hint = $(RM.opts.hint);
    if (!hint) return;
    if (!name || !name.trim() || !RM.former) { hint.style.display = 'none'; hint.innerHTML = ''; return; }
    var best = RM.former.map(function (m) { return { m: m, s: likeness(name, m) }; })
      .filter(function (x) { return x.s >= 50; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3);
    if (!best.length) { hint.style.display = 'none'; hint.innerHTML = ''; return; }
    hint.style.display = '';
    hint.innerHTML = '💡 Was this player here before? ' + best.map(function (x) {
      return '<b>' + esc(x.m.name) + '</b> <span style="' + muted + '">(' + esc(formerLabel(x.m)) + ')</span>';
    }).join(', ') + ' — <a href="#" id="rmHintSwitch">add as a returning member</a> to keep their history.';
    $('rmHintSwitch').addEventListener('click', function (e) {
      e.preventDefault();
      window.ReturningMember.setMode('returning');
      var s = $('rmSearch');
      if (s) { s.value = name.trim(); drawList(); }
    });
  }

  window.ReturningMember = {
    /**
     * opts: { container, newForm, hint, nameInput, modeName, currentMembers(), onDone(result) }
     * (element ids; modeName = the name of the two mode radio buttons)
     */
    init: function (opts) {
      RM.opts = opts || {};
      document.querySelectorAll('input[name="' + RM.opts.modeName + '"]').forEach(function (r) {
        r.addEventListener('change', function () { if (r.checked) window.ReturningMember.setMode(r.value); });
      });
      var input = $(RM.opts.nameInput);
      if (input) {
        var t = null;
        input.addEventListener('focus', function () { loadFormer().catch(function () {}); });
        input.addEventListener('input', function () {
          clearTimeout(t);
          t = setTimeout(function () { loadFormer().then(function () { hintFor(input.value); }).catch(function () {}); }, 250);
        });
      }
    },
    setMode: function (mode) {
      var returning = mode === 'returning';
      document.querySelectorAll('input[name="' + RM.opts.modeName + '"]').forEach(function (r) { r.checked = r.value === (returning ? 'returning' : 'new'); });
      var nf = $(RM.opts.newForm), rc = $(RM.opts.container);
      if (nf) nf.style.display = returning ? 'none' : '';
      if (rc) {
        rc.style.display = returning ? '' : 'none';
        if (returning && !rc.innerHTML) renderReturning();
        else if (returning) loadFormer().then(drawList).catch(function () {});
      }
    },
    reload: function () { RM.former = null; if ($('rmList')) loadFormer(true).then(drawList).catch(function () {}); },
  };

  // ===========================================================================
  // Member Transfers

  var MT = { data: null, container: null, open: {}, badge: null };

  function statusChip(s) {
    var c = { waiting: '#ffb300', approved: '#43a047', declined: '#e53935' }[s] || '#888';
    var t = { waiting: '⏳ waiting', approved: '✅ approved', declined: '⛔ declined' }[s] || s;
    return '<span style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;font-weight:600;color:#fff;background:' + c + ';">' + t + '</span>';
  }

  function memberOptions(list, filter) {
    return list.filter(filter || function () { return true; }).map(function (m) {
      return '<option value="' + esc(m.name) + '">' + esc(m.name) + (m.status === 'former' ? ' (former)' : '') + '</option>';
    }).join('');
  }

  function renderTransfers() {
    var c = MT.container;
    var d = MT.data;
    if (!c || !d) return;
    var html = '';
    if (!d.ready) {
      html += '<div class="status err" style="margin-bottom:12px;">Member transfers are not switched on for this clan yet (the Worker needs TRANSFER_KEY and TRANSFER_CLANS). You can still preview a member\'s profile below.</div>';
    }
    var errs = Object.keys(d.errors || {});
    if (errs.length) html += '<div class="status err" style="margin-bottom:12px;">Could not check: ' + errs.map(function (k) { return esc(d.errors[k]); }).join('; ') + '</div>';

    // Ask another clan
    html += '<h4 style="margin:0 0 6px;text-align:left;">📨 Ask another clan for a profile</h4>'
      + '<p style="' + muted + 'font-size:13px;margin:0 0 8px;text-align:left;">For a player who joined us from another cCc clan. Their superiors choose which member it is and approve before anything is shared.</p>'
      + '<div class="form-grid" style="grid-template-columns:1fr 1fr 2fr;">'
      + '<div><label for="mtClan">Clan</label><select id="mtClan">' + (d.clans || []).map(function (cl) { return '<option>' + esc(cl) + '</option>'; }).join('') + '</select></div>'
      + '<div><label for="mtPlayer">Their name in that clan</label><input type="text" id="mtPlayer" placeholder="Player name there"></div>'
      + '<div><label for="mtNote">Note (optional)</label><input type="text" id="mtNote" placeholder="e.g. now called X, joined us 5 Oct"></div>'
      + '</div><button class="btn" id="mtSend"' + (d.ready ? '' : ' disabled') + '>📨 Send request</button>'
      + '<div id="mtSendStatus" class="status" style="display:none;"></div>';

    // Incoming
    var waitingIn = d.incoming.filter(function (r) { return r.status === 'waiting'; }).length;
    html += '<h4 style="margin:22px 0 6px;text-align:left;">📥 Requests from other clans' + (waitingIn ? ' <span style="color:#ffb300;">(' + waitingIn + ' waiting)</span>' : '') + '</h4>';
    if (!d.incoming.length) html += '<p style="' + muted + 'text-align:left;">No requests.</p>';
    else {
      html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr>'
        + ['From', 'Player asked for', 'Asked', 'Status', ''].map(function (h) { return '<th style="' + cell + '">' + h + '</th>'; }).join('') + '</tr></thead><tbody>';
      d.incoming.forEach(function (r) {
        html += '<tr><td style="' + cell + '">' + esc(r.otherClan) + '</td>'
          + '<td style="' + cell + '"><b>' + esc(r.playerName) + '</b>' + (r.note ? '<br><span style="' + muted + '">' + esc(r.note) + '</span>' : '') + '</td>'
          + '<td style="' + cell + '">' + esc(fmtDate(r.requestedAt)) + (r.requestedBy ? '<br><span style="' + muted + '">' + esc(r.requestedBy) + '</span>' : '') + '</td>'
          + '<td style="' + cell + '">' + statusChip(r.status) + (r.matchedMember ? '<br><span style="' + muted + '">as ' + esc(r.matchedMember) + '</span>' : '')
          + (r.answeredBy ? '<br><span style="' + muted + '">' + esc(r.answeredBy) + ', ' + esc(fmtDate(r.answeredAt)) + '</span>' : '') + (r.answerNote ? '<br><span style="' + muted + '">“' + esc(r.answerNote) + '”</span>' : '') + '</td>'
          + '<td style="' + cell + 'min-width:260px;">';
        if (r.status === 'waiting') {
          var guess = d.members.map(function (m) { return { m: m, s: likeness(r.playerName, { name: m.name }) }; }).sort(function (a, b) { return b.s - a.s; })[0];
          html += '<div class="form-grid" style="grid-template-columns:1fr;margin-bottom:6px;"><div><label>Which of our members?</label><select data-mt-member="' + esc(r.id) + '" data-mt-guess="' + esc(guess && guess.s >= 50 ? guess.m.name : '') + '"><option value="">— pick —</option>' + memberOptions(d.members) + '</select></div>'
            + '<div><label>Note (optional)</label><input type="text" data-mt-note="' + esc(r.id) + '" placeholder="Shown to them"></div></div>'
            + '<button class="' + secondaryBtn + '" data-mt-preview="' + esc(r.id) + '">👁️ Preview</button> '
            + '<button class="btn" data-mt-approve="' + esc(r.id) + '">✅ Approve</button> '
            + '<button class="btn danger" data-mt-decline="' + esc(r.id) + '" style="background:#c62828;color:#fff;">⛔ Decline</button>'
            + '<div class="status" data-mt-rowstatus="' + esc(r.id) + '" style="display:none;"></div>'
            + '<div data-mt-previewbox="' + esc(r.id) + '"></div>';
        }
        html += '</td></tr>';
      });
      html += '</tbody></table></div>';
    }

    // Outgoing
    html += '<h4 style="margin:22px 0 6px;text-align:left;">📤 Our requests</h4>';
    if (!d.outgoing.length) html += '<p style="' + muted + 'text-align:left;">No requests sent.</p>';
    else {
      d.outgoing.forEach(function (r) {
        html += '<div style="' + box + 'margin-bottom:10px;text-align:left;">'
          + '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">'
          + '<div><b>' + esc(r.playerName) + '</b> from <b>' + esc(r.otherClan) + '</b> ' + statusChip(r.status)
          + '<br><span style="font-size:12px;' + muted + '">Asked ' + esc(fmtDate(r.requestedAt)) + (r.requestedBy ? ' by ' + esc(r.requestedBy) : '') + (r.note ? ' · “' + esc(r.note) + '”' : '')
          + (r.answeredAt ? ' · answered ' + esc(fmtDate(r.answeredAt)) + (r.answeredBy ? ' by ' + esc(r.answeredBy) : '') : '')
          + (r.answerNote ? ' · “' + esc(r.answerNote) + '”' : '') + '</span></div>'
          + '<div>' + (r.profile ? '<button class="btn" data-mt-view="' + esc(r.id) + '">' + (MT.open[r.id] ? '🔼 Hide profile' : '👁️ View profile') + '</button> ' : '')
          + '<button class="' + secondaryBtn + '" data-mt-cancel="' + esc(r.id) + '">' + (r.status === 'waiting' ? '✖ Withdraw' : '🗑️ Remove') + '</button></div></div>';
        if (r.profile && MT.open[r.id]) {
          html += '<div style="margin-top:10px;">' + profileHtml(r.profile)
            + '<div style="margin-top:10px;' + box + '"><b>Copy the latest troop and hero levels into our records</b>'
            + (r.levelsCopiedAt ? ' <span style="font-size:12px;' + muted + '">(copied before, ' + esc(fmtDate(r.levelsCopiedAt)) + ')</span>' : '')
            + '<div class="form-grid" style="grid-template-columns:2fr 1fr;margin:8px 0 0;align-items:end;"><div><label>For our member</label><select data-mt-copyto="' + esc(r.id) + '"><option value="">— pick —</option>'
            + memberOptions(d.members, function (m) { return m.status === 'current'; }) + '</select></div>'
            + '<div><button class="btn" data-mt-copy="' + esc(r.id) + '">⬇️ Copy levels</button></div></div>'
            + '<div class="status" data-mt-rowstatus="' + esc(r.id) + '" style="display:none;"></div></div>'
            + '<button class="' + secondaryBtn + '" style="margin-top:10px;" data-mt-print="' + esc(r.id) + '">🖨️ Print / save as PDF</button></div>';
        }
        html += '</div>';
      });
    }

    // Preview any of our own members
    html += '<h4 style="margin:22px 0 6px;text-align:left;">🗂️ Profile of one of our members</h4>'
      + '<p style="' + muted + 'font-size:13px;margin:0 0 8px;text-align:left;">What another clan would receive — also handy to print a (former) member\'s full record.</p>'
      + '<div class="form-grid" style="grid-template-columns:2fr 1fr;align-items:end;"><div><label for="mtOwn">Member</label><select id="mtOwn"><option value="">— pick —</option>' + memberOptions(d.members) + '</select></div>'
      + '<div><button class="' + secondaryBtn + '" id="mtOwnShow">👁️ Show profile</button></div></div><div id="mtOwnBox"></div>';

    c.innerHTML = html;
    wireTransfers();
  }

  function rowStatus(id, msg, ok) {
    MT.container.querySelectorAll('[data-mt-rowstatus="' + CSS.escape(id) + '"]').forEach(function (el) { setStatus(el, msg, ok); });
  }
  var q = function (attr, id) { return MT.container.querySelector('[' + attr + '="' + CSS.escape(id) + '"]'); };

  function wireTransfers() {
    var c = MT.container;
    var send = $('mtSend');
    if (send) send.addEventListener('click', function () {
      var st = $('mtSendStatus');
      var playerName = $('mtPlayer').value.trim();
      if (!playerName) { setStatus(st, 'Enter the player\'s name in that clan.', false); return; }
      setStatus(st, 'Sending…');
      send.disabled = true;
      post({ action: 'requestTransferProfile', toClan: $('mtClan').value, playerName: playerName, note: $('mtNote').value.trim() }).then(function (r) {
        send.disabled = false;
        if (r && r.success) { window.MemberTransfers.load().then(function () { setStatus($('mtSendStatus'), r.message, true); }); }
        else setStatus(st, (r && (r.message || r.error)) || 'Failed.', false);
      }).catch(function (e) { send.disabled = false; setStatus(st, 'Error: ' + e.message, false); });
    });
    // A likely match is picked already (the superior can change it).
    c.querySelectorAll('select[data-mt-guess]').forEach(function (sel) {
      if (!sel.value && sel.getAttribute('data-mt-guess')) sel.value = sel.getAttribute('data-mt-guess');
    });
    c.querySelectorAll('[data-mt-preview]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-mt-preview');
        var name = q('data-mt-member', id).value;
        var target = q('data-mt-previewbox', id);
        if (!name) { rowStatus(id, 'Pick which member it is first.', false); return; }
        if (target.innerHTML) { target.innerHTML = ''; return; }
        showProfile(name, target, id);
      });
    });
    c.querySelectorAll('[data-mt-approve]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-mt-approve');
        var name = q('data-mt-member', id).value;
        var req = MT.data.incoming.find(function (r) { return r.id === id; });
        if (!name) { rowStatus(id, 'Pick which member it is first.', false); return; }
        if (!confirm('Share the profile of "' + name + '" with ' + req.otherClan + '?')) return;
        answer(id, true, name);
      });
    });
    c.querySelectorAll('[data-mt-decline]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-mt-decline');
        if (!confirm('Decline this request?')) return;
        answer(id, false, '');
      });
    });
    c.querySelectorAll('[data-mt-view]').forEach(function (b) {
      b.addEventListener('click', function () { var id = b.getAttribute('data-mt-view'); MT.open[id] = !MT.open[id]; renderTransfers(); });
    });
    c.querySelectorAll('[data-mt-cancel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-mt-cancel');
        var r = MT.data.outgoing.find(function (x) { return x.id === id; });
        if (!confirm(r && r.status === 'waiting' ? 'Withdraw this request?' : 'Remove this request (and the received profile) from the list?')) return;
        post({ action: 'cancelTransferRequest', id: id }).then(function () { window.MemberTransfers.load(); });
      });
    });
    c.querySelectorAll('[data-mt-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-mt-copy');
        var name = q('data-mt-copyto', id).value;
        if (!name) { rowStatus(id, 'Pick our member first.', false); return; }
        if (!confirm('Add the received troop and hero levels to "' + name + '" (dated today)?')) return;
        rowStatus(id, 'Copying…');
        post({ action: 'copyTransferLevels', id: id, memberName: name }).then(function (r) {
          rowStatus(id, (r && (r.message || r.error)) || 'Failed.', !!(r && r.success));
          if (r && r.success && MT.onLevelsCopied) MT.onLevelsCopied();
        }).catch(function (e) { rowStatus(id, 'Error: ' + e.message, false); });
      });
    });
    c.querySelectorAll('[data-mt-print]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = MT.data.outgoing.find(function (x) { return x.id === b.getAttribute('data-mt-print'); });
        if (r && r.profile) printProfile(r.profile);
      });
    });
    var own = $('mtOwnShow');
    if (own) own.addEventListener('click', function () {
      var name = $('mtOwn').value;
      if (!name) return;
      showProfile(name, $('mtOwnBox'), null, true);
    });
  }

  function answer(id, approve, memberName) {
    var note = (q('data-mt-note', id) || {}).value || '';
    rowStatus(id, approve ? 'Approving…' : 'Declining…');
    post({ action: 'answerTransferRequest', id: id, approve: approve, memberName: memberName, note: note.trim() }).then(function (r) {
      if (r && r.success) window.MemberTransfers.load();
      else rowStatus(id, (r && (r.message || r.error)) || 'Failed.', false);
    }).catch(function (e) { rowStatus(id, 'Error: ' + e.message, false); });
  }

  function showProfile(name, target, statusId, withPrint) {
    target.innerHTML = '<p style="' + muted + '">Loading…</p>';
    post({ action: 'getMemberProfileSnapshot', memberName: name }).then(function (r) {
      if (!r || !r.success) { target.innerHTML = '<div class="status err">' + esc((r && (r.message || r.error)) || 'Failed.') + '</div>'; return; }
      target.innerHTML = '<div style="margin-top:10px;">' + profileHtml(r.profile) + '</div>'
        + (withPrint ? '<button class="' + secondaryBtn + '" style="margin-top:8px;">🖨️ Print / save as PDF</button>' : '');
      var pb = target.querySelector('button');
      if (pb) pb.addEventListener('click', function () { printProfile(r.profile); });
    }).catch(function (e) { target.innerHTML = '<div class="status err">Error: ' + esc(e.message) + '</div>'; });
  }

  // ---------------------------------------------------------------------------
  // A profile, as HTML (also used for printing)

  function table(headers, rows) {
    if (!rows.length) return '<p style="' + muted + 'margin:4px 0;">None.</p>';
    return '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr>'
      + headers.map(function (h) { return '<th style="' + cell + '">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>'
      + rows.map(function (r) { return '<tr>' + r.map(function (v) { return '<td style="' + cell + '">' + v + '</td>'; }).join('') + '</tr>'; }).join('')
      + '</tbody></table></div>';
  }
  var pairs = function (list) {
    return (list || []).map(function (f) { return '<span style="white-space:nowrap;"><span style="' + muted + '">' + esc(f[0]) + ':</span> ' + esc(/^\d{4}-\d{2}-\d{2}/.test(String(f[1])) ? fmtDate(f[1]) : f[1]) + '</span>'; }).join(' · ');
  };
  var section = function (title, body, open) {
    return '<details' + (open ? ' open' : '') + ' style="margin:8px 0;"><summary style="cursor:pointer;font-weight:600;">' + title + '</summary><div style="padding:6px 0 0 4px;">' + body + '</div></details>';
  };

  function profileHtml(p) {
    var statusText = { current: 'current member', former: 'former member', unknown: 'not found' }[p.status] || p.status;
    var latest = p.troops && p.troops.latest || {};
    var troopLine = ['G', 'M', 'S', 'E', 'C'].filter(function (t) { return latest[t]; }).map(function (t) {
      return '<b>' + t + '</b> ' + esc(latest[t].level) + ' <span style="font-size:11px;' + muted + '">(' + esc(fmtDate(latest[t].date)) + ')</span>';
    }).join(' · ');
    var hero = p.heroes && p.heroes.latest;
    var totalPts = (p.chests || []).reduce(function (s, c) { return s + (Number(c.points) || 0); }, 0);
    var h = '<div style="' + box + 'text-align:left;">'
      + '<div style="font-size:16px;font-weight:700;">' + esc(p.member) + ' <span style="font-size:13px;font-weight:400;' + muted + '">— ' + esc(p.clan) + ', ' + esc(statusText) + '</span></div>'
      + '<div style="font-size:12px;' + muted + 'margin-bottom:6px;">Snapshot taken ' + esc(fmtDate(p.takenAt)) + '</div>'
      + '<div style="font-size:13px;line-height:1.7;">'
      + (p.joinDate ? '📅 Member since ' + esc(fmtDate(p.joinDate)) + '<br>' : '')
      + (p.previousNames && p.previousNames.length ? '🏷️ Earlier names: ' + esc(p.previousNames.join(', ')) + '<br>' : '')
      + (p.googleAccount ? '🔐 Login: ' + esc(p.googleAccount) + '<br>' : '')
      + (troopLine ? '⚔️ Troops: ' + troopLine + '<br>' : '')
      + (hero ? '🦸 Hero level: <b>' + esc(hero.level) + '</b> <span style="font-size:11px;' + muted + '">(' + esc(fmtDate(hero.date)) + ')</span><br>' : '')
      + '📦 Chest points: <b>' + totalPts.toLocaleString() + '</b> over ' + (p.chests || []).length + ' period(s) · 🎯 ' + (p.events || []).length + ' event(s) · ⚠️ ' + (p.warnings || []).length + ' warning(s)'
      + '</div>';
    h += section('📅 Memberships', table(['Name', 'Joined', 'Left', 'Reason', 'Came back'], (p.stints || []).map(function (s) {
      return [esc(s.name), esc(fmtDate(s.joined)), esc(fmtDate(s.left)), esc(s.reason), esc(fmtDate(s.rejoined || ''))];
    }).concat(p.status === 'current' ? [[esc(p.member), esc(fmtDate(p.joinDate)), '<i>now</i>', '', '']] : [])), true);
    h += section('📦 Chest points per period', table(['Period', 'Chests', 'Points'], (p.chests || []).slice().reverse().map(function (c) {
      return [esc(fmtDate(c.start)) + (c.end ? ' → ' + esc(fmtDate(c.end)) : '') + (c.active ? ' <i>(active)</i>' : ''), esc(c.chests), esc(Number(c.points).toLocaleString())];
    })));
    h += section('🎯 Events', table(['Event', 'Details', 'Their result'], (p.events || []).map(function (e) {
      return [esc(e.event), pairs(e.info), pairs(e.fields)];
    })));
    h += section('⚠️ Warnings', table(['Warning'], (p.warnings || []).map(function (w) { return [pairs(w)]; })));
    h += section('⚔️ Troop level history', table(['Date', 'Type', 'Level', 'Notes'], ((p.troops && p.troops.history) || []).slice().reverse().map(function (t) {
      return [esc(fmtDate(t.date)), esc(t.type), esc(t.level), esc(t.notes)];
    })));
    h += section('🦸 Hero level history', table(['Date', 'Level'], ((p.heroes && p.heroes.history) || []).slice().reverse().map(function (t) {
      return [esc(fmtDate(t.date)), esc(t.level)];
    })));
    return h + '</div>';
  }

  function printProfile(p) {
    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups for this site to print the profile.'); return; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(p.member) + ' — ' + esc(p.clan) + '</title>'
      + '<style>body{font-family:Segoe UI,Arial,sans-serif;color:#222;margin:20px;} details>summary{list-style:none;} th{background:#f2f2f2;}</style></head><body>'
      + profileHtml(p).replace(/<details[^>]*>/g, '<details open>') + '<script>setTimeout(function(){window.print();},300);<\/script></body></html>');
    w.document.close();
  }

  window.MemberTransfers = {
    /** opts: { container, badge (tab button id), onLevelsCopied() } */
    init: function (opts) {
      MT.container = $(opts.container);
      MT.badge = opts.badge ? $(opts.badge) : null;
      MT.onLevelsCopied = opts.onLevelsCopied;
      if (MT.badge) MT.badgeText = MT.badge.textContent;
    },
    load: function () {
      if (!MT.container) return Promise.resolve();
      if (!MT.data) MT.container.innerHTML = '<p style="' + muted + '">Loading…</p>';
      return post({ action: 'getTransferRequests' }).then(function (r) {
        if (!r || !r.success) { MT.container.innerHTML = '<div class="status err">' + esc((r && (r.message || r.error)) || 'Could not load the transfer requests.') + '</div>'; return; }
        MT.data = r;
        renderTransfers();
        window.MemberTransfers.updateBadge();
      }).catch(function (e) { MT.container.innerHTML = '<div class="status err">Error: ' + esc(e.message) + '</div>'; });
    },
    /** Show how many requests from other clans wait for an answer on the tab button. */
    updateBadge: function () {
      if (!MT.badge || !MT.data) return;
      var n = MT.data.incoming.filter(function (r) { return r.status === 'waiting'; }).length;
      MT.badge.textContent = MT.badgeText + (n ? ' (' + n + ')' : '');
      MT.badge.style.color = n ? '#ffb300' : '';
    },
    /** For the badge only, without drawing the tab (e.g. right after the page loads). */
    check: function () {
      return post({ action: 'getTransferRequests' }).then(function (r) {
        if (r && r.success) { MT.data = r; window.MemberTransfers.updateBadge(); }
      }).catch(function () {});
    },
  };
})();
