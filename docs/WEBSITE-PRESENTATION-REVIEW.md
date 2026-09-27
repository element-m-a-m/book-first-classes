# Website-driven widget presentation review — 26 Sep 2026

Owner authorized separate worktree, based on main 3719a6a; branch codex/widget-presentation-2026-09-26. Source changes only; no releases/root artifacts changed. Existing node_modules reused through a junction; no dependency changes.

Changes:
- Offer screen: remove original-price comparison row; red approximately 49% average discount next to 99, computed from the existing 180/210 comparison prices. Keep new-joiner benefit; remove validity/group-only microcopy from this screen only. Actual offer eligibility, expiry, calendar and payment links unchanged.
- Group cards: no repeated package prices. Keep coaches for informed selection. Add matching address heading and compact, stable address before expanding choices. 250ms reveal respects reduced motion; iframe ResizeObserver unchanged.
- Medical detail label: remove optional qualifier; validation unchanged.
- Private selection: format first, services second; remove individual-only prices from service cards. One reactive summary retains 250/300 individual and 360 duo rates, correct durations and series rates. No new format, price or backend enum introduced.

Pending owner clarification: whether two people is simply the existing duo, and whether small groups should be an inquiry with price by quote. Do not invent a small-group price or extend automation enums without contract tests. Teacher removal was discussed, not requested as a definite change; retained in draft.

Tests: 17 unit checks; 51 browser tests across journeys, payloads, iframe contracts, accessibility and new presentation behavior passed (50 initial + 1 corrected assertion rerun). Final compact-address adjustment: all 9 presentation/accessibility tests passed again, 320/360/390/768/1280 widths. Network effects intercepted. Fixed stale embed test version constant and moved package-price assertion to dates screen, where it remains displayed.

Review build: node scripts/build.mjs v2. Version remains 2.0.1 during local development; this is NOT a new published release. Before release, coordinate latest main/other sessions, bump version through normal release process, generate and commit exact release bytes, verify manifest, then sync website. Do not overwrite releases/v2.0.1 or website site/booking with a draft.

Backend handoff is separate: v14 b6e5659 reported LIVE and exact source inspected, contact_inquiry response compatible. Website function deployment and approved Auth=server live verification remain pending. Keep auth log mode; ask owner before deployment/live tests/enforce.

## Owner follow-up
Replaced the sale badge with the exact requested `49% הנחה!` and removed the separate red average-discount line. Private format cards share a compact grid, descriptions span the full width, text unchanged. Equal heights verified at 320/390/475/1280px, no overflow. At 390px: 114.16 to 86.69px. Both presentation checks pass. Local draft only.

## Focused screens, motion and floating help — owner follow-up
- Removed the offer-screen introduction exactly as requested.
- Removed the full address/heading from Group. Dates shows a compact street/city line; Summary keeps the full address.
- Step transitions 420ms, group reveal 460ms, selected-card feedback 420ms; no input delays, reduced-motion override preserved.
- Idle help now floats outside normal flow in both embed and standalone. Keeps existing 60s inactivity timing, once per journey, existing WhatsApp action and Continue dismissal. Added accessible X and Escape. Does not steal focus; restores focus on dismissal when appropriate; existing input/selection preserved. Tracks the visible portion of same-origin parent iframe through scroll/resize/visual viewport events; uses IntersectionObserver fallback for other embeddings. When too little of the iframe is visible, waits rather than expanding the frame or showing a clipped panel. Exit-intent presentation unchanged.
- No payload, pricing, backend or published-release changes. Review build remains on :8853.
- 48 behavior/contract/journey checks passed (47 initial, 1 sizing assertion updated to actual content and rerun). Includes overlay height and heading-position stability, entered-name preservation, X/Escape, host scrolling, reduced motion, and axe with help open in standalone/iframe. Screenshots: focused-groups, floating-help, dates-location at 390 and 1280px.

Motion QA refinement: replaced text-opacity fades and calendar color interpolation with translation/scale to maintain contrast throughout transitions, not just at rest.

Final accessibility pass: all 7 viewport/embedded audits passed, covering every screen at 320/360/390/768/1280px. Together with the 48 behavior/contract checks, 55 browser checks passed. No production submission.

