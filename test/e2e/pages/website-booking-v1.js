/* Verbatim copy of element-website site/assets/js/booking.js (branch codex/element-website-2026-09-22-23-23, read 26-Sep-2026)
   used only to prove the v1 embed contract still works with the v2 widget. Do not edit here. */
/* Progressive same-origin booking embed with visible recovery. */
(function () {
  'use strict';
  document.querySelectorAll('.booking-widget').forEach(function (widget) {
    var frame = widget.querySelector('iframe');
    var status = widget.querySelector('.booking-widget__status');
    var heading = status.querySelector('strong');
    var detail = status.querySelector('p');
    var retry = widget.querySelector('.booking-widget__retry');
    var timer;
    var started = false;
    var observer;
    function fail() {
      clearTimeout(timer);
      widget.dataset.state = 'failed';
      frame.style.height = '0px';
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('tabindex', '-1');
      status.hidden = false;
      heading.textContent = 'ההרשמה לא נטענה כרגע';
      detail.textContent = 'אפשר לנסות שוב, לפתוח את ההרשמה בחלון נפרד או לדבר איתנו בוואטסאפ.';
      retry.hidden = false;
    }
    function start() {
      started = true;
      if (observer) observer.disconnect();
      clearTimeout(timer);
      widget.dataset.state = 'loading';
      frame.style.height = '0px';
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('tabindex', '-1');
      status.hidden = false;
      retry.hidden = true;
      heading.textContent = 'מכינים לכם מקום באימון';
      detail.textContent = 'טוענים את ההרשמה לשיעורי ההיכרות…';
      var url = new URL(frame.dataset.src, location.origin);
      var campaign = new URLSearchParams(location.search).get('utm_source');
      if (campaign) url.searchParams.set('utm_source', campaign);
      url.searchParams.set('attempt', String(Date.now()));
      timer = setTimeout(fail, 8000);
      frame.src = url.href;
    }
    window.addEventListener('message', function (event) {
      if (!started || event.origin !== location.origin || event.source !== frame.contentWindow) return;
      var data = event.data;
      if (!data || data.version !== 1) return;
      if (data.type === 'element:booking:error') { fail(); return; }
      if (data.type !== 'element:booking:ready' && data.type !== 'element:booking:resize') return;
      if (!Number.isFinite(data.height) || data.height < 100 || data.height > 5000) return;
      clearTimeout(timer);
      frame.style.height = Math.ceil(data.height) + 'px';
      frame.removeAttribute('aria-hidden');
      frame.removeAttribute('tabindex');
      widget.dataset.state = 'ready';
      status.hidden = true;
      retry.hidden = true;
    });
    retry.addEventListener('click', start);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; }) && !started) start();
      }, { rootMargin: '600px' });
      observer.observe(widget);
    } else start();
  });
})();
