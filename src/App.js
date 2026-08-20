import { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, increment, update, onValue } from "firebase/database";
import coursesData from "./courses.json";
import degreesData from "./degrees.json";
import facultyCoursesData from "./faculty_courses.json";

// ── Paste your Firebase config here ──────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBlvgEsGkOyV1NI5hWgb5kznS2w5sXfwns",
  authDomain:        "suprereq.firebaseapp.com",
  databaseURL:       "https://suprereq-default-rtdb.firebaseio.com",
  projectId:         "suprereq",
  storageBucket:     "suprereq.firebasestorage.app",
  messagingSenderId: "1037068272992",
  appId:             "1:1037068272992:web:35f042eea131675bf78a05",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const DEPT_COLORS = {
  CS: "#38bdf8", MATH: "#e84545", EE: "#fb923c",
  ENS: "#666ace", DSA: "#818cf8", BIO: "#4ade80",
  ME: "#fbbf24", IF: "#6c8ab5", ACC: "#cc6198",
  ECON: "#2dd4bf", SPS: "#e49c1e", PHYS: "#60a5fa",
  NS: "#24be44", GEN: "#f35fe1", CHEM: "#8228bd",
  HIST: "#8e834b", TLL: "#f3cb97", CULT: "#e7d269",
  ENRG: "#53e264", FIN: "#3279b3", HART: "#c378f5",
  ANTH: "#ec982b", HUM: "#eb642a", IE: "#4acaea",
  IR: "#74fea7", LAW: "#b15abd", MAT: "#878787",
};

function deptColor(code = "") {
  for (const [k, v] of Object.entries(DEPT_COLORS))
    if (code.toUpperCase().startsWith(k)) return v;
  return "#64748b";
}

function norm(s = "") { return s.trim().toUpperCase().replace(/\s+/g, " "); }

function courseUrl(code) {
  return `https://www.sabanciuniv.edu/en/aday-ogrenciler/lisans/ders-katalogu/course/${code.replace(/\s+/g, "-")}`;
}

