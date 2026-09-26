// v1 module, sliced verbatim from legacy/app.jsx (L899-904). Behaviour must match the legacy build;
// the parity harness (test/e2e/parity.spec.js) proves it. Superseded by the v2 tree in S4.
import { createRoot } from "react-dom/client";
import { ElementBookingWidget } from "./Widget.jsx";

/* ═══════════════════════════════════════════
   MOUNT
   ═══════════════════════════════════════════ */
const container = document.getElementById('element-booking-widget-container');
const root = createRoot(container);
root.render(<ElementBookingWidget />);
