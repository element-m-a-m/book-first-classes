// v1 module, sliced verbatim from legacy/app.jsx (L134-152). Behaviour must match the legacy build;
// the parity harness (test/e2e/parity.spec.js) proves it. Superseded by the v2 tree in S4.
import { Ico } from "./icons.jsx";

export function Tag({ type }) {
  if (type === "popular") return <span style={{ fontSize: 8, background: "#FFF3E0", color: "#E65100", padding: "1px 5px", borderRadius: 3, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 2 }}><Ico name="star" color="#F5A623" size={8}/> פופולרי</span>;
  if (type === "special") return <span style={{ fontSize: 8, background: "#FFF0F0", color: "#C4342D", padding: "1px 5px", borderRadius: 3, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 2 }}><Ico name="star" color="#C4342D" size={8}/> ייחודי</span>;
  return null;
}

export function Btn({ onClick, disabled, color, children, style: sx }) {
  return <button onClick={onClick} disabled={disabled} style={{
    padding: "12px 16px", borderRadius: 11, border: "none", width: "100%",
    background: disabled ? "#ccc" : ("linear-gradient(135deg," + color + "," + color + "DD)"),
    color: "#fff", fontSize: 14, fontWeight: 700, cursor: disabled ? "default" : "pointer",
    fontFamily: "inherit", boxShadow: disabled ? "none" : ("0 4px 14px " + color + "25"),
    opacity: disabled ? 0.6 : 1, transition: "all 0.2s", ...sx,
  }}>{children}</button>;
}

export function BackBtn({ onClick }) {
  return <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#888", fontSize: 11.5, cursor: "pointer", marginBottom: 12, padding: 8, margin: "-8px", fontFamily: "inherit" }}><Ico name="chevR" color="#aaa" size={12}/> חזרה</button>;
}
