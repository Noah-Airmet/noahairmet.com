"use strict";

// ================= Helpers =================
const $ = (sel, el) => (el || document).querySelector(sel);
const uid = () => "x" + Math.random().toString(36).slice(2, 9);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
function ymd(d) {
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function fromYmd(s) { return new Date(s + "T12:00:00"); }
function prettyDate(d) { return d.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" }); }
function startOfWeek(d) { const c = new Date(d); c.setDate(c.getDate() - c.getDay()); c.setHours(12,0,0,0); return c; }

// ================= Weekly plan (Sun → Sat) =================
const PLAN = [
  { type:"rest", title:"Rest Day", emoji:"🌙",
    blurb:"Full rest today. Recovery is where you actually get stronger — you're doing double duty already." },
  { type:"strength", title:"Posture & Upper Back A", emoji:"🐝", exercises:[
    { name:"Seated Cable Row", note:"Squeeze shoulder blades, pause 1 sec" },
    { name:"Lat Pulldown", note:"Pull to collarbone, stay upright" },
    { name:"Face Pulls", note:"Rope at face height — posture MVP" },
    { name:"TRX Rows", note:"Upright angle, conversational effort" },
    { name:"Seated Reverse Fly", note:"Light dumbbells, 5–10 lb" },
  ]},
  { type:"strength", title:"Lower Body Strength", emoji:"🦵", exercises:[
    { name:"Leg Press", note:"Feet mid-high on platform, don't lock knees" },
    { name:"Goblet Box Squat", note:"Kettlebell at chest, sit back to bench, wide stance" },
    { name:"Leg Extension", note:"Light-moderate, smooth and controlled" },
    { name:"Standing Calf Raise", note:"Full stretch at bottom, pause at top" },
    { name:"Cable Glute Kickback", note:"Ankle strap, hold the frame, squeeze" },
  ]},
  { type:"recovery", title:"Cardio & Mobility", emoji:"🚶‍♀️",
    blurb:"Easy movement day — keep everything at a chatting pace.", items:[
    "Recumbent bike — 20–25 min, easy",
    "Cat-cow stretch — 10 slow reps",
    "Wall angels — 2 × 10",
    "Foam roll upper back — 2 min",
    "Doorway chest stretch — 2 × 30 sec",
  ]},
  { type:"strength", title:"Posture & Upper Back B", emoji:"💪", exercises:[
    { name:"Diverging Lat Pulldown", note:"Arms sweep wide, chest tall" },
    { name:"Single-Arm Dumbbell Row", note:"Hand on bench, flat back, pull to hip" },
    { name:"Straight-Arm Pulldown", note:"Cable bar, arms straight, sweep to thighs" },
    { name:"Cable Reverse Fly", note:"Crossover machine, open arms like wings" },
    { name:"Farmer Carry", note:"Walk tall! Log steps in the reps box" },
  ]},
  { type:"strength", title:"Full Body Strength", emoji:"✨", exercises:[
    { name:"Box Squat", note:"Squat rack + bench — sit back, stand tall" },
    { name:"Seated Shoulder Press", note:"Back supported, light-moderate dumbbells" },
    { name:"Seated Cable Row", note:"Squeeze shoulder blades, pause 1 sec" },
    { name:"Pallof Press", note:"Bump-safe core — resist the twist" },
    { name:"Suitcase Carry", note:"One dumbbell, stay level. Log steps as reps" },
  ]},
  { type:"recovery", title:"Gentle Movement", emoji:"🌼",
    blurb:"Optional easy day — move a little, or don't. Both count.", items:[
    "Walk or easy elliptical — 20–30 min",
    "Stretch trainer machine — 5 min",
    "Foam roll anything that feels tight",
    "Hydrate + protein snack 🍯",
  ]},
];

// ================= Demos =================
const F = 'stroke="#4A3421" stroke-width="3" stroke-linecap="round" fill="none"';
const C = 'stroke="#D98B1F" stroke-width="2" stroke-dasharray="3 3" fill="none"';
const svgWrap = inner => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const DEMOS = {
  "Seated Cable Row": {
    cues: [
      "Sit tall at the cable row, feet braced on the platform",
      "Start with arms extended, shoulders relaxed",
      "Pull the handle to your belly button, elbows sliding back",
      "Squeeze your shoulder blades together, pause 1 second",
      "Slowly straighten arms back out — don't let the weight yank you",
    ],
    frames: [
      svgWrap(`<line x1="20" y1="30" x2="20" y2="90" ${F} stroke-width="4"/><line x1="20" y1="48" x2="40" y2="46" ${C}/><circle cx="64" cy="26" r="6" ${F}/><line x1="64" y1="32" x2="64" y2="58" ${F}/><polyline points="64,58 46,56 32,66" ${F}/><line x1="64" y1="38" x2="40" y2="46" ${F}/>`),
      svgWrap(`<line x1="20" y1="30" x2="20" y2="90" ${F} stroke-width="4"/><line x1="20" y1="48" x2="58" y2="50" ${C}/><circle cx="64" cy="24" r="6" ${F}/><line x1="64" y1="30" x2="64" y2="58" ${F}/><polyline points="64,58 46,56 32,66" ${F}/><polyline points="64,36 76,46 58,50" ${F}/>`),
    ],
  },
  "Lat Pulldown": {
    cues: [
      "Grip the bar a bit wider than shoulders, thighs under the pads",
      "Lean back just slightly — stay tall, no big arch",
      "Pull the bar down to your collarbone, elbows driving toward your ribs",
      "Feel it in the sides of your back, not your arms",
      "Control the bar all the way back up",
    ],
    frames: [
      svgWrap(`<line x1="32" y1="12" x2="68" y2="12" ${F} stroke-width="4"/><circle cx="50" cy="30" r="6" ${F}/><line x1="50" y1="36" x2="50" y2="60" ${F}/><polyline points="50,60 40,74 40,86" ${F}/><polyline points="50,60 60,74 60,86" ${F}/><line x1="45" y1="38" x2="35" y2="13" ${F}/><line x1="55" y1="38" x2="65" y2="13" ${F}/>`),
      svgWrap(`<line x1="34" y1="38" x2="66" y2="38" ${F} stroke-width="4"/><circle cx="50" cy="26" r="6" ${F}/><line x1="50" y1="32" x2="50" y2="60" ${F}/><polyline points="50,60 40,74 40,86" ${F}/><polyline points="50,60 60,74 60,86" ${F}/><polyline points="45,36 34,48 35,39" ${F}/><polyline points="55,36 66,48 65,39" ${F}/>`),
    ],
  },
  "Face Pulls": {
    cues: [
      "Set the rope attachment at face height on the cable machine",
      "Grab the rope ends palms facing each other, step back until arms are straight",
      "Pull the rope toward your nose — elbows flare HIGH and wide",
      "End position looks like a double biceps flex 💪 — hands beside your ears",
      "Pause, then slowly extend back out. Keep it light!",
    ],
    frames: [
      svgWrap(`<line x1="16" y1="10" x2="16" y2="90" ${F} stroke-width="4"/><circle cx="16" cy="30" r="3" fill="#D98B1F"/><line x1="16" y1="30" x2="42" y2="32" ${C}/><circle cx="62" cy="28" r="6" ${F}/><line x1="62" y1="34" x2="62" y2="62" ${F}/><polyline points="62,62 55,88" ${F}/><polyline points="62,62 70,88" ${F}/><line x1="62" y1="38" x2="42" y2="32" ${F}/>`),
      svgWrap(`<line x1="16" y1="10" x2="16" y2="90" ${F} stroke-width="4"/><circle cx="16" cy="30" r="3" fill="#D98B1F"/><line x1="16" y1="30" x2="54" y2="26" ${C}/><circle cx="62" cy="28" r="6" ${F}/><line x1="62" y1="34" x2="62" y2="62" ${F}/><polyline points="62,62 55,88" ${F}/><polyline points="62,62 70,88" ${F}/><polyline points="62,38 74,32 54,26" ${F}/>`),
    ],
  },
  "TRX Rows": {
    cues: [
      "Hold the TRX handles, walk feet forward and lean back — arms straight",
      "The more upright you stand, the easier it is — adjust by trimester",
      "Keep your body in one straight line, bump and all",
      "Pull your chest up to your hands, elbows tight to your sides",
      "Lower back down slow and controlled",
    ],
    frames: [
      svgWrap(`<circle cx="72" cy="8" r="3" fill="#D98B1F"/><line x1="72" y1="8" x2="66" y2="34" ${C}/><circle cx="56" cy="30" r="6" ${F}/><line x1="53" y1="36" x2="34" y2="84" ${F}/><line x1="34" y1="84" x2="30" y2="90" ${F}/><line x1="52" y1="40" x2="66" y2="34" ${F}/>`),
      svgWrap(`<circle cx="72" cy="8" r="3" fill="#D98B1F"/><line x1="72" y1="8" x2="62" y2="30" ${C}/><circle cx="60" cy="24" r="6" ${F}/><line x1="56" y1="30" x2="34" y2="84" ${F}/><line x1="34" y1="84" x2="30" y2="90" ${F}/><polyline points="55,34 64,38 62,30" ${F}/>`),
    ],
  },
  "Seated Reverse Fly": {
    cues: [
      "Sit on the edge of a bench with light dumbbells (5–10 lb)",
      "Hinge forward slightly from your hips — as much as your bump comfortably allows",
      "Let arms hang down with a soft bend in the elbows",
      "Raise the weights out to your sides like wings, up to shoulder height",
      "Lead with your elbows, not your hands, and lower slowly",
    ],
    frames: [
      svgWrap(`<line x1="40" y1="66" x2="72" y2="66" ${F} stroke-width="4" opacity="0.3"/><circle cx="38" cy="30" r="6" ${F}/><line x1="42" y1="35" x2="56" y2="60" ${F}/><polyline points="56,60 50,78 50,88" ${F}/><line x1="45" y1="40" x2="47" y2="60" ${F}/><circle cx="47" cy="62" r="3.5" fill="#4A3421"/>`),
      svgWrap(`<line x1="40" y1="66" x2="72" y2="66" ${F} stroke-width="4" opacity="0.3"/><circle cx="38" cy="30" r="6" ${F}/><line x1="42" y1="35" x2="56" y2="60" ${F}/><polyline points="56,60 50,78 50,88" ${F}/><line x1="45" y1="40" x2="62" y2="34" ${F}/><circle cx="64" cy="33" r="3.5" fill="#4A3421"/>`),
    ],
  },
  "Leg Press": { cues: [
    "Sit back in the machine, feet shoulder-width and slightly high on the platform",
    "Lower the sled until knees reach a comfortable depth — no pressure on your belly",
    "Press through your whole foot, especially the heels",
    "Never fully lock your knees at the top",
    "Breathe out as you press — no breath holding",
  ]},
  "Goblet Box Squat": { cues: [
    "Hold a kettlebell at your chest like you're hugging it",
    "Stand in front of a bench, feet wider than shoulders, toes out slightly",
    "Sit back and down until you lightly touch the bench",
    "Wide stance = room for the bump",
    "Stand up tall, squeezing your glutes at the top",
  ]},
  "Leg Extension": { cues: [
    "Adjust the pad so it sits just above your ankles",
    "Extend your legs smoothly — no kicking or swinging",
    "Pause briefly at the top",
    "Lower with control, keep it light-moderate",
  ]},
  "Standing Calf Raise": { cues: [
    "Balls of your feet on the platform, heels hanging off",
    "Lower your heels for a full stretch",
    "Rise up onto your toes as high as you can",
    "Pause 1 second at the top, lower slowly",
    "Hold the handles — balance shifts during pregnancy!",
  ]},
  "Cable Glute Kickback": { cues: [
    "Attach the ankle strap to a low cable, strap on one ankle",
    "Hold the machine frame for balance, soft bend in standing knee",
    "Kick the strapped leg straight back, squeezing your glute",
    "Don't arch your lower back — the motion is small",
    "All reps one side, then switch",
  ]},
  "Diverging Lat Pulldown": { cues: [
    "Grab the independent handles, thighs under the pads",
    "Pull down and slightly out — the handles will sweep wide naturally",
    "Keep your chest tall and proud the whole time",
    "Squeeze at the bottom, control back up",
  ]},
  "Single-Arm Dumbbell Row": { cues: [
    "Left hand and left knee on a flat bench, dumbbell in right hand",
    "Keep your back flat like a table — bump hangs comfortably below",
    "Pull the dumbbell up toward your hip, elbow skimming your side",
    "Squeeze your shoulder blade at the top",
    "Lower slowly. All reps, then switch sides",
  ]},
  "Straight-Arm Pulldown": { cues: [
    "Face a high cable with a straight bar, arms extended in front at shoulder height",
    "Keep arms straight (soft elbows) and sweep the bar down to your thighs",
    "Think about pushing the floor away with the bar",
    "Feel your lats — the big muscles down the sides of your back",
    "Control the bar back up",
  ]},
  "Cable Reverse Fly": { cues: [
    "Stand in the middle of the cable crossover, cables set at shoulder height",
    "Grab the LEFT cable with your RIGHT hand and vice versa (arms crossed)",
    "Open your arms out wide like wings until they're straight out to the sides",
    "Squeeze between your shoulder blades",
    "Keep it light — this one humbles everyone",
  ]},
  "Farmer Carry": { cues: [
    "Pick up a moderately heavy dumbbell in each hand",
    "Stand TALL — shoulders back and down, eyes forward",
    "Walk the length of the turf area and back",
    "This is posture practice under load — the whole point",
    "Log your steps in the reps box (aim ~40–60 per set)",
  ]},
  "Box Squat": { cues: [
    "Set an adjustable bench behind you in the squat rack",
    "Use dumbbells at your sides or a light barbell — whatever feels right today",
    "Sit back until you touch the bench, then drive up through your heels",
    "The bench is your depth guarantee and your safety net",
    "Exhale on the way up",
  ]},
  "Seated Shoulder Press": { cues: [
    "Sit on an adjustable bench with the back support upright",
    "Dumbbells start at shoulder height, palms forward",
    "Press up until arms are nearly straight — don't lock out hard",
    "Lower with control to shoulder height",
    "Keep ribs down — don't flare or arch your back",
  ]},
  "Pallof Press": { cues: [
    "Set a cable at chest height, stand sideways to the machine",
    "Hold the handle with both hands at your sternum",
    "Press straight out in front of you — the cable will try to twist you",
    "Resist the twist! That's the exercise. Hold 2 sec, return",
    "The best bump-safe core move there is. Both sides",
  ]},
  "Suitcase Carry": { cues: [
    "One dumbbell in one hand, like carrying a suitcase",
    "Walk tall and stay perfectly level — don't lean toward the weight",
    "Your obliques work overtime to keep you upright",
    "Log steps in the reps box, then switch hands",
  ]},
};

// ================= Storage =================
const store = {
  getLog(date) { try { return JSON.parse(localStorage.getItem("bee:log:" + date)); } catch(e) { return null; } },
  saveLog(date, log) { try { localStorage.setItem("bee:log:" + date, JSON.stringify(log)); } catch(e) { console.error(e); } },
  hasLog(date) { return localStorage.getItem("bee:log:" + date) !== null; },
  getHistory() { try { return JSON.parse(localStorage.getItem("bee:history")) || []; } catch(e) { return []; } },
  saveHistory(h) { try { localStorage.setItem("bee:history", JSON.stringify(h)); } catch(e) { console.error(e); } },
};

// ================= State =================
const state = {
  view: "plan",
  selected: ymd(new Date()),
  weekStart: startOfWeek(new Date()),
  dayLog: null,
  openDemos: new Set(),
};

function buildDayLog(dateStr) {
  const plan = PLAN[fromYmd(dateStr).getDay()];
  if (plan.type === "rest") return { type:"rest", title:plan.title, emoji:plan.emoji, blurb:plan.blurb };
  if (plan.type === "recovery") return {
    type:"recovery", title:plan.title, emoji:plan.emoji, blurb:plan.blurb,
    items: plan.items.map(name => ({ name, done:false })),
  };
  return {
    type:"strength", title:plan.title, emoji:plan.emoji,
    exercises: plan.exercises.map(ex => ({
      id: uid(), name: ex.name, note: ex.note,
      sets: [1,2,3].map(() => ({ weight:"", reps:"", done:false })),
    })),
  };
}

// Most recent logged weight/reps for an exercise → greyed placeholder
function lastFor(name) {
  const history = store.getHistory();
  for (const session of history) {
    const match = (session.exercises || []).find(ex => ex.name === name);
    if (match && match.sets.length) {
      const s = match.sets[match.sets.length - 1];
      return { weight: s.weight || "", reps: s.reps || "" };
    }
  }
  return { weight:"", reps:"" };
}

function loadDay() {
  state.dayLog = store.getLog(state.selected) || buildDayLog(state.selected);
  state.openDemos = new Set();
}

function persistDay() { store.saveLog(state.selected, state.dayLog); }

// ================= Rendering =================
const app = $("#app");

function render() {
  const parts = [];
  parts.push(`
    <header class="header">
      <div class="header-row"><h1>Busy Bee</h1><span class="bee-float">🐝</span></div>
      <p class="tagline">Back &amp; posture strength · bump friendly</p>
    </header>
    <nav class="tabs">
      <button class="tab ${state.view==="plan"?"tab-on":""}" data-action="tab" data-tab="plan">My plan</button>
      <button class="tab ${state.view==="history"?"tab-on":""}" data-action="tab" data-tab="history">Hive log${store.getHistory().length ? ` (${store.getHistory().length})` : ""}</button>
    </nav>
  `);
  parts.push(state.view === "plan" ? renderPlan() : renderHistory());
  app.innerHTML = parts.join("");
}

function renderPlan() {
  const out = [renderWeekStrip()];
  const log = state.dayLog;
  const d = fromYmd(state.selected);
  out.push(`
    <div class="daytitle">
      <span class="daytitle-emoji">${log.emoji}</span>
      <div>
        <h2 class="daytitle-name">${esc(log.title)}</h2>
        <p class="daytitle-date">${prettyDate(d)}</p>
      </div>
    </div>
  `);
  if (log.type === "rest") {
    out.push(`<section class="card restcard"><div class="restcard-emoji">${log.emoji}</div><p class="restcard-blurb">${esc(log.blurb)}</p></section>`);
  } else if (log.type === "recovery") {
    if (log.blurb) out.push(`<p class="dayblurb">${esc(log.blurb)}</p>`);
    out.push(`<section class="card">` + log.items.map((it,i) => `
      <button class="reco-row ${it.done?"reco-done":""}" data-action="toggle-item" data-idx="${i}">
        <span class="reco-check">${it.done?"🍯":"○"}</span><span class="reco-name">${esc(it.name)}</span>
      </button>`).join("") + `</section>`);
  } else {
    out.push(renderStrength(log));
  }
  return out.join("");
}

function renderWeekStrip() {
  const days = [];
  const todayY = ymd(new Date());
  for (let i = 0; i < 7; i++) {
    const d = new Date(state.weekStart); d.setDate(d.getDate() + i);
    const dy = ymd(d);
    const plan = PLAN[d.getDay()];
    const cls = "daycell" + (dy===state.selected?" daycell-sel":"") + (dy===todayY?" daycell-today":"");
    days.push(`
      <button class="${cls}" data-action="select-day" data-date="${dy}" aria-label="${d.toDateString()}, ${esc(plan.title)}">
        <span class="daycell-letter">${"SMTWTFS"[i]}</span>
        <span class="daycell-num">${d.getDate()}</span>
        <span class="daycell-dot">${store.hasLog(dy) ? "🍯" : (plan.type==="rest" ? "·" : plan.emoji)}</span>
      </button>`);
  }
  const monthLabel = state.weekStart.toLocaleDateString("en-US", { month:"long", year:"numeric" });
  return `
    <div class="weekwrap">
      <div class="weeknav">
        <button class="weekarrow" data-action="prev-week" aria-label="Previous week">‹</button>
        <span class="weekmonth">${monthLabel}</span>
        <button class="weekarrow" data-action="next-week" aria-label="Next week">›</button>
      </div>
      <div class="weekstrip">${days.join("")}</div>
    </div>`;
}

function renderStrength(log) {
  let total = 0, done = 0;
  log.exercises.forEach(ex => ex.sets.forEach(s => { total++; if (s.done) done++; }));
  const pct = total ? Math.round(done/total*100) : 0;

  const hexes = [];
  for (let i = 0; i < Math.max(total,1); i++) {
    const beeHere = (i === done-1 && done < total) || (done === total && i === Math.max(total,1)-1);
    hexes.push(`<div class="hex ${i<done?"hex-filled":""}">${beeHere?'<span class="hex-bee">🐝</span>':""}</div>`);
  }

  const cards = log.exercises.map(ex => {
    const exDone = ex.sets.filter(s => s.done).length;
    const demo = DEMOS[ex.name];
    const open = state.openDemos.has(ex.id);
    const ph = lastFor(ex.name);
    const rows = ex.sets.map((s,i) => `
      <div class="set-row ${s.done?"set-done":""}">
        <span class="set-num">${i+1}</span>
        <input inputmode="decimal" placeholder="${esc(s.weight ? "" : (ph.weight || "—"))}" value="${esc(s.weight)}"
               data-input="weight" data-ex="${ex.id}" data-idx="${i}" aria-label="${esc(ex.name)} set ${i+1} weight">
        <input inputmode="numeric" placeholder="${esc(s.reps ? "" : (ph.reps || "—"))}" value="${esc(s.reps)}"
               data-input="reps" data-ex="${ex.id}" data-idx="${i}" aria-label="${esc(ex.name)} set ${i+1} reps">
        <button class="check ${s.done?"check-on":""}" data-action="toggle-done" data-ex="${ex.id}" data-idx="${i}"
                aria-label="${s.done?"Mark set incomplete":"Mark set complete"}">${s.done?"🍯":"○"}</button>
        <button class="icon-btn small" data-action="remove-set" data-ex="${ex.id}" data-idx="${i}" aria-label="Remove set">–</button>
      </div>`).join("");

    return `
      <section class="card ${exDone===ex.sets.length && ex.sets.length>0 ? "card-complete":""}">
        <div class="card-head">
          <div>
            <h2>${esc(ex.name)}</h2>
            ${ex.note ? `<p class="note">${esc(ex.note)}</p>` : ""}
          </div>
          <button class="icon-btn" data-action="remove-exercise" data-ex="${ex.id}" aria-label="Remove ${esc(ex.name)}">✕</button>
        </div>
        ${demo ? `<button class="howto-btn" data-action="toggle-demo" data-ex="${ex.id}">${open ? "Hide how-to ▴" : "How do I do this? 🎓"}</button>` : ""}
        ${demo && open ? renderDemo(demo) : ""}
        <div class="set-header"><span>Set</span><span>lbs</span><span>Reps</span><span></span><span></span></div>
        ${rows}
        <button class="add-set" data-action="add-set" data-ex="${ex.id}">+ add set</button>
      </section>`;
  }).join("");

  return `
    <section class="progress-card">
      <div class="progress-label"><span>${done} / ${total} sets</span><span>${pct}% 🍯</span></div>
      <div class="honeycomb">${hexes.join("")}</div>
    </section>
    ${cards}
    <button class="add-exercise" data-action="add-exercise">+ Add exercise</button>
    <button class="finish" data-action="finish" ${done===0?"disabled":""}>${done===0 ? "Complete a set to finish" : "Finish workout 🐝"}</button>
    <p class="footnote">Exhale on effort · conversational pace · listen to your body 💛</p>`;
}

function renderDemo(demo) {
  const frames = demo.frames ? `
    <div class="demo-frames">
      <div class="demo-frame">${demo.frames[0]}<span class="demo-label">Start</span></div>
      <div class="demo-arrow">→</div>
      <div class="demo-frame">${demo.frames[1]}<span class="demo-label">Finish</span></div>
    </div>` : "";
  return `<div class="demo">${frames}<ol class="demo-cues">${demo.cues.map(c => `<li>${esc(c)}</li>`).join("")}</ol></div>`;
}

function renderHistory() {
  const history = store.getHistory();
  if (!history.length) {
    return `<section class="card empty"><p>🍯 No workouts logged yet.</p><p class="note">Finish a workout and it'll land here.</p></section>`;
  }
  const cards = history.map(session => `
    <section class="card">
      <div class="card-head">
        <div>
          <h2>${esc(session.title || "Workout")}</h2>
          <p class="note">${fromYmd(session.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</p>
        </div>
        <button class="icon-btn" data-action="delete-session" data-id="${session.id}" aria-label="Delete session">✕</button>
      </div>
      ${(session.exercises||[]).map(ex => `
        <div class="hist-row">
          <span class="hist-name">${esc(ex.name)}</span>
          <span class="hist-sets">${ex.sets.map(s => `${esc(s.weight)||"bw"}×${esc(s.reps)||"?"}`).join(" · ")}</span>
        </div>`).join("")}
      <div class="hist-actions">
        <button class="chip-btn" data-action="copy-session" data-id="${session.id}">Copy for Noah's trainer 📋</button>
      </div>
    </section>`).join("");
  return cards + `<button class="export-btn" data-action="export-all">Export all data (backup) 📦</button>`;
}

// ================= Mutations =================
function findEx(id) { return state.dayLog.exercises.find(ex => ex.id === id); }

function commitPlaceholderIfEmpty(ex, i) {
  // Tapping done on an untouched field adopts the greyed previous weight/reps.
  const s = ex.sets[i];
  const ph = lastFor(ex.name);
  if (!s.weight && ph.weight) s.weight = ph.weight;
  if (!s.reps && ph.reps) s.reps = ph.reps;
}

const actions = {
  "tab": (el) => { state.view = el.dataset.tab; if (state.view === "plan") loadDay(); render(); },
  "select-day": (el) => { state.selected = el.dataset.date; loadDay(); render(); },
  "prev-week": () => { state.weekStart.setDate(state.weekStart.getDate() - 7); render(); },
  "next-week": () => { state.weekStart.setDate(state.weekStart.getDate() + 7); render(); },
  "toggle-demo": (el) => {
    const id = el.dataset.ex;
    state.openDemos.has(id) ? state.openDemos.delete(id) : state.openDemos.add(id);
    render();
  },
  "toggle-done": (el) => {
    const ex = findEx(el.dataset.ex); const i = +el.dataset.idx;
    const s = ex.sets[i];
    if (!s.done) commitPlaceholderIfEmpty(ex, i);
    s.done = !s.done;
    persistDay(); render();
  },
  "add-set": (el) => {
    const ex = findEx(el.dataset.ex);
    const last = ex.sets[ex.sets.length - 1];
    ex.sets.push({ weight: last ? last.weight : "", reps: "", done: false });
    persistDay(); render();
  },
  "remove-set": (el) => {
    const ex = findEx(el.dataset.ex);
    ex.sets.splice(+el.dataset.idx, 1);
    persistDay(); render();
  },
  "add-exercise": () => {
    const name = prompt("Exercise name?");
    if (!name) return;
    state.dayLog.exercises.push({ id: uid(), name: name.trim(), note: "", sets: [1,2,3].map(() => ({ weight:"", reps:"", done:false })) });
    persistDay(); render();
  },
  "remove-exercise": (el) => {
    state.dayLog.exercises = state.dayLog.exercises.filter(ex => ex.id !== el.dataset.ex);
    persistDay(); render();
  },
  "toggle-item": (el) => {
    const it = state.dayLog.items[+el.dataset.idx];
    it.done = !it.done;
    persistDay(); render();
  },
  "finish": () => {
    const log = state.dayLog;
    const session = {
      id: uid(), date: state.selected, title: log.title,
      exercises: log.exercises
        .map(ex => ({ name: ex.name, sets: ex.sets.filter(s => s.done).map(s => ({ weight:s.weight, reps:s.reps })) }))
        .filter(ex => ex.sets.length),
    };
    if (!session.exercises.length) return;
    const history = store.getHistory().filter(s => !(s.date === state.selected && s.title === log.title));
    history.unshift(session);
    store.saveHistory(history);
    celebrate();
  },
  "delete-session": (el) => {
    store.saveHistory(store.getHistory().filter(s => s.id !== el.dataset.id));
    render();
  },
  "copy-session": (el) => {
    const s = store.getHistory().find(x => x.id === el.dataset.id);
    if (!s) return;
    const md = [
      `## Workout — ${s.date} (${s.title})`,
      ...s.exercises.map(ex => `- ${ex.name}: ${ex.sets.map(x => `${x.weight||"bw"}×${x.reps||"?"}`).join(", ")}`),
    ].join("\n");
    copyText(md, "Copied! Paste it to the trainer agent 🐝");
  },
  "export-all": () => {
    const dump = { history: store.getHistory(), logs: {} };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith("bee:log:")) dump.logs[k.slice(8)] = JSON.parse(localStorage.getItem(k));
    }
    copyText(JSON.stringify(dump, null, 2), "Backup copied to clipboard 📦");
  },
};

function copyText(text, msg) {
  const done = () => toast(msg);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } catch(e) {}
  document.body.removeChild(ta); done();
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast"; el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function celebrate() {
  const el = document.createElement("div");
  el.className = "celebrate";
  el.innerHTML = `<div class="celebrate-card"><div class="celebrate-bee">🐝✨</div><div class="celebrate-title">Workout saved!</div><div class="celebrate-sub">Sweet work, mama.</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); render(); }, 2400);
}

// ================= Events =================
app.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const fn = actions[btn.dataset.action];
  if (fn) fn(btn);
});

// Typing updates state + saves without re-rendering (keeps keyboard focus)
app.addEventListener("input", (e) => {
  const inp = e.target.closest("[data-input]");
  if (!inp) return;
  const ex = findEx(inp.dataset.ex);
  if (!ex) return;
  ex.sets[+inp.dataset.idx][inp.dataset.input] = inp.value;
  persistDay();
});

// ================= Boot =================
loadDay();
render();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
