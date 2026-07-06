// Cloudflare Worker (public, CORS-friendly)
window.CLOUDFLARE_WORKER_URL = 'https://ccc-l1.lady-qwickske.workers.dev/';

// Frontend should call the worker to avoid GAS CORS restrictions.
window.GAS_WEB_APP_URL = window.CLOUDFLARE_WORKER_URL;

// Global Google Translate hardening: keep widget bottom-only and suppress top banner/page shift.
(function enforceTranslateLayout() {
	const css = [
		'html, body { margin-top: 0 !important; top: 0 !important; }',
		'body.translated-ltr, body.translated-rtl { margin-top: 0 !important; top: 0 !important; }',
		'.goog-te-banner-frame, iframe.goog-te-banner-frame, .goog-te-banner-frame.skiptranslate { display: none !important; visibility: hidden !important; height: 0 !important; }',
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
		const banner = document.querySelector('iframe.goog-te-banner-frame, .goog-te-banner-frame.skiptranslate, .goog-te-banner-frame');
		if (banner) {
			banner.style.display = 'none';
			banner.style.visibility = 'hidden';
			banner.style.height = '0';
		}
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
			startObserver();
			window.addEventListener('resize', normalizeTopOffset);
		});
	} else {
		injectStyle();
		startObserver();
		window.addEventListener('resize', normalizeTopOffset);
	}
})();
