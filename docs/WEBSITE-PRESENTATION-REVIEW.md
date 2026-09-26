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
