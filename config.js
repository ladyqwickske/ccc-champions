// DATABASE VERSION OF THE SITE (new pages, UTC dates) — live since the switch (2026-09-29).
// The database Worker: https://champions-db.ccc-hq.com
// IS_STAGING_SITE = true shows a STAGING label on every page (for a test copy only).
// Before the switch the live site used the Google Sheet through https://ccc-l1.lady-qwickske.workers.dev/
window.CLOUDFLARE_WORKER_URL = 'https://champions-db.ccc-hq.com/';
window.IS_STAGING_SITE = false;

// Frontend should call the worker to avoid GAS CORS restrictions.
window.GAS_WEB_APP_URL = window.CLOUDFLARE_WORKER_URL;

// Sign-in pass (the Worker's src/auth.js).
// After a Google sign-in the Worker answers with its own pass, valid 30 days and
// renewed while the site is used. It is kept in this browser and sent with every
// request to the Worker, so officers stay signed in between visits; changes and
// officer-only pages need it. Every page's own login code keeps working as is:
// this only watches the requests to the Worker.
(function signInPass() {
	var SESSION_KEY = 'ccc_session';
	var SESSION_EMAIL_KEY = 'ccc_session_email';
	var SESSION_EXPIRES_KEY = 'ccc_session_expires';
	var LOGIN_KEYS = ['ccc_portal_google_auth', 'ccc_portal_google_email', 'ccc_portal_role', 'ccc_portal_member'];
	var PAGE_EMAIL_KEY = 'ccc_portal_google_email';
	var DAYS_30 = 30 * 24 * 3600 * 1000;

	function get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
	function set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
	function clearPass() { set(SESSION_KEY, ''); set(SESSION_EMAIL_KEY, ''); set(SESSION_EXPIRES_KEY, ''); }
	function clearLogin() { clearPass(); LOGIN_KEYS.forEach(function (k) { set(k, ''); }); }
	function passValid() {
		var exp = Date.parse(get(SESSION_EXPIRES_KEY));
		return !!get(SESSION_KEY) && !(exp && exp < Date.now());
	}

	// On every page load: signed in on the page but no (valid) pass → show as signed
	// out, so the next click on "Sign in" gets a pass (once after this change, then
	// only after 30 days without a visit). Signed out on the page → drop the pass.
	(function tidyUp() {
		var pageEmail = get(PAGE_EMAIL_KEY).toLowerCase();
		if (pageEmail && (!passValid() || get(SESSION_EMAIL_KEY).toLowerCase() !== pageEmail)) clearLogin();
		else if (!pageEmail && get(SESSION_KEY)) clearPass();
	})();

	// "Log out" on a page removes its e-mail key: once it was there during this
	// visit and is gone, the pass is dropped too. (While signing in the page asks
	// the Worker first and only then stores its e-mail, so a missing key alone
	// must not drop the pass.)
	var seenPageEmail = !!get(PAGE_EMAIL_KEY);

	var workerBase = String(window.CLOUDFLARE_WORKER_URL || '').replace(/\/+$/, '');
	if (!workerBase || typeof window.fetch !== 'function') return;
	var nativeFetch = window.fetch.bind(window);
	var noticeShown = false;

	function showSignInNotice(message) {
		if (noticeShown) return;
		noticeShown = true;
		var show = function () {
			var box = document.createElement('div');
			box.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:100000;'
				+ 'background:#232526;color:#f3f3f3;border:1px solid #ffb300;border-radius:10px;padding:12px 16px;'
				+ 'font:14px Roboto,Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.4);max-width:90vw;text-align:center;';
			box.textContent = message + ' ';
			var btn = document.createElement('button');
			btn.textContent = 'OK';
			btn.style.cssText = 'margin-left:10px;background:#ffb300;color:#232526;border:0;border-radius:6px;padding:4px 12px;font-weight:600;cursor:pointer;';
			btn.onclick = function () { location.reload(); };
			box.appendChild(btn);
			document.body.appendChild(box);
		};
		if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
	}

	window.fetch = function (input, init) {
		var url = typeof input === 'string' ? input : (input && input.url) || '';
		if (String(url).replace(/\/+$/, '').indexOf(workerBase) !== 0) return nativeFetch(input, init);

		init = init ? Object.assign({}, init) : {};
		var headers = new Headers(init.headers || (typeof input !== 'string' && input && input.headers) || {});
		var isLogin = false;
		try {
			var body = typeof init.body === 'string' ? JSON.parse(init.body) : null;
			isLogin = !!(body && body.idToken && !body.action);
		} catch (e) {}
		if (get(PAGE_EMAIL_KEY)) seenPageEmail = true;
		else if (seenPageEmail && !isLogin) { clearPass(); seenPageEmail = false; }   // the page logged out
		if (!isLogin && passValid()) headers.set('X-CCC-Session', get(SESSION_KEY));
		init.headers = headers;

		return nativeFetch(input, init).then(function (res) {
			var renewed = res.headers.get('X-CCC-Session-Renew');
			if (renewed && get(SESSION_KEY)) {
				set(SESSION_KEY, renewed);
				set(SESSION_EXPIRES_KEY, new Date(Date.now() + DAYS_30).toISOString());
			}
			if (isLogin || res.status === 401) {
				return res.clone().json().then(function (data) {
					if (isLogin && data && data.success && data.session) {
						set(SESSION_KEY, data.session);
						set(SESSION_EMAIL_KEY, String(data.email || '').toLowerCase());
						set(SESSION_EXPIRES_KEY, data.sessionExpires || new Date(Date.now() + DAYS_30).toISOString());
					} else if (!isLogin && data && data.authRequired) {
						clearLogin();
						showSignInNotice('Your sign-in has expired. Please sign in again.');
					}
					return res;
				}, function () { return res; });
			}
			return res;
		});
	};
})();

