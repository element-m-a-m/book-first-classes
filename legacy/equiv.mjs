// Strict "equal up to minifier renaming" check between two minified scripts.
// Every non-identifier byte must match; identifier tokens may differ only when BOTH are short
// minifier names (<=3 chars) and the pairing is a consistent bijection across the whole file.
export function equivalent(a, b) {
  const tok = s => s.match(/[A-Za-z_$][\w$]*|[^A-Za-z_$]+/g) || [];
  const A = tok(a), B = tok(b);
  if (A.length !== B.length) return { ok: false, why: `token count ${A.length} vs ${B.length}` };
  const ab = new Map(), ba = new Map(); let renamed = 0;
  for (let i = 0; i < A.length; i++) {
    const x = A[i], y = B[i], isId = /^[A-Za-z_$]/.test(x);
    if (!isId || !/^[A-Za-z_$]/.test(y)) { if (x !== y) return { ok: false, why: `text differs at token ${i}: ${JSON.stringify(x.slice(0, 40))} vs ${JSON.stringify(y.slice(0, 40))}` }; continue; }
    if (x === y && !ab.has(x) && !ba.has(y)) continue;
    if (x.length > 3 || y.length > 3) { if (x !== y) return { ok: false, why: `long identifier differs at token ${i}: ${x} vs ${y}` }; }
    if ((ab.has(x) && ab.get(x) !== y) || (ba.has(y) && ba.get(y) !== x)) return { ok: false, why: `inconsistent rename at token ${i}: ${x}->${y}` };
    if (!ab.has(x)) { ab.set(x, y); ba.set(y, x); if (x !== y) renamed++; }
  }
  return { ok: true, renamed };
}