## Address placement and six browser comments — 26 September 2026
- Website address is a separate compact band before booking (after reviews on home), full school/address wording with a map link beside the heading, no diagonal arrow. Footer has a clear כתובת והגעה heading. Removed repetitive booking intro labels; preserved the private callback explanation in the shared build transform. Standalone widget shows full address before its steps; embedded widget relies on website placement; Dates has no repeated short address and final Summary retains full location.
- Owner tried sage, then approved the header-dark background with cream text and gold link. Latest feedback requests alternatives: location-color-options.html/png compares warm sand (recommended), muted olive, and deep teal in actual mobile screenshots. These are proposals; the current dark background remains unchanged pending choice.
- Mobile paragraph-to-widget gap consolidated to 12px, measured at 320/390/475px. No horizontal overflow at these widths or 1440px.
- Single-class prices: 60 on the right, 70 on the left, both 28px matching 99; corresponding audience labels on the following row. First-screen helper removed; stepper shows only שלב 1 מתוך 5 (or 3 for private) on the offer screen.
- Choice cards can be cleared by a second pointer click or Space. Native radio exclusivity/arrow navigation retained. Offer clearing resets dependent selections, audience/group clearing removes stale dates, private price summary and Continue require both format and goal. Medical choices can return to unanswered, still requiring an explicit answer before submission; entered text is preserved. Navigation/submission buttons remain actions, not toggles.
- Validation: 59 browser checks passed (including new pointer/keyboard deselection and dependency tests, complete group/private journeys, iframe contracts, mocks, help overlay, and axe checks); 17 unit checks passed. Visual evidence: refined-offers-390/475/1440.png and location-color-options.png.
- Local review only on :8853. No new release/tag, push, deployment, production lead, or Apps Script change. Website site/booking remains manifest-verified v2.0.1.


## Summary layout and action hierarchy — 26 September follow-up
- Selected dates now use aligned day/date/time columns, with hours at the left edge and no list bullets or dot separator. Container queries provide a deliberate two-line fallback below 16rem of row width; wider rows have increased gaps. Date/time values and backend serialization unchanged.
- Summary address now uses the existing compact two-row representation: venue, then street/neighborhood/city with natural wrapping.
- Booking remains gold; summary WhatsApp callback uses a transparent green outline. Callback handler, payload and destination unchanged.
- Timed help cannot open or remain visible on summary; it remains available on intermediate steps. Exit-intent logic is unchanged.
- Website-owned duplicate WhatsApp link removed from all ten booking sections. The bottom strip is hidden when the iframe is ready; separate-window fallback remains available for failed/loading states.
- Actual :8853 website summary visually checked at 383/1280px. All three date columns remain on one line at 383px. Local only, no release, push, deployment, backend edits or real leads.

Validation completion: 42 of 43 widget behavior/journey checks passed initially; shorter summary exposed a double-click fall-through into booking. Summary actions now ignore the second click of a double-click (keyboard activation remains supported). The failing deduplication/resubmit check passes after that guard. Two actual website iframe layout checks pass at 383/1280px, and website gates all pass. Initial default-port test run hit another checkout; discarded those results and used isolated review config on :4185. No changes to the other checkout/server.


### Payment-first completion page — 26 September 2026
Removed the repeated final-placement confirmation note from Done only; it remains on Summary. Moved the payment preparation/progress/link panel above OrderCard. Link destination, readiness timer, event handlers, calendar and callback completion unchanged. Verified actual website iframe at 383/1280px with mocked submissions, immediate and ready payment links both present, payment panel above dates, no horizontal overflow. Both checks passed and screenshots inspected. Local draft only; no published-release, backend or deployment changes.


### Remove intermediate selection ribbon — 26 September 2026
Removed eb-bar from the date and contact steps at owner request, including the redundant selection/price/change ribbon and unused CSS/imports. Back navigation and final summary remain. Isolated preview rebuilt on :8853; five v2 iframe/flow contract tests passed with mocked requests. No canonical release, backend or deployment changes.


### Compact navigation and calendar actions — 26 September 2026
Moved Back to the right of the shared stepper row and centered the numeric step counter. Removed visible step-name suffixes; meaningful step headings and screen-reader announcements remain. Back uses the existing ordered group/private steps and preserves selections; callback completion keeps its existing separate Back control because it has no stepper. Removed the redundant instruction above the calendar; selection-count guidance below remains. Coordinate-later now uses a transparent neutral outlined button, smaller/lighter than primary Continue, with its original skipDates handler and wording.
Validation: three group/private/back/double-submit regression checks passed; skip-dates payload check passed. Actual :8853 iframe checked at 320/383/1280px for centered label, non-overlapping Back, 44px target, keyboard activation and selection preservation. Screenshots inspected at mobile/desktop. Local isolated worktree only; no release, backend, push or deployment.


