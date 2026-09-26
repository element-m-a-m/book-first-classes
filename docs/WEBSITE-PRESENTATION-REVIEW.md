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
