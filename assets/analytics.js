// Google Analytics 4. Put the property's measurement ID (it starts with G-) in GA_ID and every page starts reporting.
(function () {
  var GA_ID = '';
  var started = false;
  function gtag() { window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments); }
  function start(id) {
    if (started || !id) return; started = true;
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id); document.head.appendChild(s);
    gtag('js', new Date()); gtag('config', id, { page_title: document.title, page_location: location.href });
  }
  window.siteTrack = function (name, params) { if (!started) return; var p = params || {}; p.page = location.pathname.replace(/^\//, '') || 'index.html'; gtag('event', name, p); };
  window.siteAnalytics = { start: start };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var out = a.host !== location.host, file = /\.pdf$/i.test(a.pathname);
    if (out || file) window.siteTrack(out ? 'outbound_click' : 'file_download', { link_url: a.href, link_text: (a.textContent || '').trim().slice(0, 60) });
  }, true);
  var marks = {}; function depth() { var h = document.documentElement, d = (h.scrollTop + window.innerHeight) / h.scrollHeight; [50, 90].forEach(function (k) { if (d >= k / 100 && !marks[k]) { marks[k] = true; window.siteTrack('scroll_depth', { percent: k }); } }); }
  window.addEventListener('scroll', depth, { passive: true });
  start(GA_ID);
})();
