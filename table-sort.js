// Click-to-sort for tables marked <table data-sortable id="...">.
//  - Click a header to sort by that column, click again to reverse. Headers without text
//    (action columns) or with data-nosort stay unsortable.
//  - data-sort-col="N" (and optionally data-sort-dir="desc") gives the starting sort, e.g. the
//    member column A→Z. Without it the rows keep their order until a header is clicked.
//  - Cells sort by their input/select value (ticked checkboxes first), else data-sort, else text.
//    Numbers sort as numbers, text alphabetically (case-insensitive); empty cells always last.
//  - The sort survives re-renders: the state is kept per table id and re-applied whenever the
//    table's rows change. Rows with a colspan cell ("Loading…", "No matches") are left alone.
(function () {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const state = {};   // table id -> { col, dir }

  function headerRow(table) {
    if (table.tHead && table.tHead.rows.length) return table.tHead.rows[0];
    return Array.from(table.rows).find(r => r.querySelector('th')) || null;
  }

  function cellValue(cell) {
    if (!cell) return '';
    if (cell.hasAttribute('data-sort')) return cell.getAttribute('data-sort').trim();
    const input = cell.querySelector('input:not([type="hidden"]), select, textarea');
    if (input) {
      if (input.type === 'checkbox' || input.type === 'radio') return input.checked ? '0' : '1';
      return String(input.value || '').trim();
    }
    return cell.textContent.trim();
  }

  function asNumber(v) {
    const s = v.replace(/[\s,]/g, '');
    return /^[-+]?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
  }

  function compare(a, b) {
    const na = asNumber(a), nb = asNumber(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return collator.compare(a, b);
  }

  function getState(table) {
    if (!(table.id in state)) {
      const col = table.getAttribute('data-sort-col');
      state[table.id] = col == null ? null : { col: +col, dir: table.getAttribute('data-sort-dir') === 'desc' ? -1 : 1 };
    }
    return state[table.id];
  }

  function paintHeader(table, s) {
    const head = headerRow(table);
    if (!head) return;
    Array.from(head.cells).forEach((th, i) => {
      if (th.hasAttribute('data-nosort') || !th.textContent.replace(/[▲▼]/g, '').trim()) return;
      th.style.cursor = 'pointer';
      th.style.userSelect = 'none';
      th.style.whiteSpace = 'nowrap';
      if (!th.title) th.title = 'Click to sort';
      let arrow = th.querySelector('.ts-arrow');
      if (!arrow) {
        arrow = document.createElement('span');
        arrow.className = 'ts-arrow';
        th.appendChild(arrow);
      }
      const text = s && s.col === i ? (s.dir > 0 ? ' ▲' : ' ▼') : '';
      if (arrow.textContent !== text) arrow.textContent = text;
    });
  }

  function apply(table) {
    if (!table.id) return;
    const s = getState(table);
    paintHeader(table, s);
    if (!s) return;
    const head = headerRow(table);
    Array.from(table.tBodies).forEach(tbody => {
      const rows = Array.from(tbody.rows).filter(r => r !== head);
      const sortable = rows.filter(r => !r.querySelector('td[colspan]'));
      if (sortable.length < 2) return;
      const nameCol = table.hasAttribute('data-name-col') ? +table.getAttribute('data-name-col') : s.col;
      const keyed = sortable.map((r, i) => ({ r, i, v: cellValue(r.cells[s.col]), n: cellValue(r.cells[nameCol]) }));
      keyed.sort((a, b) => {
        if (!a.v !== !b.v) return a.v ? -1 : 1;               // empty cells last, either direction
        return s.dir * compare(a.v, b.v) || collator.compare(a.n, b.n) || a.i - b.i;
      });
      // Only move rows when the order changed, so re-applying after our own move is a no-op.
      if (keyed.every((k, i) => k.r === sortable[i])) return;
      const rest = rows.filter(r => r.querySelector('td[colspan]'));
      keyed.forEach(k => tbody.appendChild(k.r));
      rest.forEach(r => tbody.appendChild(r));
    });
  }

  function applyAll() {
    document.querySelectorAll('table[data-sortable]').forEach(apply);
  }

  document.addEventListener('click', (e) => {
    const th = e.target.closest && e.target.closest('th');
    if (!th) return;
    const table = th.closest('table[data-sortable]');
    if (!table || !table.id || headerRow(table) !== th.parentElement) return;
    if (th.hasAttribute('data-nosort') || !th.textContent.replace(/[▲▼]/g, '').trim()) return;
    if (e.target.closest('input, select, button, a')) return;
    const s = getState(table);
    const col = th.cellIndex;
    state[table.id] = s && s.col === col ? { col, dir: -s.dir } : { col, dir: 1 };
    apply(table);
  });

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; applyAll(); });
  });

  function start() {
    applyAll();
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.TableSort = { apply, applyAll };
})();
