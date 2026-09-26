/* Progressive same-origin booking embed, contract v2, with visible recovery. */
(function () {
  'use strict';
  var NS = 'element:booking';
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  document.querySelectorAll('.booking-widget').forEach(function (widget) {
    var frame = widget.querySelector('iframe');
    var status = widget.querySelector('.booking-widget__status');
    var heading = status.querySelector('strong');
    var detail = status.querySelector('p');
    var retry = widget.querySelector('.booking-widget__retry');
    var timer, observer, started = false, ready = false, exitSent = false;
    function post(msg) { if (ready) frame.contentWindow.postMessage(Object.assign({ ns: NS, v: 2 }, msg), location.origin); }
    function fail() {
      clearTimeout(timer); ready = false;
      widget.dataset.state = 'failed';
      frame.style.height = '0px'; frame.setAttribute('aria-hidden', 'true'); frame.setAttribute('tabindex', '-1');
      status.hidden = false; retry.hidden = false;
      heading.textContent = 'ההרשמה לא נטענה כרגע';
      detail.textContent = 'אפשר לנסות שוב, לפתוח את ההרשמה בחלון נפרד או לדבר איתנו בוואטסאפ.';
    }
    function start() {
      started = true; ready = false;
      if (observer) observer.disconnect();
      clearTimeout(timer);
      widget.dataset.state = 'loading';
      frame.style.height = '0px'; frame.setAttribute('aria-hidden', 'true'); frame.setAttribute('tabindex', '-1');
      status.hidden = false; retry.hidden = true;
      heading.textContent = 'מכינים לכם מקום באימון';
      detail.textContent = 'טוענים את ההרשמה לשיעורי ההיכרות…';
      var url = new URL(frame.dataset.src, location.origin);
      var page = new URLSearchParams(location.search);
      url.searchParams.set('embed', '1');
      UTM.forEach(function (k) { var v = page.get(k); if (v) url.searchParams.set(k, v); });
      var chosen = document.querySelector('[data-offer-select][aria-pressed="true"][data-offer]');
      if (chosen) url.searchParams.set('offer', chosen.dataset.offer);
      url.searchParams.set('attempt', String(Date.now()));
      timer = setTimeout(fail, 8000);
      frame.src = url.href;
    }
    window.addEventListener('message', function (e) {
      if (!started || e.origin !== location.origin || e.source !== frame.contentWindow) return;
      var d = e.data;
      if (!d || d.ns !== NS || d.v !== 2) return;
      if (d.type === 'error') { fail(); return; }
      if (d.type === 'ready' || d.type === 'resize') {
        if (!Number.isFinite(d.height) || d.height < 100 || d.height > 5000) return;
        clearTimeout(timer);
        frame.style.height = Math.ceil(d.height) + 'px';
        if (!ready) {
          ready = true;
          frame.removeAttribute('aria-hidden'); frame.removeAttribute('tabindex');
          widget.dataset.state = 'ready'; status.hidden = true; retry.hidden = true;
        }
      }
      if (d.type === 'step' && frame.getBoundingClientRect().top < 0) frame.scrollIntoView({ block: 'start' });
      if (d.type === 'complete' && window.dataLayer) window.dataLayer.push({ event: 'booking_complete', outcome: d.outcome });
    });
    // The carousel's choice goes to the widget until the visitor starts choosing there (the widget ignores it after).
    document.querySelectorAll('[data-offer-select][data-offer]').forEach(function (b) {
      b.addEventListener('click', function () { post({ type: 'setContext', offer: b.dataset.offer }); });
    });
    // Exit intent (desktop): the widget cannot see it from inside the iframe.
    document.addEventListener('mouseleave', function (e) {
      if (e.clientY <= 0 && ready && !exitSent) { exitSent = true; post({ type: 'exitIntent' }); }
    });
    retry.addEventListener('click', start);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (x) { return x.isIntersecting; }) && !started) start();
      }, { rootMargin: '600px' });
      observer.observe(widget);
    } else start();
  });
})();
