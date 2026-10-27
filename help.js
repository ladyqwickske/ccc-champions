// ? Help for superiors: a round ? button next to the page title opens a short
// explanation of the page, with a link to the full guide (help.html). Regular
// members and visitors don't see it. The texts come
// from help-content.js; this file is the same on every clan site.
// Include after portal-auth.js:
//   <script src="help-content.js"></script>
//   <script src="help.js"></script>
(function () {
  if (window.HelpGuide) return;

  var GUIDE_PAGE = 'help.html';

  // How to translate, in Turkish: shown as is (never machine-translated).
  var TURKISH_TIP = '🇹🇷 Türkçe okumak için: bilgisayarda sayfaya sağ tıklayın ve “Türkçe diline çevir” seçin. '
    + 'Telefonda tarayıcı menüsünden (⋮) “Çevir” seçin. Düğme adları biraz farklı çevrilebilir: düğmedeki emojiye bakın.';

  // ---- Colours: the clan's own (help-content.js, else site-config.js), with readable text on top.
  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h.slice(0, 6), 16);
    return isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function luminance(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return 0;
    var c = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function theme() {
    var colors = content().colors || {};
    var cfg = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG) || {};
    var accent = String(colors.accent || cfg.primaryColor || '#ffb300').slice(0, 7);
    var bg = String(colors.panel || cfg.secondaryColor || '#232526').slice(0, 7);
    if (luminance(bg) > 0.2) bg = '#232526';                  // the panel stays dark
    return {
      bg: bg,
      accent: accent,
      onAccent: luminance(accent) > 0.35 ? '#1a1b1c' : '#ffffff',
      // headings in the accent colour only when it is light enough on the dark panel
      heading: luminance(accent) > 0.18 ? accent : '#ffffff'
    };
  }

  function css(t) {
    return [
      ':root { --help-bg: ' + t.bg + '; --help-accent: ' + t.accent + '; --help-on-accent: ' + t.onAccent + '; --help-heading: ' + t.heading + '; }',
      '.help-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; margin-left: 10px;'
        + ' vertical-align: middle; border-radius: 50%; border: 2px solid var(--help-accent); background: var(--help-bg);'
        + ' color: var(--help-accent); font: 700 16px/1 Roboto, Segoe UI, Arial, sans-serif; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }',
      '.help-btn:hover, .help-btn:focus-visible { background: var(--help-accent); color: var(--help-on-accent); outline: none; }',
      '.help-overlay { position: fixed; inset: 0; z-index: 2147483000; background: rgba(0, 0, 0, 0.5); display: none; justify-content: flex-end; }',
      '.help-overlay.open { display: flex; }',
      '.help-panel { width: 440px; max-width: 100%; height: 100%; overflow-y: auto; background: var(--help-bg); color: #f3f3f3;'
        + ' border-left: 3px solid var(--help-accent); box-shadow: -4px 0 24px rgba(0,0,0,0.4); padding: 20px 20px 80px;'
        + ' font: 15px/1.55 Roboto, Segoe UI, Arial, sans-serif; text-align: left; }',
      '.help-panel-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }',
      '.help-panel-head h2 { flex: 1; margin: 0; font-size: 1.3em; color: var(--help-heading); }',
      '.help-close { border: 0; background: none; font-size: 28px; line-height: 1; cursor: pointer; color: #cfcfcf; padding: 4px 8px; }',
      '.help-close:hover { color: #fff; }',
      '.help-who { font-size: 0.85em; color: #b8b8b8; margin-bottom: 12px; }',
      '.help-who a { color: #f3f3f3; }',
      '.help-summary { background: rgba(255,255,255,0.08); border-left: 4px solid var(--help-accent); padding: 10px 12px; border-radius: 6px; margin-bottom: 14px; }',
      '.help-part { margin-bottom: 12px; }',
      '.help-part h3 { font-size: 1em; margin: 0 0 2px; color: var(--help-heading); }',
      '.help-part p { margin: 0; }',
      '.help-part ul, .help-steps { margin: 4px 0 0 20px; padding: 0; }',
      '.help-part li, .help-steps li { margin-bottom: 3px; }',
      '.help-part b, .help-summary b { color: #fff; }',
      '.help-owner { font-size: 0.8em; color: #c8c8c8; font-style: italic; }',
      '.help-tip { font-size: 0.85em; color: #d6d6d6; background: rgba(255,255,255,0.06); border-radius: 6px; padding: 8px 10px; margin-top: 16px; }',
      '.help-action { display: inline-block; margin-top: 16px; padding: 9px 16px; border-radius: 8px; border: 0;'
        + ' background: var(--help-accent); color: var(--help-on-accent); font: 600 14px Roboto, Segoe UI, Arial, sans-serif; text-decoration: none; cursor: pointer; }',
      '@media (max-width: 600px) { .help-panel { width: 100%; padding: 16px 14px 80px; } .help-btn { width: 28px; height: 28px; font-size: 15px; } }',
      '@media print { .help-btn, .help-overlay { display: none !important; } }'
    ].join('\n');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Plain text with **bold** → HTML.
  function rich(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }

  function currentPage() {
    var path = window.location.pathname || '';
    var file = path.substring(path.lastIndexOf('/') + 1);
    return (file || 'dashboard.html').toLowerCase();
  }

  function pageId(file) {
    return String(file || '').replace(/\.html$/i, '');
  }

  function content() {
    return window.HELP_CONTENT || { intro: [], pages: [] };
  }

  function pageHelp(file) {
    var pages = content().pages || [];
    for (var i = 0; i < pages.length; i++) if (pages[i].file === file) return pages[i];
    return null;
  }

  function isSuperior() {
    return typeof window.getPortalRole === 'function' && window.getPortalRole() === 'admin';
  }

  function turkishTipHtml() {
    return '<div class="help-tip notranslate" translate="no" lang="tr">' + esc(TURKISH_TIP) + '</div>';
  }

  // ---- Rendering (shared by the ? panel and the guide page)
  function partHtml(part) {
    var html = '<div class="help-part"><h3>' + rich(part.title) + '</h3>';
    if (part.owner) html += '<div class="help-owner">👑 Only the clan leader</div>';
    if (part.text) html += '<p>' + rich(part.text) + '</p>';
    if (part.list) html += '<ul>' + part.list.map(function (li) { return '<li>' + rich(li) + '</li>'; }).join('') + '</ul>';
    return html + '</div>';
  }

  function howtoHtml(h) {
    return '<div class="help-part"><h3>' + rich(h.q) + '</h3><ol class="help-steps">'
      + h.steps.map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('') + '</ol></div>';
  }

  // ---- ? panel
  var overlay = null;
  var lastFocus = null;

  function buildPanel(help) {
    overlay = document.createElement('div');
    overlay.className = 'help-overlay';
    overlay.innerHTML = '<div class="help-panel" role="dialog" aria-modal="true" aria-labelledby="helpPanelTitle">'
      + '<div class="help-panel-head"><h2 id="helpPanelTitle">' + rich(help.title) + '</h2>'
      + '<button type="button" class="help-close" aria-label="Close">&times;</button></div>'
      + '<div class="help-who">👁️ ' + rich('Who sees this page: ' + help.who) + '</div>'
      + '<div class="help-summary">' + rich(help.summary) + '</div>'
      + (help.parts || []).map(partHtml).join('')
      + '<a class="help-action" href="' + GUIDE_PAGE + '#' + pageId(help.file) + '">📖 Open the full guide (step by step)</a>'
      + turkishTipHtml()
      + '</div>';
    overlay.querySelector('.help-close').addEventListener('click', closePanel);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closePanel(); });
    document.body.appendChild(overlay);
  }

  function openPanel() {
    lastFocus = document.activeElement;
    overlay.classList.add('open');
    overlay.querySelector('.help-close').focus();
  }

  function closePanel() {
    overlay.classList.remove('open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function addHelpButton(help) {
    if (document.getElementById('helpBtn')) return;
    var title = document.querySelector('h1');
    if (!title) return;
    buildPanel(help);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'helpBtn';
    btn.className = 'help-btn';
    btn.title = 'Help';
    btn.setAttribute('aria-label', 'Help for this page');
    btn.textContent = '?';
    btn.addEventListener('click', openPanel);
    title.appendChild(btn);
  }

  function removeHelp() {
    var btn = document.getElementById('helpBtn');
    if (btn) btn.parentNode.removeChild(btn);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  function apply() {
    if (!isSuperior()) { removeHelp(); return; }
    var help = pageHelp(currentPage());
    if (help) addHelpButton(help);
  }

  // ---- Full guide (help.html)
  function renderGuide(target) {
    var c = content();
    var pages = c.pages || [];
    var intro = c.intro || [];
    var toc = intro.map(function (s) { return '<li><a href="#' + esc(s.id) + '">' + rich(s.title) + '</a></li>'; })
      .concat(pages.map(function (p) {
        return '<li><a href="#' + pageId(p.file) + '"><img src="' + esc(p.icon) + '" alt="" class="toc-icon"> ' + rich(p.title) + '</a></li>';
      })).join('');

    var html = turkishTipHtml()
      + '<nav class="guide-toc" aria-label="Contents"><h2>Contents</h2><ol>' + toc + '</ol></nav>';

    intro.forEach(function (s) {
      html += '<section class="guide-section" id="' + esc(s.id) + '"><h2>' + rich(s.title) + '</h2>';
      (s.text || []).forEach(function (t) { html += '<p>' + rich(t) + '</p>'; });
      if (s.list) html += '<ul>' + s.list.map(function (li) { return '<li>' + rich(li) + '</li>'; }).join('') + '</ul>';
      html += '</section>';
    });

    pages.forEach(function (p) {
      html += '<section class="guide-section" id="' + pageId(p.file) + '">'
        + '<h2><img src="' + esc(p.icon) + '" alt="" class="guide-icon"> ' + rich(p.title) + '</h2>'
        + '<div class="help-who">👁️ ' + rich('Who sees this page: ' + p.who) + ' · <a href="' + esc(p.file) + '">Open the page →</a></div>'
        + '<div class="help-summary">' + rich(p.summary) + '</div>'
        + '<h3 class="guide-sub">What you see on this page</h3>'
        + (p.parts || []).map(partHtml).join('');
      if (p.howto && p.howto.length) {
        html += '<h3 class="guide-sub">How do I …?</h3>' + p.howto.map(howtoHtml).join('');
      }
      html += '<p class="guide-top"><a href="#top">↑ Back to the top</a></p></section>';
    });

    target.innerHTML = html;
  }

  window.HelpGuide = {
    renderGuide: renderGuide,
    isSuperior: isSuperior
  };

  function start() {
    var style = document.createElement('style');
    style.textContent = css(theme());
    document.head.appendChild(style);
    apply();
    document.addEventListener('portal-role-change', apply);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) closePanel();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