// Phone and tablet menu layout, the same on every page.
(function enforceMenuLayout() {
	// Tablets: wider than a phone (the pages' own phone layout stops at 800px), up to 1024px,
	// or any touch screen up to 1400px wide (a tablet held sideways)
	const TABLET = '(min-width: 801px) and (max-width: 1024px), (min-width: 801px) and (max-width: 1400px) and (pointer: coarse)';
	const css = [
		// Phone menu: the same text size and spacing as the Legends / Masters menu
		// (the pages' own rules use 18px text with 18px 24px padding)
		'@media (max-width: 800px) { .tab-buttons .tab-btn { font-size: 14.4px !important; padding: 10px 12px !important; } }',
		// Tablets (801–1024px, or a touch screen up to 1400px, e.g. a tablet held sideways): the
		// pages switch to the phone menu only up to 800px, so give tablets the same ☰ menu here
		// (instead of the tall desktop bar with the title, which stayed stuck over the page)
		'@media ' + TABLET + ' {'
			+ ' .tab-nav .hamburger { display: flex !important; }'
			+ ' .tab-nav .tab-buttons { display: none !important; flex-direction: column !important; background: #232526 !important; }'
			+ ' .tab-nav .tab-buttons.open { display: flex !important; }'
			+ ' .tab-nav .tab-btn { display: flex !important; align-items: center !important; justify-content: flex-start !important; border-bottom: 1px solid #444 !important; font-size: 14.4px !important; padding: 10px 12px !important; height: auto !important; }'
			+ ' .tab-nav .tab-btn:last-child { border-bottom: none !important; }'
			+ ' .tab-nav .tab-label.mobile-only { display: inline !important; }'
			+ ' .tab-nav .tab-icon.desktop-only { display: none !important; }'
			+ ' .tab-nav .tab-btn[title]:hover::after { display: none !important; }'
			+ ' }',
		// Desktop (everything wider than the phone and tablet menus): the page name next to its
		// icon, as on the Legends / Masters sites (the pages' own rules show 40px icons only)
		'@media (min-width: 1025px) and (pointer: fine), (min-width: 1401px) {'
			+ ' .tab-nav .tab-nav-container { max-width: 1760px !important; }'
			+ ' .tab-nav .tab-buttons { height: auto !important; padding: 6px 0; gap: 2px !important; flex-wrap: wrap; overflow: visible !important; }'
			+ ' .tab-nav .tab-btn { display: inline-flex !important; align-items: center !important; gap: 5px; font-size: 14px !important; padding: 10px 8px !important; }'
			+ ' .tab-nav .tab-btn .tab-icon.desktop-only { display: inline-block !important; height: 20px !important; width: auto !important; margin: 0 !important; }'
			+ ' .tab-nav .tab-label.mobile-only { display: inline !important; }'
			+ ' .tab-nav .tab-btn[title]:hover::after { display: none !important; }'
			+ ' }',
		// ... and up to 1700px only the logo of the clan name, and no signed-in e-mail next to Logout,
		// so the menu stays on one line
		'@media (min-width: 1025px) and (max-width: 1700px) and (pointer: fine) { .tab-nav .nav-brand { font-size: 0 !important; margin-right: 12px !important; } .tab-nav .login-bar .user-email { display: none !important; } }',
		// Phones (≤ 800px) and tablets: one thin bar at the very top, as on the Legends / Masters sites —
		// ☰ on the left, the e-mail and Logout on the right, the menu as a full list below it.
		'@media (max-width: 800px), ' + TABLET + ' {'
			+ ' body { padding-top: max(52px, calc(env(safe-area-inset-top) + 52px)) !important; padding-bottom: max(70px, calc(env(safe-area-inset-bottom) + 70px)) !important; }'
			+ ' .tab-nav { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; z-index: 9999 !important; padding-top: env(safe-area-inset-top); max-height: 100vh; overflow-y: auto; }'
			+ ' .tab-nav-container { max-width: 100% !important; width: 100% !important; box-sizing: border-box !important; flex-wrap: wrap !important; align-items: center !important; padding: 2px 8px !important; min-height: 48px; }'
			+ ' .nav-brand { display: none !important; }'
			+ ' .hamburger { order: 0 !important; padding: 8px 8px 8px 0 !important; }'
			+ ' .login-bar { order: 1 !important; flex: 1 1 auto !important; justify-content: flex-end !important; margin-left: auto !important; padding: 4px 0 !important; gap: 6px !important; min-width: 0; }'
			+ ' .login-bar .user-email { max-width: 55vw !important; }'
			+ ' .tab-buttons { position: static !important; top: auto !important; order: 10 !important; flex: 0 0 100% !important; width: 100% !important; height: auto !important; align-items: stretch !important; max-height: none !important; overflow: visible !important; border-radius: 0 !important; box-shadow: none !important; border-top: 1px solid #444; }'
			+ ' }',
	].join('\n');

	const injectStyle = function () {
		if (document.getElementById('global-menu-layout-style')) return;
		const style = document.createElement('style');
		style.id = 'global-menu-layout-style';
		style.textContent = css;
		document.head.appendChild(style);
	};

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectStyle);
	else injectStyle();
})();

// Staging marker: a small fixed label on every page, so the staging copy is
// never mistaken for the live site. Bottom-left.
(function stagingBadge() {
	if (!window.IS_STAGING_SITE) return;
	const add = function () {
		if (document.getElementById('staging-site-badge')) return;
		const badge = document.createElement('div');
		badge.id = 'staging-site-badge';
		badge.textContent = 'STAGING \u2014 test copy';
		badge.title = 'Test copy of the site on the staging database. Changes made here only go to the staging database, not to the live site.';
		badge.style.cssText = [
			'position:fixed', 'left:8px', 'bottom:8px', 'z-index:2147483647',
			'background:#c62828', 'color:#fff', 'font:700 12px/1.2 Arial,sans-serif',
			'padding:6px 10px', 'border-radius:6px', 'box-shadow:0 2px 6px rgba(0,0,0,.35)',
			'letter-spacing:.5px', 'pointer-events:auto', 'opacity:.92'
		].join(';');
		document.body.appendChild(badge);
	};
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add);
	else add();
})();