### Visual progress with two-way navigation — 26 September 2026
Replaced the visible numeric counter with progress segments centered in the same 44px row as Back (right) and outlined Forward (left). Accessible step count remains on the progress group. Forward mirrors offer/group/date/private-goal eligibility; contact uses the existing validation/submitContact handler with an explicit summary label. Summary and private final-send screens keep their explicit decision actions below instead of an ambiguous generic Forward. Bottom Continue remains available after reading content. Second-click guard prevents double-click step skipping. Removed the calendar WhatsApp consultation link per the next user comment.
Validation: 4 mocked group/private/validation/back/double-submit checks passed. Actual website iframe at 320/383/1280px passed 3 responsive centering/spacing/keyboard checks; screenshots visually inspected at mobile and desktop. Local review build :8853 only. No published release, backend, real lead, push or deployment changes.


### Merge summary and payment into one checkout — 26 September 2026
The final group screen now contains the direct existing payment link first, the outlined representative WhatsApp action beneath it, one OrderCard with aligned day/date/time columns, the compact full address, calendar download and one preparation disclosure. Removed the intermediate online-booking button, separate self-booking Done screen, synthetic 12-second readiness animation and repeated content. Back still permits editing. Callback confirmation and private flow are unchanged.
Payment intent and Pending_Payment_Gateway analytics now fire once per submission on actual link activation; entering the screen sends only the existing lead_started/checkout_reached events. Payment destinations, prices, payload shape, retries and callback payload are unchanged. Payment choice suppresses abandonment and exit prompts; edited submissions get fresh IDs. No payment-success claim is made.
Validation: 49 journey/embed/layout/navigation checks passed; 7 accessibility checks at 320/360/390/768/1280 and embedded widths passed; all 3 merged-checkout tests passed, including actual mocked target=_blank navigation, keyboard activation, child/adult single-class destinations, deduplication, fresh edited submission and post-payment abandonment/exit suppression. Actual website iframe checks passed at 383/1280px; screenshots inspected, with single-line aligned date rows at 383px. All external payment and webhook calls mocked. Review remains local on :8853; no release, backend, push, deployment or real payment/lead.


### Preferred payment styling and checkout copy — 26 September 2026
Applied owner comments: summary lead is now איך תרצו להמשיך?; payment title is הרשמה מהירה (תשלום אונליין); security line keeps only תשלום מאובטח ומוצפן. Preferred online card uses a warm sand tint, muted gold border and thin gold top accent, retaining the gold primary button. Summary address and pin are centered; other address placements unchanged.
Verified actual website iframe at 383/439/1280px (three passing layout checks), inspected 439px screenshot, and passed the existing mobile accessibility journey at 390px. Local preview rebuilt on :8853. No payment handlers, destinations, published release or backend changed.


### Quiet symmetrical top navigation — 27 September 2026
Matched Back and top Continue with equal target sizes, muted regular-weight text, transparent backgrounds and mirrored shared chevrons. Removed the forward gold border and filled hover treatment. Selecting a card enables navigation without changing it into an emphasized CTA; disabled state remains distinguishable. Progress stays centered and compact (maximum 14rem); bottom Continue remains the prominent gold action.
Validation: two existing group/private top-navigation checks passed; three actual website iframe checks passed at 320/383/1280px for centered progress, spacing, target size and keyboard Back with preserved selections. Inspected selected-date mobile screenshot. Isolated preview rebuilt on :8853; no release, payment, backend or deployment changes.


### Integrated into the canonical widget as 2.1.0 - 27 September 2026
This review (branch `codex/widget-presentation-2026-09-26` @ `f122b88`) was merged into the canonical checkout on branch `widget-presentation-sync-27-sep-2026`. This entry closes the log; the final source and `docs/EMBED-CONTRACT.md` §3 and §8 are the current state.
Four late commits were not described above: the security line now names the provider (`... דרך מערכת Boostapp`, 9b0149a, superseding "keeps only תשלום מאובטח ומוצפן"); the line `נפתח שיחת וואטסאפ עם הפרטים שמילאתם.` was removed (41bfa8b); new Movement and Strength descriptions without a trailing period (76b317a, f122b88).
Standalone decisions (Lior): address block on the standalone first screen only, directions via the Google Maps place link, a quiet WhatsApp link in the standalone brand bar, and "הזמנת שיעור נוסף" on the summary in both modes. Also added: middle-click on the payment link is the same payment intent, once per submission.
Two reviewed specs were stale against the reviewed UI and harness (visible step counter; legacy goldens without `payments`) and were aligned. Version bumped to 2.1.0; released through `scripts/release.mjs`, never under 2.0.1.
