# Element booking widget - embed contract v2

One canonical widget, published as a pinned, hash-verified release. GitHub Pages serves it standalone at
`https://element-m-a-m.github.io/book-first-classes/`; the website serves a byte copy of the same release
same-origin at `/booking/`. Every URL inside a release is relative, so both locations work unchanged.

## 1. Release layout

```
releases/vX.Y.Z/
  index.html                 page shell (no inline app code)
  app.<hash>.js / .css       bundled app (React included, no CDN)
  assets/…                   fonts, logo (hashed names)
  manifest.json              { version, commit, embedContract, payloadSchema, files: { path: sha256 } }
```

A consumer copies the whole folder and verifies every file against `manifest.json` before publishing it.

## 2. URL parameters (all optional, whitelisted)

| Param | Values | Effect |
|---|---|---|
| `embed` | `1` | Embedded layout (also detected automatically inside an iframe) |
| `offer` | `trial3` · `single` · `private` | Preselects the offer; the journey starts at the next step and the offer stays changeable |
| `group` | `kids-6-8` `kids-9-11` `youth-12-15` `adults-16-37` `adults-38-58` `movement-class` `strength`, or aliases `youth` `adults` `forty` `movement` | Preselects a group (never skips the step). Ignored with `offer=private` |
| `utm_source` `utm_medium` `utm_campaign` `utm_term` `utm_content` | ≤100 chars, safe charset | Passed into the lead payload |

Anything else is ignored. Parameters never set a price, eligibility or availability.

## 3. Messages

Every message is an object `{ ns: 'element:booking', v: 2, type, … }`. None carries personal data.

**Widget → parent** (posted to the widget's own origin, plus the parent's origin when it is allowlisted):

| type | fields | when |
|---|---|---|
| `ready` | `height`, `version` | first render with a real height |
| `resize` | `height` | content height changed |
| `step` | `step`, `index`, `total`, `path` (`group`/`private`) | every step change |
| `complete` | `outcome` (`selfbook` · `callback` · `private`) | the visitor finished a path |
| `error` | `code` (`render`) | the app failed to start - show the fallback |
| `contextIgnored` | `reason` | a `setContext` arrived after the visitor started choosing |

**Parent → widget** (accepted only from `window.parent`, from an allowlisted origin):

| type | fields | effect |
|---|---|---|
| `init` / `setContext` | `offer?`, `group?` | Same as the URL params, applied only before the visitor interacts |
| `exitIntent` | - | Shows the WhatsApp prompt inline, once (iframe `mouseleave` is unreliable, so the parent detects it) |

Allowlisted parent origins: the widget's own origin, `https://element-m-a-m.co.il`, `https://www.element-m-a-m.co.il`,
`https://element-website.pages.dev` and its preview subdomains.

**Legacy v1 (kept until the website runs v2 for two weeks, removed in 2.1):** the widget also posts
`{ type: 'element:booking:ready' | 'element:booking:resize' | 'element:booking:error', version: 1, height }` to its own
origin, exactly as `site/booking/bridge.js` did, so the current website `booking.js` keeps working unchanged.

## 4. Height, focus and scrolling

The widget measures its root with `ResizeObserver` (rAF-throttled) and reports `ready`/`resize`; the parent sets the
iframe height. There is no internal scroll. On each step the widget moves focus to the step heading with
`preventScroll`; the parent should scroll the iframe's top into view when it is above the viewport (on `step`).

## 5. Example embed

```html
<div class="booking-widget" data-state="idle" data-src="/booking/index.html">
  <div class="booking-widget__status" role="status" aria-live="polite">…loading / fallback copy…</div>
  <iframe title="הרשמה לשיעורי היכרות - אלמנט" loading="lazy"
    sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"></iframe>
  <a class="booking-widget__fallback" href="https://element-m-a-m.github.io/book-first-classes/" target="_blank" rel="noopener">פתיחת ההרשמה ↗</a>
</div>
```

```js
// Parent side (sketch). Same-origin copy, so e.origin === location.origin.
const NS = 'element:booking';
window.addEventListener('message', (e) => {
  if (e.source !== frame.contentWindow || e.origin !== location.origin) return;
  const d = e.data;
  if (!d || d.ns !== NS || d.v !== 2) return;
  if ((d.type === 'ready' || d.type === 'resize') && d.height >= 100 && d.height <= 5000) frame.style.height = Math.ceil(d.height) + 'px';
  if (d.type === 'ready') markReady();
  if (d.type === 'step' && frame.getBoundingClientRect().top < 0) frame.scrollIntoView({ block: 'start' });
  if (d.type === 'error') showFallback();
});
// The offer carousel can hand its choice to the widget before the visitor starts:
frame.contentWindow.postMessage({ ns: NS, v: 2, type: 'setContext', offer: 'trial3' }, location.origin);
// Exit intent (desktop), forwarded once:
document.addEventListener('mouseleave', (e) => { if (e.clientY <= 0) frame.contentWindow.postMessage({ ns: NS, v: 2, type: 'exitIntent' }, location.origin); }, { once: true });
```

## 6. Lead payload (schema 2, backward compatible)

Unchanged legacy fields: `event, name, phone (raw), audience, categoryId, categoryLabel, branchTitle, packageLabel,
price, dates (ISO instant of Jerusalem midnight, now sorted), classTime (earliest picked slot), medical, pvMsg, device,
utm (= utm_source)`. Added: `schema: 2, widgetVersion, source (embed|standalone), host, submissionId, offerId,
phoneE164, datesLocal[], slots[{date,start,end,startIso,endIso}], datesSkipped, privateFormat, privateFormatLabel,
utm_*`. Events: `lead_started` and `checkout_reached` (on the contact step, in order), `booking_selfbook`,
`booking_callback`, `abandoned_checkout` (90 s on the summary), `private_inquiry`. Apps Script v10 renders the new
fields; v9 ignores them.

## 7. Local development

On `localhost`/`127.0.0.1` the widget never calls the production webhook: payloads go to `window.__ebDryRun`.
Tests opt in with `window.__EB_ALLOW_WEBHOOK__ = true` and intercept every request.
