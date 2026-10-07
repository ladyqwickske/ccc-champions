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

// Global Google Translate hardening: keep widget bottom-only and suppress top banner/page shift.
(function enforceTranslateLayout() {
	const css = [
		'html, body { margin-top: 0 !important; top: 0 !important; }',
		'body.translated-ltr, body.translated-rtl { margin-top: 0 !important; top: 0 !important; }',
		'.goog-te-banner-frame, iframe.goog-te-banner-frame, .goog-te-banner-frame.skiptranslate { display: none !important; visibility: hidden !important; height: 0 !important; }',
		// Google's current top bar (an iframe in a .skiptranslate block straight inside
		// <body>), which covered the menu on phones; the language menu is left alone
		'iframe.VIpgJd-ZVi9od-ORHb-OEVmcd, body > .skiptranslate:has(> iframe.VIpgJd-ZVi9od-ORHb-OEVmcd) { display: none !important; visibility: hidden !important; height: 0 !important; }',
		'.VIpgJd-ZVi9od-aZ2wEe-wOHMyf { display: none !important; visibility: hidden !important; }',
		// "↺ Original" (in place of the hidden bar): only while the page is translated
		'#translateResetBtn { position: fixed; right: 8px; bottom: 52px; z-index: 7001; display: none; align-items: center; height: 34px; padding: 0 10px;'
			+ ' border: 1px solid #444; border-radius: 8px; background: #232526; color: #ffb300; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.25); }',
		'html.translated-ltr #translateResetBtn, html.translated-rtl #translateResetBtn { display: inline-flex; }',
		'#goog-gt-tt, .goog-te-balloon-frame { display: none !important; visibility: hidden !important; }',
		'.goog-text-highlight { background: transparent !important; box-shadow: none !important; }',
		'#google_translate_element, #translateToggleBtn { top: auto !important; right: 8px !important; bottom: 8px !important; }',
		'@media (max-width: 800px) { body { padding-top: max(56px, calc(env(safe-area-inset-top) + 56px)) !important; padding-bottom: max(84px, calc(env(safe-area-inset-bottom) + 84px)) !important; } .tab-nav { top: max(56px, calc(env(safe-area-inset-top) + 56px)) !important; } }'
	].join('\n');

	const injectStyle = function () {
		if (document.getElementById('global-translate-hardening-style')) return;
		const style = document.createElement('style');
		style.id = 'global-translate-hardening-style';
		style.textContent = css;
		document.head.appendChild(style);
	};

	// Back to English now that Google's top bar is hidden: Google keeps the chosen
	// language in the "googtrans" cookie (on this address and on its parent domain);
	// remove it and reload.
	const addResetButton = function () {
		if (!document.body || document.getElementById('translateResetBtn')) return;
		const btn = document.createElement('button');
		btn.id = 'translateResetBtn';
		btn.type = 'button';
		btn.className = 'notranslate';
		btn.title = 'Show the page in English again';
		btn.textContent = '\u21BA Original';
		btn.addEventListener('click', function () {
			const expired = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
			const host = location.hostname;
			const parts = host.split('.');
			document.cookie = expired;
			document.cookie = expired + '; domain=' + host;
			document.cookie = expired + '; domain=.' + host;
			if (parts.length > 2) document.cookie = expired + '; domain=.' + parts.slice(-2).join('.');
			location.reload();
		});
		document.body.appendChild(btn);
	};

	const normalizeTopOffset = function () {
		if (document.documentElement) document.documentElement.style.top = '0px';
		if (document.body) {
			document.body.style.top = '0px';
			document.body.style.marginTop = '0px';
			if (window.matchMedia('(max-width: 800px)').matches) {
				const topPad = 'max(56px, calc(env(safe-area-inset-top) + 56px))';
				const bottomPad = 'max(84px, calc(env(safe-area-inset-bottom) + 84px))';
				document.body.style.setProperty('padding-top', 'max(56px, calc(env(safe-area-inset-top) + 56px))', 'important');
				document.body.style.setProperty('padding-bottom', bottomPad, 'important');
				document.querySelectorAll('.tab-nav').forEach(function (el) {
					el.style.setProperty('top', topPad, 'important');
				});
			}
		}
		const banner = document.querySelector('iframe.goog-te-banner-frame, .goog-te-banner-frame.skiptranslate, .goog-te-banner-frame, iframe.VIpgJd-ZVi9od-ORHb-OEVmcd');
		if (banner) {
			banner.style.display = 'none';
			banner.style.visibility = 'hidden';
			banner.style.height = '0';
		}
		fixMenuFramePosition();
	};

	// The Google Translate language dropdown (.goog-te-menu-frame) computes its own
	// position/height assuming a normally-flowed anchor. Our widget uses position:fixed,
	// so on some browsers the frame ends up clipped/off-screen with no way to scroll to
	// the remaining languages. Force it to a viewport-anchored, capped, scrollable box.
	const fixMenuFramePosition = function () {
		const frame = document.querySelector('iframe.goog-te-menu-frame');
		const anchor = document.getElementById('google_translate_element');
		if (!frame || !anchor) return;
		const rect = anchor.getBoundingClientRect();
		const margin = 8;
		const maxHeight = Math.max(120, rect.top - margin * 2);
		const maxWidth = Math.min(320, window.innerWidth - margin * 2);
		frame.style.setProperty('position', 'fixed', 'important');
		frame.style.setProperty('top', 'auto', 'important');
		frame.style.setProperty('bottom', (window.innerHeight - rect.top + margin) + 'px', 'important');
		frame.style.setProperty('left', 'auto', 'important');
		frame.style.setProperty('right', margin + 'px', 'important');
		frame.style.setProperty('max-height', maxHeight + 'px', 'important');
		frame.style.setProperty('max-width', maxWidth + 'px', 'important');
		frame.style.setProperty('overflow-y', 'auto', 'important');
		frame.style.setProperty('overflow-x', 'hidden', 'important');
	};

	const startObserver = function () {
		if (!document.body || window.__translateLayoutObserverStarted) return;
		window.__translateLayoutObserverStarted = true;
		const observer = new MutationObserver(normalizeTopOffset);
		observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
		normalizeTopOffset();
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () {
			injectStyle();
			addResetButton();
			startObserver();
			window.addEventListener('resize', normalizeTopOffset);
		});
	} else {
		injectStyle();
		addResetButton();
		startObserver();
		window.addEventListener('resize', normalizeTopOffset);
	}
})();

// Staging marker: a small fixed label on every page, so the staging copy is
// never mistaken for the live site. Bottom-left, clear of the translate widget.
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
