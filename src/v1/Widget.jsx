// v1 module, sliced verbatim from legacy/app.jsx (L154-897). Behaviour must match the legacy build;
// the parity harness (test/e2e/parity.spec.js) proves it. Superseded by the v2 tree in S4.
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { CFG, HDAYS, HDAYS_S, HMONTHS } from "./config.js";
import { makeWeeks, fmt, waLink, sendEvent, getCleanPhone, countDigits } from "./utils.js";
import { Ico } from "./icons.jsx";
import { Tag, Btn, BackBtn } from "./atoms.jsx";

/* ═══════════════════════════════════════════
   MAIN WIDGET
   ═══════════════════════════════════════════ */
export function ElementBookingWidget() {
  /* ── State ── */
  const [step, setStep] = useState("qual");
  const [aud, setAud] = useState(null);
  const [branch, setBranch] = useState(null);
  const [cat, setCat] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [selDates, setSelDates] = useState([]);
  const [dateMode, setDateMode] = useState("pick");
  const [calOff, setCalOff] = useState(0);
  const [medHas, setMedHas] = useState(null);
  const [medText, setMedText] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [pvMsg, setPvMsg] = useState("");
  const [isPhoneTouched, setIsPhoneTouched] = useState(false);
  const [isNameTouched, setIsNameTouched] = useState(false);
  const [vis, setVis] = useState(true);
  const [animDir, setAnimDir] = useState("f");
  const [showWTB, setShowWTB] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [hasSeenExit, setHasSeenExit] = useState(false);
  const [showIdle, setShowIdle] = useState(false);
  const [redirectPct, setRedirectPct] = useState(0);
  const redirectFired = useRef(false);
  const [hasSeenIdle, setHasSeenIdle] = useState(false);

  /* ── Stable "today" reference (fixes #14 — no midnight drift) ── */
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  /* ── Derived values ── */
  const isBypass = useMemo(() => { try { return new URLSearchParams(window.location.search).get('admin') === '1'; } catch(e) { return false; } }, []);
  const isP = branch?.type === "private";
  const bc = branch?.color || "#1a1a2e";
  const WARM = "#C4342D";
  const uc = (step === "branch" || step === "cat") ? bc : WARM;
  const maxD = pkg === "single" ? 1 : 3;
  const isChild = aud === "child";
  const isPhoneValid = countDigits(leadPhone) >= 8;
  const isNameValid = leadName.trim().length >= 2;

  const getPkgPrice = (pId) => {
    if (pId === "trial3") return 99;
    if (pId === "single") return (cat?.id === "kids-6-8" || cat?.id === "kids-9-11") ? 60 : 70;
    return 0;
  };
  const pkgObj = CFG.packages.find(p => p.id === pkg);
  const currentPrice = getPkgPrice(pkg);

  function stepIdx() {
    if (step === "qual" || step === "branch") return 0;
    if (step === "cat") return 1;
    if (step === "pform" || step === "pdone") return 2;
    if (step === "details") return 2;
    if (step === "dates") return 3;
    if (step === "medical") return 4;
    if (step === "action" || step === "done" || step === "done-wa") return 5;
    return 0;
  }
  const totalSteps = isP ? 3 : 6;
  const si = stepIdx();
  const isDone = step === "done" || step === "done-wa" || step === "pdone";

  /* ── Category / class data ── */
  const bCats = branch ? CFG.categories.filter(c => c.branchId === branch.id) : [];
  const fCats = bCats.filter(c => { if (!aud) return true; return aud === "child" ? c.forChild : !c.forChild; });
  const cats2 = fCats.length > 0 ? fCats : bCats;
  const cCls = cat ? CFG.classes.filter(c => c.categoryId === cat.id).sort((a,b) => a.dayNum - b.dayNum) : [];
  const actDays = useMemo(() => cat ? [...new Set(CFG.classes.filter(c => c.categoryId === cat.id).map(c => c.dayNum))] : [], [cat]);

  /* ── Calendar: single-class upsell logic ── */
  const calDays = useMemo(() => {
    if (pkg === "single" && selDates.length > 0) return [selDates[0].getDay()];
    return actDays;
  }, [pkg, selDates, actDays]);

  const upsellDays = useMemo(() => {
    if (pkg === "single" && selDates.length > 0) return actDays.filter(d => d !== selDates[0].getDay());
    return [];
  }, [pkg, selDates, actDays]);

  function clsFor(dn) { return CFG.classes.find(c => c.categoryId === (cat ? cat.id : "") && c.dayNum === dn); }
  const clsI = selDates.length > 0 ? clsFor(selDates[0].getDay()) : clsFor(actDays[0] !== undefined ? actDays[0] : 0);

  const calStart = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + calOff * 7); return d; }, [calOff]);
  const weeks = useMemo(() => makeWeeks(calStart, 4, calDays), [calStart, calDays]);
  const visMo = useMemo(() => {
    const ms = new Set();
    weeks.forEach(w => w.forEach(d => {
      if (d.isActive || (upsellDays.includes(d.dayNum) && d.date > today)) ms.add(d.month);
    }));
    return [...ms];
  }, [weeks, upsellDays, today]);

  function togDate(d) {
    const k = d.toISOString();
    setSelDates(p => {
      if (p.find(x => x.toISOString() === k)) return p.filter(x => x.toISOString() !== k);
      if (p.length >= maxD) return p;
      return [...p, d];
    });
  }
  function isSel(d) { return selDates.some(x => x.toISOString() === d.toISOString()); }

  /* ── Navigation ── */
  function go(dir, next, fn) {
    setAnimDir(dir); setVis(false);
    setTimeout(() => { if (fn) fn(); setStep(next); setVis(true); }, 200);
  }
  function fw(s, fn) { go("f", s, fn); }
  function bk(s, fn) { go("b", s, fn); }
  function reset() {
    bk("qual", () => {
      setAud(null); setBranch(null); setCat(null); setPkg(null);
      setSelDates([]); setDateMode("pick"); setCalOff(0); setMedHas(null); setMedText("");
      setPvMsg(""); setShowWTB(false);
    });
  }

  /* ── WhatsApp messages ── */
  const medLine = medHas ? ("\n⚠️ מגבלות רפואיות: " + (medText || "לא פורט")) : "";
  const childLine = isChild ? "\n👶 רישום עבור ילד/ה" : "";
  const cleanPhone = getCleanPhone(leadPhone);

  function groupWA() {
    const sorted = [...selDates].sort((a,b) => a - b);
    const ds = sorted.map((d,i) => (i+1) + ". יום " + HDAYS[d.getDay()] + ", " + fmt(d) + " – " + (clsFor(d.getDay())?.time || "")).join("\n");
    const datesStr = ds ? "\nמועדים:\n" + ds : "\nמועדים: יתואמו טלפונית בהמשך";
    const pl = pkg === "single" ? "שיעור בודד" : "3 שיעורי היכרות";
    return "🎯 בקשת חזרה - " + pl + " באלמנט\n\nשם: " + leadName.trim() + "\nטלפון: " + cleanPhone + "\nקבוצה: " + (cat?.label || "") + childLine + medLine + "\n" + datesStr;
  }
  function privWA() {
    return "👋 פנייה לאימון אישי / זוגי - אלמנט\n\nשם: " + leadName.trim() + "\nטלפון: " + cleanPhone + "\nתחום: " + (cat?.label || "") + (pvMsg ? "\n\nהערות: " + pvMsg : "");
  }

  /* ── Payment URLs ── */
  let finalUrl = CFG.bookingUrl;
  if (pkg === "trial3") finalUrl = "https://letts.co.il/payment/WXZycXZLa09XMlp3QzhJS2hhNHFkdz09";
  else if (pkg === "single") {
    finalUrl = (cat?.id === "kids-6-8" || cat?.id === "kids-9-11") ? "https://1pa.co/TvavILvPZj" : "https://1pa.co/6nz790XZmG";
  }

  /* ── ICS Calendar Export (with timezone fix #4) ── */
  const handleAddCalendar = () => {
    if (selDates.length === 0) return;
    try {
      let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Element Studio//Booking//HE\n";
      selDates.forEach(d => {
        const cl = clsFor(d.getDay());
        if (!cl?.time) return;
        const toICS = (date, t) => {
          const [h,m] = t.split(':');
          return date.getFullYear() + String(date.getMonth()+1).padStart(2,'0') + String(date.getDate()).padStart(2,'0') + "T" + String(parseInt(h)).padStart(2,'0') + String(parseInt(m)).padStart(2,'0') + "00";
        };
        ics += `BEGIN:VEVENT\nSUMMARY:שיעור ניסיון - ${cat?.label || ""}\nDTSTART;TZID=Asia/Jerusalem:${toICS(d,cl.time)}\nDTEND;TZID=Asia/Jerusalem:${toICS(d,cl.timeEnd)}\nLOCATION:${CFG.studio.address}\nDESCRIPTION:שיעור באלמנט - אומנויות לחימה ותנועה\nEND:VEVENT\n`;
      });
      ics += "END:VCALENDAR";
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'element-classes.ics';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch(e) { console.warn("Calendar download blocked."); }
  };

  /* ── Analytics events ── */
  useEffect(() => {
    const map = { qual:'Viewed_Qualifier', branch:'Viewed_Branch_Select', cat:'Viewed_Category_Select', details:'Viewed_Package_Select', dates:'Viewed_Dates_Select', medical:'Viewed_Medical', action:'Viewed_Checkout', done:'Pending_Payment_Gateway', 'done-wa':'Completed_Booking_WA', pform:'Viewed_Private_Form', pdone:'Completed_Private_Lead' };
    if (typeof window !== 'undefined' && window.dataLayer) window.dataLayer.push({ event: map[step], category: cat?.label, package: pkg });
  }, [step, cat, pkg]);

  /* ── Exit Intent (desktop only — mouseleave) ── */
  useEffect(() => {
    const h = (e) => { if (e.clientY <= 0 && si > 0 && !isDone && !hasSeenExit) { setShowExit(true); setHasSeenExit(true); } };
    if (typeof document !== 'undefined') { document.addEventListener('mouseleave', h); return () => document.removeEventListener('mouseleave', h); }
  }, [si, isDone, hasSeenExit]);

  /* ── Idle Timeout (#9 — 60s inactivity, works on mobile + desktop) ── */
  const lastActivity = useRef(Date.now());
  const sentEvents = useRef({});
  const abandonRef = useRef(null);

  /* ── Send event (deduplicated) ── */
  const fireEvent = (eventName, extra) => {
    const key = eventName + ":" + (cleanPhone || leadPhone);
    if (sentEvents.current[key]) return;
    sentEvents.current[key] = true;
    const base = { name: leadName.trim(), phone: leadPhone, audience: aud || "" };
    sendEvent(eventName, { ...base, ...extra });
  };

  /* ── Abandoned checkout detection ── */
  useEffect(() => {
    if (step === "action") {
      abandonRef.current = setTimeout(() => {
        fireEvent("abandoned_checkout", { categoryId: cat?.id, categoryLabel: cat?.label, branchTitle: branch?.label, packageLabel: pkg === "single" ? "שיעור בודד" : "3 שיעורי היכרות", price: currentPrice });
      }, 90000);
    } else {
      if (abandonRef.current) clearTimeout(abandonRef.current);
    }
    return () => { if (abandonRef.current) clearTimeout(abandonRef.current); };
  }, [step]);

  /* ── Redirect countdown for "done" screen ── */
  useEffect(() => {
    if (step !== "done") { setRedirectPct(0); redirectFired.current = false; return; }
    const DURATION = 12000;
    const INTERVAL = 50;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      setRedirectPct(pct);
      if (pct >= 100) { clearInterval(id); }
    }, INTERVAL);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    const touch = () => { lastActivity.current = Date.now(); };
    const events = ['click', 'touchstart', 'scroll', 'keydown', 'mousemove'];
    events.forEach(e => window.addEventListener(e, touch, { passive: true }));
    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current > 60000 && si > 0 && !isDone && !hasSeenIdle && !showExit) {
        setShowIdle(true); setHasSeenIdle(true);
      }
    }, 10000);
    return () => { events.forEach(e => window.removeEventListener(e, touch)); clearInterval(interval); };
  }, [si, isDone, hasSeenIdle, showExit]);

  const idleWaMsg = "היי, התחלתי הרשמה לשיעורי היכרות באפליקציית אלמנט" + (cat ? ` (${cat.label})` : "") + " ואשמח לעזרה 😊";

  /* ── Titles ── */
  const titles = {
    qual: ["הזמנת שיעור היכרות", "אלמנט - אומנויות לחימה ותנועה | Element"],
    branch: ["הזמנת שיעור היכרות", "אלמנט - אומנויות לחימה ותנועה | Element"],
    cat: [branch?.title || "", branch?.subtitle || ""],
    details: [cat?.label || "", "בחרו סניף וחבילת היכרות"],
    dates: ["בחרו מועדים", pkg === "single" ? "בחרו תאריך לשיעור" : "סמנו עד 3 תאריכים"],
    medical: ["כמעט סיימנו", "איך נוכל לשמור עליך הכי טוב?"],
    action: ["סיכום והרשמה", "בדקו את הפרטים והבטיחו מקום"],
    done: ["מועברים לתשלום...", ""],
    "done-wa": ["הפנייה נשלחה!", ""],
    pform: ["פרטים ליצירת קשר", "נחזור אליך בהקדם לתיאום"],
    pdone: ["הפנייה נשלחה!", ""],
  };
  const ht = titles[step] || ["",""];
  const inpStyle = { padding: "10px 14px", borderRadius: 9, border: "1.5px solid #E0E0DC", fontSize: 13.5, fontFamily: "inherit", color: "#1a1a2e", background: "#FAFAF8", outline: "none", boxSizing: "border-box", width: "100%" };
  const headerBg = isDone ? "linear-gradient(to left,#080a09 0%,#0d2b20 50%,#1A7A6D 120%)" : `linear-gradient(to left,#0a0b10 0%,#131624 50%,${uc} 140%)`;

  /* ═══════════════════════════════════════════
     STEP RENDER FUNCTIONS
     Each screen is its own function for readability.
     They share state via closure (no prop drilling).
     ═══════════════════════════════════════════ */

  const renderQual = () => (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24, marginTop: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>ברוכים הבאים לאלמנט</div>
        <div style={{ fontSize: 13, color: "#666" }}>כדי שנוכל להתאים לכם את האימון המדויק, נשמח להכיר:</div>
      </div>
      {/* Step 1: Audience */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 26, height: 26, borderRadius: 13, background: aud ? "#E8E7E3" : uc, color: aud ? "#888" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, transition: "all 0.3s" }}>{aud ? "✓" : "1"}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>עבור מי השיעור?</div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24, paddingRight: 36, flexWrap: "wrap" }}>
        {[["self","עבורי","בוגרים ומבוגרים"],["child","עבור הילד/ה שלי","ילדים ונוער"]].map(([k,l,s]) =>
          <button key={k} onClick={() => setAud(k)} style={{ flex: 1, minWidth: 140, padding: "14px 12px", borderRadius: 14, border: "2px solid " + (aud === k ? uc : "#E8E7E3"), background: aud === k ? (uc+"08") : "#fff", boxShadow: aud ? "none" : "0 4px 12px rgba(0,0,0,0.04)", cursor: "pointer", fontFamily: "inherit", textAlign: "center", transition: "all 0.2s" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{l}</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 3 }}>{s}</div>
          </button>
        )}
      </div>
      {/* Step 2: Contact details */}
      <div style={{ opacity: aud ? 1 : 0.35, pointerEvents: aud ? "auto" : "none", transition: "all 0.3s", transform: aud ? "translateY(0)" : "translateY(5px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 13, background: aud ? uc : "#E8E7E3", color: aud ? "#fff" : "#888", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, transition: "all 0.3s" }}>2</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>פרטי קשר לשמירת מקום:</div>
        </div>
        <div style={{ paddingRight: 36 }}>
          <div style={{ marginBottom: 10 }}>
            <input className="premium-input" value={leadName} onChange={e => setLeadName(e.target.value)} onBlur={() => setIsNameTouched(true)} placeholder="שם מלא" style={{ ...inpStyle, border: "1.5px solid " + (isNameTouched && !isNameValid ? "#C4342D" : "#E0E0DC") }} />
            {isNameTouched && !isNameValid && <div style={{ fontSize: 10.5, color: "#C4342D", marginTop: 4, fontWeight: 500, textAlign: "right" }}>* נא להזין שם מלא</div>}
          </div>
          <div style={{ marginBottom: 4 }}>
            <div className="premium-input" style={{ display: 'flex', direction: 'ltr', background: '#FAFAF8', border: '1.5px solid ' + (isPhoneTouched && !isPhoneValid ? '#C4342D' : '#E0E0DC'), borderRadius: 9, overflow: 'hidden' }}>
              <div style={{ padding: '9px 12px', background: '#F0F0EC', color: '#666', borderRight: '1px solid ' + (isPhoneTouched && !isPhoneValid ? '#C4342D' : '#E0E0DC'), fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center' }}>+972</div>
              <input type="tel" value={leadPhone} onChange={e => setLeadPhone(e.target.value)} onBlur={() => setIsPhoneTouched(true)} placeholder="50-1234567" style={{ flex: 1, padding: '9px 12px', border: 'none', background: 'transparent', outline: 'none', fontSize: 13.5, fontFamily: 'inherit' }}/>
            </div>
            {isPhoneTouched && !isPhoneValid && <div style={{ fontSize: 10.5, color: "#C4342D", marginTop: 4, fontWeight: 500, textAlign: "right" }}>* נא להזין מספר טלפון תקין</div>}
          </div>
          <div style={{ fontSize: 10.5, color: "#999", marginBottom: 14, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <Ico name="lock" color="#999" size={10}/> הפרטים שמורים במערכת ולא יועברו לצד שלישי
          </div>
          {/* FIX #1: Button properly disabled until all 3 conditions met */}
          <Btn onClick={() => { setIsNameTouched(true); setIsPhoneTouched(true); if (isNameValid && isPhoneValid) { fireEvent("lead_started"); fw("branch"); }}} disabled={!aud || !isNameValid || !isPhoneValid} color={uc}>המשיכו לבחירת אימון ←</Btn>
        </div>
      </div>
    </div>
  );

  const renderBranch = () => (
    <div>
      <BackBtn onClick={() => bk("qual")}/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginTop: 8 }}>
        {CFG.branches.filter(b => b.type === "group").map(br => {
          const bc2 = CFG.categories.filter(c => c.branchId === br.id && (aud === "child" ? c.forChild : aud === "self" ? !c.forChild : true));
          return <div key={br.id} onClick={() => fw("cat", () => setBranch(br))} style={{ borderRadius: 14, border: "2px solid #EDEDEA", background: "#fff", padding: "14px 12px 10px", cursor: "pointer", transition: "transform 0.2s,box-shadow 0.2s" }} onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 16px rgba(0,0,0,0.06)"; }} onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}>
            <div style={{ marginBottom: 6 }}><Ico name={br.icon} color={br.color} size={30}/></div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e", marginBottom: 2 }}>{br.title}</div>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 8 }}>{br.subtitle}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {bc2.map(c => <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 5px", borderRadius: 5, background: "#F8F7F4" }}>
                <Ico name={c.icon} color={br.color} size={12}/>
                <span style={{ fontSize: 9.5, color: "#444", fontWeight: 500, flex: 1 }}>{c.label}</span>
              </div>)}
            </div>
          </div>;
        })}
      </div>
      <div onClick={() => fw("cat", () => setBranch(CFG.branches[2]))} style={{ marginTop: 10, borderRadius: 14, cursor: "pointer", border: "1.5px solid #E8E2CF", background: "linear-gradient(135deg,#FDFBF5,#FAF6EC)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, transition: "transform 0.2s,box-shadow 0.2s" }} onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 16px rgba(139,105,20,0.1)"; }} onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}>
        <Ico name="private" color="#8B6914" size={30}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#5C4A1A", marginBottom: 4 }}>אימונים אישיים / זוגיים</div>
          <div style={{ fontSize: 10, color: "#9A8A5E", marginBottom: 6 }}>ליווי פרטי מותאם אישית</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {["פיזיותרפיה","הגנה עצמית","ילדים","כושר גופני"].map(t => <span key={t} style={{ background: "rgba(139,105,20,0.1)", color: "#8B6914", padding: "2px 6px", borderRadius: 4, fontSize: 9.5, fontWeight: 600 }}>{t}</span>)}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCat = () => (
    <div>
      <BackBtn onClick={() => bk("branch", () => { setBranch(null); setCat(null); })}/>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>{isP ? "בחרו את השירות הרצוי:" : "בחרו את השיעור הרצוי:"}</div>
      {cats2.map(c => <div key={c.id} onClick={() => isP ? fw("pform", () => setCat(c)) : fw("details", () => setCat(c))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 11, border: "1.5px solid #EEEEE9", background: "#fff", cursor: "pointer", marginBottom: 7, transition: "border 0.2s" }} onMouseEnter={e => e.currentTarget.style.border=`1.5px solid ${bc}80`} onMouseLeave={e => e.currentTarget.style.border="1.5px solid #EEEEE9"}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: bc+"10", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ico name={c.icon} color={bc} size={18}/></div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{c.label}</span>
            {c.tag && <Tag type={c.tag}/>}
          </div>
          <div style={{ fontSize: 10.5, color: "#999", marginTop: 1 }}>{c.desc}</div>
        </div>
        <Ico name="arrowL" color={bc} size={15}/>
      </div>)}
    </div>
  );

  const renderDetails = () => (
    <div>
      <BackBtn onClick={() => bk("cat", () => { setCat(null); setPkg(null); })}/>
      <div style={{ background: "#F8F7F4", borderRadius: 12, padding: "16px", marginBottom: 20, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
          <div style={{ marginTop: 2 }}><Ico name="pin" color={uc} size={16}/></div>
          <div><div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>{CFG.studio.name}</div><div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>{CFG.studio.address}</div></div>
        </div>
        <div style={{ height: 1, background: "#EAE9E4", margin: "0 0 14px 0" }}/>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ marginTop: 2 }}><Ico name="clock" color={uc} size={16}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 }}>זמני הקבוצה:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cCls.map(cl => <div key={cl.dayNum} style={{ fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: "#1a1a2e", minWidth: 45 }}>יום {cl.day}</span><span>{cl.time} - {cl.timeEnd}</span><span style={{ color: "#aaa", fontSize: 10.5 }}>({cl.mins} דק׳)</span>
              </div>)}
            </div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e", marginBottom: 10 }}>בחרו חבילת היכרות:</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setPkg("trial3")} style={{ flex: 1, minWidth: 130, padding: "14px 10px", borderRadius: 12, border: "2px solid " + (pkg === "trial3" ? uc : "#E8E7E3"), background: pkg === "trial3" ? (uc+"08") : "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "center", position: "relative", overflow: "hidden", transition: "all 0.2s" }}>
          <div style={{ position: "absolute", top: 0, right: 0, background: "#00C48C", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderBottomLeftRadius: 8 }}>מומלץ</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e", marginTop: 4 }}>3 שיעורי היכרות</div>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#bbb", textDecoration: "line-through" }}>₪210</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: uc }}>₪99</span>
          </div>
          <div style={{ fontSize: 10, color: "#00A67E", fontWeight: 800, marginTop: 4 }}>הטבה למצטרפים חדשים</div>
        </button>
        <button onClick={() => setPkg("single")} style={{ flex: 1, minWidth: 100, padding: "14px 10px", borderRadius: 12, border: "2px solid " + (pkg === "single" ? uc : "#E8E7E3"), background: pkg === "single" ? (uc+"08") : "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", transition: "all 0.2s" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>שיעור בודד</div>
          <div style={{ marginTop: 6 }}><span style={{ fontSize: 20, fontWeight: 800, color: "#555" }}>₪{getPkgPrice("single")}</span></div>
        </button>
      </div>
      <Btn onClick={() => fw("dates")} disabled={!pkg} color={uc}>המשיכו לבחירת תאריכים ←</Btn>
    </div>
  );

  const renderDates = () => (
    <div>
      <BackBtn onClick={() => bk("details", () => setSelDates([]))}/>
      {clsI && <div style={{ fontSize: 12, color: "#666", marginBottom: 10, display: "flex", alignItems: "center", gap: 5, background: uc+"06", padding: "8px 12px", borderRadius: 8, border: "1px solid "+uc+"15", flexWrap: "wrap" }}>
        <span>משך השיעור:</span><span style={{ fontWeight: 700, color: uc }}>{clsI.mins}דק׳</span><Ico name="clock" color={uc} size={11}/><span>מ-{clsI.time} עד {clsI.timeEnd}</span>
      </div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <button onClick={() => setCalOff(Math.max(0,calOff-4))} disabled={calOff===0} style={{ background: "none", border: "none", cursor: calOff===0 ? "default":"pointer", opacity: calOff===0 ? 0.3:1, padding: 4 }}><Ico name="arrowR" color={uc} size={16}/></button>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{visMo.map(m => HMONTHS[m]).join(" – ")} {weeks[0]?.[0]?.year}</div>
        <button onClick={() => setCalOff(Math.min(8,calOff+4))} disabled={calOff>=8} style={{ background: "none", border: "none", cursor: calOff>=8 ? "default":"pointer", opacity: calOff>=8 ? 0.3:1, padding: 4 }}><Ico name="arrowL" color={uc} size={16}/></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 3, marginBottom: 4 }}>
        {HDAYS_S.map((d,i) => <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: calDays.includes(i) ? uc : upsellDays.includes(i) ? "#D4A843" : "#ccc", padding: "2px 0" }}>{d}</div>)}
      </div>
      <div style={{ marginBottom: 12 }}>
        {weeks.map((wk,wi) => {
          const thisM = wk.find(d => d.isActive)?.month;
          const prevM = wi > 0 ? weeks[wi-1][5]?.month : null;
          const sep = wi > 0 && thisM !== undefined && thisM !== prevM;
          return <div key={wi}>
            {sep && <div style={{ textAlign: "center", padding: "6px 0 4px", fontSize: 11, fontWeight: 700, color: uc, borderTop: "1px dashed "+uc+"25", marginTop: 4 }}>{HMONTHS[thisM]}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 3, marginBottom: 3 }}>
              {wk.map((d,di) => {
                const sel = d.isActive && isSel(d.date);
                const mx = selDates.length >= maxD;
                const classTimeObj = clsFor(d.dayNum);

                /* Same-day booking allowed until class start (03-May-2026, 4dcb70c) */
                let tooSoon = false;
                if (classTimeObj && d.isActive && !sel) {
                  const [h,m] = classTimeObj.time.split(':');
                  const cdt = new Date(d.date); cdt.setHours(parseInt(h),parseInt(m),0,0);
                  if (cdt <= new Date()) tooSoon = true;
                }

                /* Generic urgency: "מקומות מוגבלים" on dates within 5 days (#2 — honest urgency) */
                const daysUntil = Math.ceil((d.date - today) / 86400000);
                const isUrgent = d.isActive && daysUntil > 0 && daysUntil <= 5 && !sel && !tooSoon;

                /* Upsell: show other day dimmed for single-class users */
                const isUpsell = !d.isActive && upsellDays.includes(d.dayNum) && d.date > today;

                const dis = !d.isActive || (!sel && mx) || tooSoon;

                return <button key={di} onClick={d.isActive && !dis ? () => togDate(d.date) : undefined} style={{
                  padding: "6px 2px", borderRadius: 9, minHeight: 48,
                  border: sel ? ("2px solid "+uc) : isUpsell ? "1.5px dashed #E0A84030" : tooSoon ? "1.5px solid #EEE" : d.isActive ? ("1.5px solid "+uc+"25") : "1.5px solid #F0F0EC",
                  background: sel ? (uc+"12") : isUpsell ? "#FDF9F0" : tooSoon ? "#F5F5F5" : d.isActive ? "#fff" : "#FAFAF8",
                  cursor: d.isActive && !dis ? "pointer" : "default",
                  opacity: (dis && !sel && !tooSoon) ? 0.25 : isUpsell ? 0.55 : tooSoon ? 0.4 : 1,
                  fontFamily: "inherit", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  transition: "all 0.1s", transform: (tooSoon || (dis && !sel)) ? "scale(0.96)" : "scale(1)"
                }}>
                  {sel && <div style={{ position: "absolute", top: 2, left: 2, width: 13, height: 13, borderRadius: 4, background: uc, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico name="check" color="#fff" size={9}/></div>}
                  {isUpsell && <div style={{ position: "absolute", top: 1, right: 1, fontSize: 8, color: "#D4A843" }}>🔒</div>}
                  <div style={{ fontSize: 15, fontWeight: sel ? 800 : (d.isActive && !tooSoon) ? 700 : isUpsell ? 500 : 400, color: sel ? "#1a1a2e" : (d.isActive && !tooSoon) ? "#333" : isUpsell ? "#C0A060" : "#999" }}>{d.day}</div>
                  {tooSoon ? <div style={{ fontSize: 7.5, color: "#888", fontWeight: 700, opacity: 0.6 }}>נסגר</div>
                  : isUrgent ? <div style={{ fontSize: 7, color: "#C4342D", fontWeight: 700 }}>מקומות מוגבלים</div>
                  : d.isActive && classTimeObj ? <div style={{ fontSize: 8.5, color: sel ? uc : "#999" }}>{classTimeObj.time}</div>
                  : isUpsell && clsFor(d.dayNum) ? <div style={{ fontSize: 7.5, color: "#C0A060" }}>{clsFor(d.dayNum).time}</div>
                  : null}
                </button>;
              })}
            </div>
          </div>;
        })}
      </div>
      {/* Upsell banner for single-class */}
      {upsellDays.length > 0 && <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: "linear-gradient(135deg,#FDF9F0,#FFF6E8)", border: "1.5px solid #E8D9B0", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 20 }}>💡</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#5C4A1A" }}>רוצים גם יום {HDAYS[upsellDays[0]]}?</div>
          <div style={{ fontSize: 11, color: "#9A8A5E", marginTop: 1 }}>שדרגו ל-3 שיעורי היכרות ב-₪99 בלבד</div>
        </div>
        <button onClick={() => { setPkg("trial3"); setDateMode("pick"); setSelDates([]); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#D4A843", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>שדרגו ←</button>
      </div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        <Btn onClick={() => fw("medical")} disabled={selDates.length < 1} color={uc}>המשיכו ←</Btn>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", marginTop: 4 }}>
          <button onClick={() => { setSelDates([]); fw("medical"); }} style={{ background: "none", border: "none", color: "#888", fontSize: 12, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", padding: "4px" }}>לא מצאתי תאריך מתאים, אדלג ואתאם בהמשך</button>
          <a href={waLink(CFG.waPhone, "היי, אני מתעניין/ת ב" + (cat?.label||"") + " אבל רציתי לשאול לגבי הגעה בימים אחרים / פעם בשבוע.")} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#25D366", textDecoration: "none", fontWeight: 600, cursor: "pointer", padding: "4px" }}>
            <Ico name="wa" color="#25D366" size={14}/> מתלבטים לגבי הימים? התייעצו איתנו בוואטסאפ
          </a>
        </div>
      </div>
    </div>
  );

  const renderMedical = () => (
    <div>
      <BackBtn onClick={() => bk("dates")}/>
      <div style={{ borderRadius: 12, border: "1.5px solid #E8E7E3", background: "#FAFAF8", padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Ico name="medical" color={uc} size={18}/>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1a1a2e" }}>איך נוכל לשמור עליך הכי טוב באימון?</div>
        </div>
        <p style={{ fontSize: 11.5, color: "#888", marginBottom: 14 }}>נשמח לדעת על מגבלות רפואיות או פציעות חשובות כדי להתאים לך את הפעילות.</p>
        <div style={{ display: "flex", gap: 8, marginBottom: medHas ? 14 : 0 }}>
          {[[false,"הכל תקין","✅"],[true,"יש מה לדעת","⚠️"]].map(([v,l,e]) =>
            <button key={String(v)} onClick={() => setMedHas(v)} style={{ flex: 1, padding: "11px 10px", borderRadius: 10, border: "2px solid " + (medHas === v ? "#1a1a2e" : "#E0E0DC"), background: medHas === v ? "#1a1a2e" : "#fff", color: medHas === v ? "#fff" : "#555", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, transition: "all 0.2s" }}>{l}</button>
          )}
        </div>
        {/* FIX #15a: resize vertical only */}
        {medHas === true && <textarea className="premium-input" value={medText} onChange={e => setMedText(e.target.value)} placeholder="פרטו בקצרה: פציעות עבר, מגבלות..." style={{ ...inpStyle, minHeight: 64, marginTop: 8, resize: "vertical" }}/>}
      </div>
      <Btn onClick={() => { fireEvent("checkout_reached", { categoryId: cat?.id, categoryLabel: cat?.label, branchTitle: branch?.label, packageLabel: pkg === "single" ? "שיעור בודד" : "3 שיעורי היכרות", price: currentPrice, dates: selDates.map(d => d.toISOString()), classTime: cat ? (CFG.classes.find(c => c.categoryId === cat.id)?.time || "") : "", medical: medHas ? (medText || "כן, לא פורט") : "הכל תקין" }); fw("action"); }} disabled={medHas === null} color={uc}>המשיכו לסיכום ←</Btn>
    </div>
  );

  const renderSummaryCard = () => (
    <div style={{ borderRadius: 14, background: uc+"06", border: "1px solid "+uc+"15", padding: "12px 14px", marginBottom: 16, textAlign: "right" }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 }}>השיעורים שהזמנתם:</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 12, color: "#555" }}>{cat?.label} • {pkgObj?.label}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: uc }}>₪{currentPrice}</div>
      </div>
      <div style={{ fontSize: 11, color: "#777", lineHeight: 1.7 }}>
        {selDates.length > 0 ? [...selDates].sort((a,b)=>a-b).map((d,i) => <div key={i}>● יום {HDAYS[d.getDay()]}, {fmt(d)} – {clsFor(d.getDay())?.time}</div>) : <div style={{ color: "#aaa" }}>מועדים יתואמו טלפונית בהמשך</div>}
      </div>
    </div>
  );

  const renderWTBAccordion = () => (
    <div style={{ margin: "18px 0", textAlign: "right" }}>
      <button onClick={() => setShowWTB(!showWTB)} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #E8E7E3", background: showWTB ? "#F8F7F4":"#fff", cursor: "pointer", fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>🎒 מה להביא לשיעור הראשון?</span>
        <span style={{ fontSize: 12, color: "#aaa", transform: showWTB ? "rotate(90deg)":"rotate(0)", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
      </button>
      {showWTB && <div style={{ padding: "10px 14px", borderRadius: "0 0 10px 10px", background: "#F8F7F4", border: "1px solid #E8E7E3", borderTop: "none", textAlign: "right" }}>
        {CFG.whatToBring.map((t,i) => <div key={i} style={{ padding: "5px 0", fontSize: 12.5, color: "#555", fontWeight: 500 }}>{t}</div>)}
      </div>}
    </div>
  );

  const renderDoneFooter = () => (
    <div>
      <div style={{ height: 1, background: "#EEEEE9", margin: "16px 0" }}/>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
        <a href={waLink(CFG.waPhone, "היי, יש לי שאלה לגבי שיעורי ההיכרות באלמנט 😊")} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 9, background: "linear-gradient(135deg,#25D366,#128C7E)", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none", fontFamily: "inherit" }}><Ico name="wa" color="#fff" size={13}/> יש לי שאלה</a>
        <button onClick={reset} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "1px solid #DDD", borderRadius: 9, padding: "8px 16px", color: "#666", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}><Ico name="restart" color="#888" size={13}/> הזמנת שיעור נוסף</button>
      </div>
    </div>
  );

  const renderAction = () => (
    <div>
      <BackBtn onClick={() => bk("medical")}/>
      {/* Checkout summary card */}
      <div style={{ borderRadius: 14, background: uc+"06", border: "2px solid "+uc+"20", padding: "14px 16px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: uc+"15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ico name={cat?.icon} color={uc} size={18}/></div>
            <div><div style={{ fontSize: 13.5, fontWeight: 700, color: "#1a1a2e" }}>{cat?.label}</div><div style={{ fontSize: 11, color: "#888" }}>{pkgObj?.label}</div></div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: uc }}>₪{currentPrice}</div>
        </div>
        <div style={{ borderTop: "1px solid "+uc+"15", paddingTop: 10, fontSize: 11, color: "#777", lineHeight: 1.7 }}>
          {selDates.length > 0 ? [...selDates].sort((a,b)=>a-b).map((d,i) => <div key={i}>● יום {HDAYS[d.getDay()]}, {fmt(d)} – {clsFor(d.getDay())?.time}</div>) : <div style={{ color: "#aaa" }}>מועדים יתואמו טלפונית בהמשך</div>}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e", marginBottom: 12 }}>איך תרצו להמשיך?</div>
      {/* Option 1: Self-book */}
      <div style={{ borderRadius: 14, border: "1.5px solid "+uc+"40", background: uc+"08", padding: "16px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 13, background: uc, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>1</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>הרשמה מהירה (תשלום אונליין)</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 14, paddingRight: 36 }}>
          <Ico name="lock" color="#0D7C5F" size={13}/><span style={{ fontSize: 11.5, fontWeight: 700, color: "#0D7C5F" }}>תשלום מאובטח ומוצפן</span>
        </div>
        <button onClick={() => { fireEvent("booking_selfbook", { categoryId: cat?.id, categoryLabel: cat?.label }); fw("done"); }} style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,"+uc+","+uc+"DD)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px "+uc+"30", transition: "all 0.2s" }}>מעבר למערכת ההזמנה ←</button>
      </div>
      {/* Option 2: Callback */}
      <div style={{ borderRadius: 14, border: "1.5px solid #E8E7E3", background: "#fff", padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 13, background: "#F0F0EC", color: "#666", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>2</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>נציג יחזור אליי (לתיאום והרשמה)</div>
        </div>
        <div style={{ display: "flex", gap: 8, paddingRight: 36, flexWrap: "wrap" }}>
          <div className="premium-input" style={{ flex: "1 1 150px", display: 'flex', direction: 'ltr', background: '#FAFAF8', border: '1.5px solid #E0E0DC', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '9px 8px', background: '#F0F0EC', color: '#666', borderRight: '1px solid #E0E0DC', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center' }}>+972</div>
            <input type="tel" value={leadPhone} onChange={e => setLeadPhone(e.target.value)} placeholder="50-1234567" style={{ flex: 1, width: '100%', padding: '9px 8px', border: 'none', background: 'transparent', outline: 'none', fontSize: 13, fontFamily: 'inherit' }}/>
          </div>
          <button onClick={() => { fireEvent("booking_callback", { categoryId: cat?.id, categoryLabel: cat?.label }); window.open(waLink(CFG.waPhone, groupWA()), "_blank"); fw("done-wa"); }} disabled={!isPhoneValid} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: isPhoneValid ? "linear-gradient(135deg,#25D366,#128C7E)" : "#ddd", color: "#fff", fontWeight: 700, cursor: isPhoneValid ? "pointer":"default", fontFamily: "inherit", transition: "all 0.2s" }}>שלחו</button>
        </div>
      </div>
    </div>
  );

  const renderDone = () => (
    <div>
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#00E5A0", display: "flex", alignItems: "center", justifyContent: "center", margin: "4px auto 14px", boxShadow: "0 5px 16px rgba(0,229,160,0.3)" }}><Ico name="check" color="#fff" size={22}/></div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>ההזמנה שלכם מוכנה!</div>
        <div style={{ fontSize: 12.5, color: "#666", marginBottom: 16, lineHeight: 1.5 }}>הפרטים נשמרו. כדי להבטיח את מקומכם, אנא השלימו את התשלום בעמוד שייפתח.<br/><span style={{ fontSize: 11, opacity: 0.8 }}>* השיבוץ יאושר סופית ע"י הצוות (במקרה של שינויים נעדכן).</span></div>
        {renderSummaryCard()}

        {/* Progress bar + redirect */}
        <div style={{ background: "#F8F7F4", borderRadius: 12, padding: "14px 16px", marginBottom: 14, border: "1px solid #E8E7E3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{redirectPct < 100 ? "⏳ מכינים את עמוד התשלום..." : "✅ עמוד התשלום מוכן!"}</div>
            <div style={{ fontSize: 11, color: "#999", fontWeight: 600 }}>{Math.round(redirectPct)}%</div>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "#E8E7E3", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, background: redirectPct < 100 ? "linear-gradient(90deg,#D4A843,#E8C547)" : "#00E5A0", width: redirectPct + "%", transition: "width 0.05s linear, background 0.3s" }}/>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
            {redirectPct < 100 && <a href={finalUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 16px", borderRadius: 8, background: "#1a1a2e", color: "#fff", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", textDecoration: "none" }}>מעבר מיידי לתשלום →</a>}
            {redirectPct >= 100 && <a href={finalUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 10, background: "linear-gradient(135deg,"+uc+","+uc+"DD)", color: "#fff", fontSize: 15, fontWeight: 800, textDecoration: "none", fontFamily: "inherit", boxShadow: "0 4px 16px "+uc+"40", animation: "pulse-btn 1.5s ease-in-out infinite" }}>לחצו כאן לתשלום מאובטח →</a>}
          </div>
        </div>

        {selDates.length > 0 && <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <button onClick={handleAddCalendar} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40px", gap: 6, padding: "0 16px", borderRadius: 10, background: "#F0FAF8", border: "1.5px solid #1A7A6D", color: "#1A7A6D", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxSizing: "border-box" }}><Ico name="calendar" color="#1A7A6D" size={14}/> הוספה ליומן</button>
            <div style={{ fontSize: 10, color: "#999", marginTop: 4 }}>* באנדרואיד: יש לפתוח את הקובץ לאחר ההורדה</div>
          </div>
        </div>}
        {renderWTBAccordion()}
        {renderDoneFooter()}
      </div>
    </div>
  );

  const renderDoneWa = () => (
    <div>
      <BackBtn onClick={() => bk("action")}/>
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#00E5A0", display: "flex", alignItems: "center", justifyContent: "center", margin: "4px auto 14px", boxShadow: "0 5px 16px rgba(0,229,160,0.3)" }}><Ico name="check" color="#fff" size={22}/></div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 }}>הפנייה נשלחה בהצלחה!</div>
        <div style={{ fontSize: 12.5, color: "#666", marginBottom: 16, lineHeight: 1.5 }}>נציג שלנו יחזור אליך בהקדם לתיאום והשלמת ההרשמה.<br/>(השיחה נפתחה בחלון וואטסאפ חדש)</div>
        {renderSummaryCard()}
        {selDates.length > 0 && <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <button onClick={handleAddCalendar} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "44px", gap: 6, padding: "0 16px", borderRadius: 10, background: "#F0FAF8", border: "1.5px solid #1A7A6D", color: "#1A7A6D", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxSizing: "border-box" }}><Ico name="calendar" color="#1A7A6D" size={14}/> שריון ביומן</button>
            <div style={{ fontSize: 10, color: "#999", marginTop: 4 }}>* באנדרואיד: יש לפתוח את הקובץ לאחר ההורדה</div>
          </div>
        </div>}
        {renderWTBAccordion()}
        {renderDoneFooter()}
      </div>
    </div>
  );

  /* FIX #20: Private form uses shared leadName (pre-filled) + proper validation */
  const renderPform = () => (
    <div>
      <BackBtn onClick={() => bk("cat", () => setCat(null))}/>
      <div style={{ marginBottom: 11 }}><label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>שם מלא</label><input className="premium-input" value={leadName} onChange={e => setLeadName(e.target.value)} onBlur={() => setIsNameTouched(true)} style={{ ...inpStyle, border: "1.5px solid " + (isNameTouched && !isNameValid ? "#C4342D" : "#E0E0DC") }}/>{isNameTouched && !isNameValid && <div style={{ fontSize: 10.5, color: "#C4342D", marginTop: 4, fontWeight: 500 }}>* נא להזין שם מלא</div>}</div>
      <div style={{ marginBottom: 11 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>טלפון</label>
        <div className="premium-input" style={{ display: 'flex', direction: 'ltr', background: '#FAFAF8', border: '1.5px solid ' + (isPhoneTouched && !isPhoneValid ? '#C4342D' : '#E0E0DC'), borderRadius: 9, overflow: 'hidden' }}>
          <div style={{ padding: '9px 12px', background: '#F0F0EC', color: '#666', borderRight: '1px solid #E0E0DC', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center' }}>+972</div>
          <input type="tel" value={leadPhone} onChange={e => setLeadPhone(e.target.value)} onBlur={() => setIsPhoneTouched(true)} placeholder="50-1234567" style={{ flex: 1, padding: '9px 12px', border: 'none', background: 'transparent', outline: 'none', fontSize: 13.5, fontFamily: 'inherit' }}/>
        </div>
        {isPhoneTouched && !isPhoneValid && <div style={{ fontSize: 10.5, color: "#C4342D", marginTop: 4, fontWeight: 500 }}>* נא להזין מספר טלפון תקין</div>}
      </div>
      <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>הערות</label><textarea className="premium-input" value={pvMsg} onChange={e => setPvMsg(e.target.value)} placeholder="ספרו לנו על המטרה שלכם, וציינו אם יש מגבלות רפואיות שחשוב שנדע עליהן..." style={{ ...inpStyle, minHeight: 64, resize: "vertical" }}/></div>
      <button onClick={() => { setIsNameTouched(true); setIsPhoneTouched(true); if (isNameValid && isPhoneValid) { fireEvent("private_inquiry", { categoryId: cat?.id, categoryLabel: cat?.label, branchTitle: "אימון אישי", pvMsg: pvMsg }); window.open(waLink(CFG.waPhone, privWA()), "_blank"); fw("pdone"); }}} disabled={!isNameValid || !isPhoneValid} style={{ width: "100%", padding: "12px", borderRadius: 11, border: "none", background: (isNameValid && isPhoneValid) ? ("linear-gradient(135deg,"+uc+","+uc+"DD)") : "#ccc", color: "#fff", fontWeight: 700, cursor: (isNameValid && isPhoneValid) ? "pointer":"default", fontFamily: "inherit", transition: "all 0.2s", opacity: (isNameValid && isPhoneValid) ? 1 : 0.6 }}>שלחו פנייה בוואטסאפ</button>
    </div>
  );

  const renderPdone = () => (
    <div>
      <BackBtn onClick={() => bk("pform")}/>
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#00E5A0", display: "flex", alignItems: "center", justifyContent: "center", margin: "4px auto 14px" }}><Ico name="check" color="#fff" size={22}/></div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>הפנייה נשלחה</div>
        <div style={{ fontSize: 12.5, color: "#666", marginBottom: 16 }}>נחזור אליך בהקדם לתיאום האימון.</div>
        <div style={{ height: 1, background: "#EEEEE9", margin: "16px 0" }}/>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={reset} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "1px solid #DDD", borderRadius: 9, padding: "8px 16px", color: "#666", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}><Ico name="restart" color="#888" size={13}/> הזמנת שיעור נוסף</button>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════
     MAIN RENDER — Step routing + layout
     ═══════════════════════════════════════════ */
  const stepMap = { qual: renderQual, branch: renderBranch, cat: renderCat, details: renderDetails, dates: renderDates, medical: renderMedical, action: renderAction, done: renderDone, "done-wa": renderDoneWa, pform: renderPform, pdone: renderPdone };

  return (
    /* FIX #15b: Reduced top padding — clamp(8px, 2vh, 24px) for mobile fit */
    <div style={{ minHeight: "100vh", padding: "clamp(8px, 2vh, 24px) 16px", boxSizing: "border-box", background: "transparent", display: "flex", alignItems: "flex-start", justifyContent: "center", fontFamily: "'Heebo',sans-serif", position: "relative", paddingTop: "clamp(8px, 2vh, 24px)" }}>

      {/* Exit Intent Modal (desktop) */}
      {showExit && <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 360, padding: 24, textAlign: "center", direction: "rtl", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", animation: "fadeSlideUp 0.3s ease" }}>
          <div style={{ width: 60, height: 60, borderRadius: 30, background: "linear-gradient(135deg,#25D366,#128C7E)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Ico name="wa" color="#fff" size={32}/></div>
          <h3 style={{ margin: "0 0 8px", color: "#1a1a2e", fontSize: 20, fontWeight: 800 }}>מתלבטים?</h3>
          <p style={{ margin: "0 0 24px", color: "#666", fontSize: 14, lineHeight: 1.5 }}>יש לכם שאלה לפני שמזמינים? דברו ישירות עם ליאור המאמן בוואטסאפ ונעזור לכם למצוא את המסגרת המתאימה ביותר.</p>
          <a href={waLink(CFG.waPhone, "היי ליאור, הגעתי מהאתר ויש לי שאלה לגבי האימונים באלמנט...")} target="_blank" rel="noopener noreferrer" onClick={() => setShowExit(false)} style={{ display: "block", background: "linear-gradient(135deg,#25D366,#128C7E)", color: "#fff", textDecoration: "none", padding: "14px", borderRadius: 12, fontWeight: 700, fontSize: 15, marginBottom: 12 }}>שיחה בוואטסאפ</a>
          <button onClick={() => setShowExit(false)} style={{ background: "none", border: "none", color: "#999", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>לא תודה, אחזור להזמנה</button>
        </div>
      </div>}

      {/* Idle Timeout Modal (#9 — mobile + desktop, 60s inactivity) */}
      {showIdle && <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 998, padding: "0 16px 16px", display: "flex", justifyContent: "center" }}>
        <div style={{ direction: "rtl", background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, padding: "20px 20px 16px", boxShadow: "0 -4px 24px rgba(0,0,0,0.12)", border: "1px solid #E8E7E3", animation: "fadeSlideUp 0.3s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: "linear-gradient(135deg,#25D366,#128C7E)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ico name="wa" color="#fff" size={20}/></div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>צריכים עזרה? 😊</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>אנחנו כאן בשבילכם – שלחו הודעה ונעזור לסיים את ההרשמה</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={waLink(CFG.waPhone, idleWaMsg)} target="_blank" rel="noopener noreferrer" onClick={() => setShowIdle(false)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 10, background: "linear-gradient(135deg,#25D366,#128C7E)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: "inherit" }}><Ico name="wa" color="#fff" size={14}/> שלחו הודעה</a>
            <button onClick={() => setShowIdle(false)} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid #E0E0DC", background: "#fff", color: "#666", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>ממשיך/ה</button>
          </div>
        </div>
      </div>}

      {/* Widget Card */}
      <div style={{ direction: "rtl", width: "100%", maxWidth: step === "branch" ? 540 : 460, background: "#FEFEFE", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", transition: "max-width 0.3s", position: "relative", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ background: headerBg, borderBottom: step !== "qual" ? `2px solid ${uc}` : "2px solid #1a1c29", padding: "24px 20px 20px", color: "#fff", position: "relative", transition: "background 0.4s ease,border-bottom 0.3s" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.035, backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "22px 22px" }}/>
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: "50%", overflow: "hidden", boxShadow: "0 0 0 1.5px rgba(212,168,67,0.4), 0 3px 10px rgba(0,0,0,0.3)" }}>
              <img src="https://element-m-a-m.github.io/book-first-classes/element-logo-circle.png" alt="Element Studio" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{ht[0]}</div>
              {ht[1] && <div style={{ fontSize: "clamp(9.5px,2.5vw,11px)", opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ht[1]}</div>}
            </div>
          </div>
          {step !== "qual" && <div style={{ display: "flex", gap: 4, marginTop: 18 }}>
            {Array.from({ length: totalSteps }).map((_,i) => <div key={i} style={{ height: 3, borderRadius: 2, flex: si >= i ? 2 : 1, background: si > i ? (isDone ? "#7DFFCC" : "#00E5A0") : si === i ? "#fff" : "rgba(255,255,255,0.2)", transition: "all 0.4s" }}/>)}
          </div>}
        </div>

        {/* Mini breadcrumb bar (steps 3-5 of group flow) */}
        {si > 1 && si < 5 && !isP && <div style={{ background: "#F8F7F4", padding: "10px 18px", fontSize: 11.5, color: "#555", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #EEEEE9", fontWeight: 500 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Ico name="cart" color="#888" size={14}/><span>הזמנה: {cat?.label} {pkgObj ? `• ${pkgObj.label}` : ''}</span></div>
          {pkgObj && <span style={{ fontWeight: 800, color: uc, fontSize: 13 }}>₪{currentPrice}</span>}
        </div>}

        {/* Scrollable body with step content */}
        <div className="widget-scroll" style={{ padding: "14px 18px 20px", height: "65vh", minHeight: 400, maxHeight: 550, overflowY: "auto", overflowX: "hidden", opacity: vis ? 1 : 0, transform: vis ? "translateX(0) scale(1)" : (animDir === "f" ? "translateX(-20px) scale(0.98)" : "translateX(20px) scale(0.98)"), transition: "opacity 0.2s cubic-bezier(0.2,0.8,0.2,1),transform 0.2s cubic-bezier(0.2,0.8,0.2,1)" }}>
          {stepMap[step]?.()}
        </div>
      </div>
    </div>
  );
}