// ── Reusable course card ──────────────────────────────────────
function CourseCard({ course, highlightCode, onSearch }) {
  const col = deptColor(course.code);
  return (
    <div
      onClick={() => onSearch(course.code)}
      title={`Search ${course.code}`}
      style={{
        background: "rgba(255,255,255,0.022)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `3px solid ${col}`,
        borderRadius: 8, padding: "13px 16px",
        transition: "background 0.18s",
        cursor: "pointer",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.045)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.022)"}
    >
      {/* Code link — stop propagation so it opens URL instead of searching */}
      <a
        href={courseUrl(course.code)}
        target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{
          fontSize: 13, fontWeight: 700, color: col,
          letterSpacing: "0.05em", textDecoration: "none",
          borderBottom: `1px dashed ${col}55`,
          transition: "border-color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderBottomColor = col}
        onMouseLeave={e => e.currentTarget.style.borderBottomColor = `${col}55`}
      >
        {course.code} ↗
      </a>
      {/* Name */}
      {course.name && course.name !== course.code && (
        <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500, marginTop: 5, marginBottom: 6, lineHeight: 1.4 }}>
          {course.name}
        </div>
      )}
      {/* Prereq tags — stop propagation so they search the tag, not the card */}
      {course.prereqs && course.prereqs.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "#334155", letterSpacing: "0.12em", marginRight: 2 }}>PREREQS:</span>
          {course.prereqs.map(p => {
            const isTarget = highlightCode && norm(p) === norm(highlightCode);
            const pc = deptColor(p);
            return (
              <span key={p}
                onClick={e => { e.stopPropagation(); onSearch(norm(p)); }}
                title={`Search ${p}`}
                style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 4,
                  cursor: "pointer", letterSpacing: "0.05em",
                  fontWeight: isTarget ? 700 : 400,
                  border: "1px solid",
                  borderColor: isTarget ? pc : "rgba(255,255,255,0.07)",
                  background: isTarget ? `${pc}22` : "rgba(255,255,255,0.04)",
                  color: isTarget ? pc : "#64748b",
                  transition: "all 0.14s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = pc; e.currentTarget.style.color = pc; }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isTarget ? pc : "rgba(255,255,255,0.07)";
                  e.currentTarget.style.color = isTarget ? pc : "#64748b";
                }}
              >{p}</span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Column component ──────────────────────────────────────────
function Column({ title, accent, count, children, emptyMsg }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Column header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 12, paddingBottom: 10,
        borderBottom: `1px solid ${accent}22`,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
          textTransform: "uppercase", color: accent,
        }}>{title}</span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          padding: "2px 8px", borderRadius: 20,
          background: `${accent}18`, color: accent,
        }}>{count}</span>
      </div>
      {/* Cards */}
      {count === 0 ? (
        <div style={{
          padding: "28px 16px", textAlign: "center",
          border: "1px dashed rgba(100,116,139,0.2)", borderRadius: 8,
          color: "#334155", fontSize: 12,
        }}>{emptyMsg}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Static constants outside component ───────────────────────
const TYPE_LABELS = {
  university_courses: "University Courses",
  required:           "Required Courses",
  core_electives:     "Core Electives",
  area_electives:     "Area Electives",
  free_electives:     "Free Electives",
};

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [input, setInput]               = useState("");
  const [searched, setSearched]         = useState(false);
  const [showDrop, setShowDrop]         = useState(false);
  const [result, setResult]             = useState(null);
  const [popularSearches, setPopularSearches] = useState([]);
  const [firebaseLoaded, setFirebaseLoaded]   = useState(false);
  const [selDegrees, setSelDegrees]           = useState(new Set()); // selected degree codes
  const [selTypes, setSelTypes]               = useState(new Set()); // selected course types
  const [filterMode, setFilterMode]           = useState("union"); // "union" or "intersection"
  const [selFaculties, setSelFaculties]         = useState(new Set()); // "FENS", "FASS", "FMAN"

  // ── Degree + course-type data ─────────────────────────────────
  // Define display order: engineering/FENS first, then FASS/SBS
  const DEGREE_ORDER = [
    "BSCS", "BSEE", "BSMS", "BSMAT", "BSME", "BSBIO", "BSDSA",  // FENS
    "BAECON", "BAMAN", "BAPSIR", "BAPSY", "BAVACD",               // FASS/SBS
  ];
  const DEGREES = useMemo(() => {
    const all = degreesData?.degrees || [];
    return [...all].sort((a, b) => {
      const ai = DEGREE_ORDER.indexOf(a.code);
      const bi = DEGREE_ORDER.indexOf(b.code);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Faculty courses loaded from separate JSON
  const FACULTY_COURSES = useMemo(() => ({
    FENS: facultyCoursesData?.FENS?.map(c => c.toUpperCase()) || [],
    FASS: facultyCoursesData?.FASS?.map(c => c.toUpperCase()) || [],
    FMAN: facultyCoursesData?.FMAN?.map(c => c.toUpperCase()) || [],
  }), []);

  function toggleFaculty(fac) {
    setSelFaculties(prev => {
      const next = new Set(prev);
      next.has(fac) ? next.delete(fac) : next.add(fac);
      return next;
    });
  }

  // Build a Set of course codes that pass the current filter
  const filteredCodes = useMemo(() => {
    // If no filters active at all, show everything
    if (selDegrees.size === 0 && selTypes.size === 0 && selFaculties.size === 0) return null;

    // Build faculty set first
    const facSet = new Set();
    for (const fac of selFaculties) {
      (FACULTY_COURSES[fac] || []).forEach(c => facSet.add(c));
    }

    // If ONLY faculty is selected (no degree/type filters), just return faculty set
    if (selDegrees.size === 0 && selTypes.size === 0) return facSet;

    const types = selTypes.size > 0 ? [...selTypes] : Object.keys(TYPE_LABELS);
    const activeDegrees = DEGREES.filter(d => selDegrees.size === 0 || selDegrees.has(d.code));

    let baseCodes;
    if (filterMode === "union") {
      // UNION: collect all courses from all selected degrees + types
      const codes = new Set();
      for (const deg of activeDegrees) {
        for (const t of types) {
          (deg[t] || []).forEach(c => codes.add(c.toUpperCase()));
        }
      }
      baseCodes = codes;
    } else {
      // INTERSECTION: for each degree compute union of selected types,
      // then intersect across degrees
      const perDegree = activeDegrees.map(deg => {
        const s = new Set();
        for (const t of types) {
          (deg[t] || []).forEach(c => s.add(c.toUpperCase()));
        }
        return s;
      });
      const intersected = new Set(perDegree[0]);
      for (let i = 1; i < perDegree.length; i++) {
        for (const c of intersected) {
          if (!perDegree[i].has(c)) intersected.delete(c);
        }
      }
      baseCodes = intersected;
    }

    // Apply faculty filter on top of degree/type filter
    if (selFaculties.size === 0) return baseCodes;
    if (filterMode === "union") {
      // Union: add faculty courses to existing set
      for (const c of facSet) baseCodes.add(c);
      return baseCodes;
    } else {
      // Intersection: keep only courses in both base and faculty
      return new Set([...baseCodes].filter(c => facSet.has(c)));
    }
  }, [selDegrees, selTypes, filterMode, selFaculties, DEGREES, FACULTY_COURSES]);

  function toggleDegree(code) {
    setSelDegrees(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function toggleType(type) {
    setSelTypes(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }

  function clearFilters() {
    setSelDegrees(new Set());
    setSelTypes(new Set());
    setFilterMode("union");
    setSelFaculties(new Set());
  }

  // Re-run search automatically when filters change
  useEffect(() => {
    if (searched && input) doSearch(input);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load directly from bundled JSON — no backend needed
  const allCourses = useMemo(() => coursesData.courses || [], []);
  const status     = useMemo(() => ({ scrapedAt: coursesData.scrapedAt, totalCourses: coursesData.totalCourses, ageInDays: Math.round((Date.now() - new Date(coursesData.scrapedAt)) / (1000 * 60 * 60 * 24)) }), []);
  
  // ── Load popular searches from Firebase (live) ───────────────
  useEffect(() => {
    const searchesRef = ref(db, "searches");
    const unsub = onValue(searchesRef, snapshot => {
      const data = snapshot.val() || {};
      const sorted = Object.entries(data)
        .map(([code, count]) => ({ code: code.replace(/_/g, " "), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setPopularSearches(sorted);
      setFirebaseLoaded(true);
    });
    return () => unsub();
  }, []);

  const suggestions = useMemo(() => {
    const q = input.trim().toUpperCase();
    const base = [...allCourses]
      .filter(c => !filteredCodes || filteredCodes.has(c.code.toUpperCase()))
      .sort((a, b) => a.code.localeCompare(b.code));
    if (q.length === 0) return base;
    if (q.length < 2) return [];
    return base.filter(c =>
      c.code.toUpperCase().includes(q) || c.name.toUpperCase().includes(q)
    );
  }, [input, allCourses, filteredCodes]);

  function doSearch(code) {
    const target = norm(code ?? input);
    if (!target) return;
    setInput(target);
    setSearched(true);
    setShowDrop(false);

    // Record search in Firebase (use underscores since Firebase keys can't have spaces)
    const key = target.replace(/\s+/g, "_");
    update(ref(db, "searches"), { [key]: increment(1) }).catch(() => {});

    const dependents = allCourses.filter(c =>
      c.prereqs.some(p => p.toUpperCase() === target) &&
      (!filteredCodes || filteredCodes.has(c.code.toUpperCase()))
    );
    const sourceCourse = allCourses.find(c => c.code.toUpperCase() === target) || null;
    setResult({ target, dependents, sourceCourse });
  }

  const targetColor = deptColor(norm(input).split(" ")[0]);

  return (
    <div style={{
      minHeight: "100vh", background: "#07090f", color: "#dde3ee",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background effects */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(rgba(56,189,248,0.07) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div style={{ position: "fixed", top: -300, left: -200, width: 700, height: 700, borderRadius: "50%", pointerEvents: "none", background: "radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 65%)" }} />
      <div style={{ position: "fixed", bottom: -250, right: -150, width: 600, height: 600, borderRadius: "50%", pointerEvents: "none", background: "radial-gradient(circle, rgba(192,132,252,0.06) 0%, transparent 65%)" }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: `52px 20px ${searched ? "80px" : "240px"}`, position: "relative" }}>

        {/* ── Header ───────────────────────────────────────── */}
        <div style={{ marginBottom: 44 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", background: "#38bdf8", boxShadow: "0 0 10px #38bdf8" }} />
            <span style={{ fontSize: 11, letterSpacing: "0.22em", color: "#38bdf8", textTransform: "uppercase" }}>Sabancı University</span>
            {status && (
              <span style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700, letterSpacing: "0.06em",
                background: status.ageInDays > 30 ? "rgba(251,146,60,0.15)" : "rgba(52,211,153,0.12)",
                color: status.ageInDays > 30 ? "#fb923c" : "#34d399",
              }}>
                {status.totalCourses} courses · last scraped {status.ageInDays === 0 ? "today" : `${status.ageInDays}d ago`}
              </span>
            )}
            {status?.ageInDays > 30 && (
              <span style={{ fontSize: 11, color: "#fb923c" }}>
                ↻ run <code style={{ background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 3 }}>node server.js --scrape</code> to refresh
              </span>
            )}
          </div>
          <h1 style={{
            fontSize: "clamp(26px, 5vw, 44px)", fontWeight: 800,
            letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 10px",
            background: "linear-gradient(120deg, #e2e8f0 30%, #64748b 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Course Prerequisite<br />Dependency Finder
          </h1>
          <p style={{ color: "#475569", fontSize: 13, margin: 0, lineHeight: 1.7 }}>
            Enter a course code to see what it requires and what requires it.<br />
            Data loaded from a local snapshot of the Sabancı course catalog.
          </p>
        </div>

        {/* ── Error banner ─────────────────────────────────── */}

        {/* ── Data freshness bar ────────────────────────────── */}
        {status && (
          <div style={{ marginBottom: 28, padding: "11px 18px", background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.1)", borderRadius: 8, fontSize: 12, color: "#475569" }}>
            <span>📅 Data snapshot from <strong style={{ color: "#94a3b8" }}>{new Date(status.scrapedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong></span>
          </div>
        )}

        {/* ── Degree data warning ─────────────────────────── */}
        {DEGREES.length > 0 && (
          <div style={{ marginBottom: 16, padding: "10px 16px", background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 8, fontSize: 12, color: "#fb923c", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <span>The degree program course lists (University Courses, Required, Electives) below are only valid for students who enrolled in <strong style={{ color: "#fbbf24" }}>Fall 2025–2026</strong>. If you enrolled in a different year, your degree requirements may differ. Also, always verify the degree requirements yourself.</span>
          </div>
        )}

        {/* ── Filter panel ─────────────────────────────────── */}
        {DEGREES.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {/* Degree buttons — split into two rows by faculty */}
            {(() => {
              const FENS_CODES = new Set(["BSCS","BSEE","BSMS","BSMAT","BSME","BSBIO","BSDSA"]);
              const fensDegrees = DEGREES.filter(d => FENS_CODES.has(d.code));
              const fassDegrees = DEGREES.filter(d => !FENS_CODES.has(d.code));
              const DegBtn = (deg) => {
                const active = selDegrees.has(deg.code);
                return (
                  <button key={deg.code} onClick={() => toggleDegree(deg.code)}
                    style={{
                      fontSize: 11, padding: "4px 10px", borderRadius: 5,
                      fontFamily: "inherit", fontWeight: 700, letterSpacing: "0.05em",
                      cursor: "pointer", transition: "all 0.14s",
                      border: "1px solid",
                      borderColor: active ? "#38bdf8" : "rgba(255,255,255,0.08)",
                      background: active ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.03)",
                      color: active ? "#38bdf8" : "#475569",
                      maxWidth: 130, whiteSpace: "normal", textAlign: "left", lineHeight: 1.4,
                    }}
                  >{deg.name}</button>
                );
              };
              return (
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 10, color: "#334155", letterSpacing: "0.16em", textTransform: "uppercase", marginRight: 10 }}>Degree</span>
                  {/* FENS row */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, marginBottom: 6 }}>
                    {fensDegrees.map(DegBtn)}
                  </div>
                  {/* FASS/SBS row */}
                  {fassDegrees.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {fassDegrees.map(DegBtn)}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Course type buttons */}
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: "#334155", letterSpacing: "0.16em", textTransform: "uppercase", marginRight: 10 }}>Type</span>
              <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {Object.entries(TYPE_LABELS).map(([key, label]) => {
                  const active = selTypes.has(key);
                  return (
                    <button key={key} onClick={() => toggleType(key)}
                      style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 5,
                        fontFamily: "inherit", fontWeight: 700, letterSpacing: "0.05em",
                        cursor: "pointer", transition: "all 0.14s",
                        border: "1px solid",
                        borderColor: active ? "#c084fc" : "rgba(255,255,255,0.08)",
                        background: active ? "rgba(192,132,252,0.12)" : "rgba(255,255,255,0.03)",
                        color: active ? "#c084fc" : "#475569",
                      }}
                    >{label}</button>
                  );
                })}
              </div>
            </div>
            {/* Faculty course buttons */}
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: "#334155", letterSpacing: "0.16em", textTransform: "uppercase", marginRight: 10 }}>Faculty Courses</span>
              <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {[
                  { key: "FENS", label: "FENS Courses" },
                  { key: "FASS", label: "FASS Courses" },
                  { key: "FMAN", label: "FMAN Courses" },
                ].map(({ key, label }) => {
                  const active = selFaculties.has(key);
                  return (
                    <button key={key} onClick={() => toggleFaculty(key)}
                      style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 5,
                        fontFamily: "inherit", fontWeight: 700, letterSpacing: "0.05em",
                        cursor: "pointer", transition: "all 0.14s",
                        border: "1px solid",
                        borderColor: active ? "#34d399" : "rgba(255,255,255,0.08)",
                        background: active ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.03)",
                        color: active ? "#34d399" : "#475569",
                      }}
                    >{label}</button>
                  );
                })}
              </div>
            </div>
            {/* Active filter summary + clear */}
            {(selDegrees.size > 0 || selTypes.size > 0 || selFaculties.size > 0) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, color: "#475569" }}>
                    <span style={{ color: "rgba(56,189,248,0.7)", fontWeight: 700 }}>Showing {filteredCodes ? filteredCodes.size : "all"} courses</span>
                    {selDegrees.size > 0 && ` · ${DEGREES.filter(d => selDegrees.has(d.code)).map(d => d.name).join(", ")}`}
                    {selTypes.size > 0 && ` · ${[...selTypes].map(t => TYPE_LABELS[t]).join(", ")}`}
                    {selFaculties.size > 0 && ` · ${[...selFaculties].join(", ")} faculty`}
                  </span>
                  <button onClick={clearFilters}
                    style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 4,
                      fontFamily: "inherit", cursor: "pointer",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)", color: "#64748b",
                    }}
                  >✕ clear</button>
                </div>
                {(selDegrees.size > 1 || (selDegrees.size >= 1 && selFaculties.size >= 1)) && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", flexShrink: 0, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
                      {["union", "intersection"].map(mode => (
                        <button key={mode} onClick={() => setFilterMode(mode)}
                          style={{
                            fontSize: 10, padding: "4px 0", fontFamily: "inherit",
                            fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                            cursor: "pointer", border: "none", transition: "all 0.14s",
                            width: 80, textAlign: "center", flexShrink: 0,
                            background: filterMode === mode ? (mode === "union" ? "rgba(56,189,248,0.18)" : "rgba(192,132,252,0.18)") : "transparent",
                            color: filterMode === mode ? (mode === "union" ? "#38bdf8" : "#c084fc") : "#475569",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.3 }}>
                            <span>{mode === "union" ? "Union" : "Intersect"}</span>
                            <span>{mode === "union" ? "∪" : "∩"}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <span style={{ fontSize: 10, color: "#334155", paddingTop: 2 }}>
                      {filterMode === "union"
                        ? "Courses from any selected degree or faculty"
                        : "Courses common to all selected degrees, filtered by faculty"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Search bar ───────────────────────────────────── */}
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "center" }}>
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap",
            width: "100%", maxWidth: searched ? "100%" : 560,
            transition: "max-width 0.3s ease",
          }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <input
                value={input}
                onChange={e => { setInput(e.target.value); setSearched(false); setShowDrop(true); }}
                onKeyDown={e => e.key === "Enter" && doSearch()}
                onFocus={() => setShowDrop(true)}
                onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                placeholder="e.g. CS 204, MATH 203, IF 100 …"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(56,189,248,0.18)",
                  borderRadius: 8, padding: input ? "13px 40px 13px 16px" : "13px 16px", color: "#dde3ee", fontSize: 14,
                  fontFamily: "inherit", letterSpacing: "0.04em", outline: "none", transition: "border-color 0.2s",
                }}
                onFocusCapture={e => e.target.style.borderColor = "rgba(56,189,248,0.5)"}
                onBlurCapture={e => e.target.style.borderColor = "rgba(56,189,248,0.18)"}
              />
              {input && (
                <button
                  onMouseDown={e => {
                    e.preventDefault();
                    setInput("");
                    setSearched(false);
                    setResult(null);
                    setShowDrop(false);
                  }}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#475569", fontSize: 16, lineHeight: 1,
                    padding: "4px", borderRadius: 4, display: "flex", alignItems: "center",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
                  onMouseLeave={e => e.currentTarget.style.color = "#475569"}
                  title="Clear search"
                >✕</button>
              )}
              {showDrop && suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "#0d1520", border: "1px solid rgba(56,189,248,0.18)", borderRadius: 8, marginTop: 4, overflowY: "auto", maxHeight: 280 }}>
                  {suggestions.map(c => (
                    <div key={c.code} onMouseDown={() => doSearch(c.code)}
                      style={{ padding: "9px 16px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(56,189,248,0.07)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: deptColor(c.code), minWidth: 72 }}>{c.code}</span>
                      {c.name && c.name !== c.code && <span style={{ fontSize: 11, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => doSearch()}
              style={{
                background: "linear-gradient(135deg,#0369a1,#1e3a5f)",
                border: "none", borderRadius: 8, padding: "13px 26px", color: "#e2e8f0",
                fontSize: 12, fontFamily: "inherit", fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", cursor: "pointer",
                whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8,
              }}
            >
              SEARCH →
            </button>
          </div>
        </div>

        {/* ── Results ──────────────────────────────────────── */}
        {searched && (
          <div>
            {/* Status bar with clickable course name */}
            <div style={{
              marginBottom: 24, padding: "14px 18px",
              background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.12)",
              borderRadius: 8, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
            }}>
              {/* Clickable course code → opens catalog page */}
              <a
                href={courseUrl(norm(input))}
                target="_blank" rel="noopener noreferrer"
                style={{
                  fontWeight: 700, fontSize: 15, color: targetColor,
                  textDecoration: "none", letterSpacing: "0.05em",
                  borderBottom: `1px dashed ${targetColor}55`,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderBottomColor = targetColor}
                onMouseLeave={e => e.currentTarget.style.borderBottomColor = `${targetColor}55`}
              >
                {norm(input)} ↗
              </a>
              {result?.sourceCourse?.name && result.sourceCourse.name !== norm(input) && (
                <>
                  <span style={{ color: "#334155" }}>·</span>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{result.sourceCourse.name}</span>
                </>
              )}
              <span style={{ color: "#334155" }}>·</span>
              <span style={{ fontSize: 12, color: "#475569" }}>prerequisite dependency lookup</span>
            </div>

            {/* ── 2-column layout ────────────────────────────── */}
            {result && (
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

                {/* LEFT: courses that require this course */}
                <Column
                  title="Courses that require this"
                  accent="#38bdf8"
                  count={result.dependents.length}
                  emptyMsg="No courses require this as a prerequisite."
                >
                  {result.dependents.map(course => (
                    <CourseCard
                      key={course.code}
                      course={course}
                      highlightCode={result.target}
                      onSearch={doSearch}
                    />
                  ))}
                </Column>

                {/* Divider */}
                <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.06)", flexShrink: 0, display: "none" }} className="col-divider" />

                {/* RIGHT: prerequisites of this course */}
                {(() => {
                  // Filter out co-requisites: codes that end with a letter (e.g. CS 204L, MATH 102R)
                  // and codes that contain the searched course code (same base number)
                  const rawPrereqs = result.sourceCourse?.prereqs || [];
                  const filteredPrereqs = rawPrereqs.filter(p => {
                    // Co-requisites end with a letter after the number, e.g. "CS 204L"
                    if (/\d[A-Z]$/.test(p.trim())) return false;
                    return true;
                  });
                  // Look up full details for each prereq from allCourses
                  const prereqCourses = filteredPrereqs.map(p =>
                    allCourses.find(c => c.code.toUpperCase() === p.toUpperCase()) || { code: p, name: "", prereqs: [] }
                  );
                  return (
                    <Column
                      title="Prerequisites of this course"
                      accent="#c084fc"
                      count={prereqCourses.length}
                      emptyMsg="This course has no prerequisites."
                    >
                      {prereqCourses.map(course => (
                        <CourseCard
                          key={course.code}
                          course={course}
                          highlightCode={null}
                          onSearch={doSearch}
                        />
                      ))}
                    </Column>
                  );
                })()}

              </div>
            )}
          </div>
        )}

        {/* ── Idle: popular searches ────────────────────────── */}
        {!searched && firebaseLoaded && popularSearches.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 11, color: "#94a3b8", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}>
              🔥 Most searched
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {popularSearches.map(({ code }) => (
                <button key={code} onClick={() => doSearch(code)}
                  style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 6, padding: "7px 14px", color: deptColor(code), fontSize: 12,
                    fontFamily: "inherit", fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.14s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                >{code}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────── */}
        <div style={{
          marginTop: 72, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.04)",
          fontSize: 10, color: "#1e293b", letterSpacing: "0.12em",
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6,
        }}>
          <span>SABANCI UNIVERSITY PREREQUISITE FINDER</span>
          <span>CLICK PREREQ TAGS TO PIVOT</span>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: #1e3a5f; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .col-divider { display: none !important; }
        }
      `}</style>
    </div>
  );
}
