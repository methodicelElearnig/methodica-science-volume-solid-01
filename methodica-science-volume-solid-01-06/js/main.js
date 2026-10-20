'use strict';
/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 06 (peak א)
   PeakAssessment: intro + scenario + 4 sub-parts, each with its own
   feedback (2 attempts). After סעיף ד: ≥3/4 → unit done (no end screen);
   <3 → Part 07 (peak ב).
   ═══════════════════════════════════════════════════════════ */

/* 2026-10-14: the combined answer review (old S5/S6, storyboard 157/158) was removed — feedback now
   follows each סעיף — and the scenario (old S7) and the ending (old S8) moved into the freed ids, so
   the ids stay contiguous (_test/checks.mjs gate 3). */
/* 2026-10-15: the success ending (S6, storyboard 173 — the confetti screen) was removed at the content
   owner's request. A pass now finishes the unit straight from סעיף ד's שנמשיך? (see peakNext()). */
const TOTAL_SCREENS = 6;               // S0 intro, S5 scenario, S1–S4 sub-parts
/* The scenario (storyboard 148) took the next free id rather than renumbering four sub-parts,
   their options, hints and SCREEN_TO_SUBCONTENT rows. The reading order lives in peakStart()
   and goBack(), not in the ids — the same approach part 05 takes with its SCENARIOS table. */
const SCENARIO_SCREEN = 5;
const NEXT_PART_SLUG = 'methodica-science-volume-solid-01-07';   // dev-only hop target (the platform routes a failed מועד א via recommendedAfterFail)
const PEAK_CORRECT = { 1: 'b', 2: 'a', 3: 'a', 4: 'b' };
const PEAK_PARTS = 4, PEAK_PASS = 3;

/* ═══════════════════════════════════════════════════════════
   COMPONENT — Companion character
   The learner picks a mascot on part-01 S0; localStorage is the only
   carrier across parts, so a missing value must never blank the mascot.
   Slots are per-screen records injected by renderCompanion() rather than
   authored markup: ~20 slots across six index.html files would have to be
   kept in sync with every position tweak, and injecting lets the pose
   resolver run at render time.
   Offsets are storyboard positions mapped onto this 1280x710 canvas
   (bottom = 710 - (y + h)), anchored to the nearer PHYSICAL edge so the
   mascot stays on its intended side when the canvas grows wider than 1280.
   Where the storyboard centred the mascot under a block of text, the unit
   centres that text vertically instead, so those slots are moved to the
   free edge rather than dropped on top of the copy.
   ═══════════════════════════════════════════════════════════ */
function getCharacter() {
  /* The document first, then the per-unit localStorage cache (unit-js/40-resume.js
     getUnitCharacter) — the part-01 choice reaches the later parts, launched separately by Kata,
     through that cache. Never the old origin-wide key this unit used before 2026-10-20. */
  try { return (typeof getUnitCharacter === 'function' ? getUnitCharacter() : null) || 'orange'; }
  catch (e) { return 'orange'; }
}
/* Which pose files exist on disk, and in which format. A manifest, not an
   <img onerror> fallback: onerror would fire a real 404 on nearly every
   screen and this unit's QA gate checks the network log for zero 404s.
   Landing a produced GIF is one line here plus the file. */
/* '2num' keeps the delivered filename (Copmpanion/Orange_2num.mp4, turquoise_2num.mp4) so the
   pose maps 1:1 to the source and nobody has to guess which clip it is. 960x960, 4.06s — square,
   unlike the 1280x720 clips around it, so its slot must NOT declare `ca`. */
const CHARACTER_ASSETS = { selection: 'png', run: 'mp4', think: 'mp4', challenge: 'mp4', '2num': 'mp4' };
function characterAsset(pose) {
  const ext = CHARACTER_ASSETS[pose];
  /* ?v= is a CACHE-BUSTER, not decoration: the sprite files were re-encoded in place
     (their near-white matte lifted to pure #FFFFFF) under their existing names, so a
     browser holding the old copy would keep showing the grey box on the white canvas.
     Bump it whenever a character asset is re-exported. Over file:// the query is ignored
     rather than breaking the load, so it is safe there too.
     ?v=4 here, still ?v=2 in parts 01-04, because THIS part's sprites were replaced IN PLACE twice
     on 2026-08-27 — the confetti re-export of turquoise-success, then the matte lift below — and a
     browser holding an old copy would keep playing it under the same filename. Parts 01-04 need no
     bump: all 44 of their sprites were already on pure #FFFFFF and none of them changed. */
  return 'assets/img/character-' + getCharacter() + '-' +
         (ext ? pose : 'selection') + '.' + (ext || 'png') + '?v=4';
}
/* Restarts a freshly-sourced <video> companion; no-op for <img> ones. */
function startCompanionMedia(el) {
  if (el.tagName !== 'VIDEO') return;
  el.load();
  const p = el.play();
  if (p && p.catch) p.catch(function () {});
}
const CHARACTER_SLOTS = {
  /* sb147: the transition screen carries the sprite as its illustration, 640x360 in the middle of
     the column, not a 210px corner decoration. `into` drops it in the box the markup reserves. */
  s0: { pose: 'challenge', w: 640, into: 's0-video', ca: '16 / 9' },        /* sb147 */
  /* 248px = 75% of the 330 this was briefly set to, which read as oversized beside the question.
     No `ca`: the old value carried `ca: '16 / 9'` on a 960x960 source, so the box came out 132x74
     and object-fit: contain drew the mascot at 74px — the square default is correct here.
     The 248 is load-bearing for .peak-question--withimage > .companion-say, whose 578px width is
     330 (bubble) + 0 (gap) + 248; change one and the other has to follow. */
  s1: { pose: 'think', w: 248, into: 's1-say' }                             /* sb149 */
};
function renderCompanion(n) {
  const screen = document.getElementById('s' + n);
  if (!screen) return;
  screen.dataset.character = getCharacter();
  const slot = CHARACTER_SLOTS['s' + n];
  // Lets a template reserve room for the sprite instead of being drawn over.
  screen.classList.toggle('has-companion', !!slot);
  /* `into` hands the sprite to a .companion-say group so the group's own bottom-alignment
     aims the bubble's beak at him — see s1. */
  const host = slot && slot.into ? (document.getElementById(slot.into) || screen) : screen;
  let el = screen.querySelector('.companion');
  if (!slot) { if (el) el.remove(); return; }
  const tag = CHARACTER_ASSETS[slot.pose] === 'mp4' ? 'video' : 'img';
  if (el && el.tagName.toLowerCase() !== tag) { el.remove(); el = null; }
  if (!el) {
    el = document.createElement(tag);
    el.className = 'companion';
    el.alt = '';                                   // decorative, carries no information
    el.setAttribute('aria-hidden', 'true');
    el.draggable = false;
    if (tag === 'video') { el.autoplay = true; el.loop = true; el.muted = true; el.playsInline = true; }
  }
  if (el.parentElement !== host) host.appendChild(el);
  el.src = characterAsset(slot.pose);
  startCompanionMedia(el);
  el.style.setProperty('--cw', slot.w + 'px');
  /* Square is the CSS default; a 16:9 pose declares its own so the box is right from
     first paint instead of after the mp4 header lands. */
  el.style.setProperty('--ca', slot.ca || '');
  el.classList.toggle('companion--center', slot.center === true);
  ['left', 'right', 'top', 'bottom'].forEach(function (k) {
    el.style[k] = slot[k] != null ? slot[k] + 'px' : '';
  });
}

/* ═══ Per-סעיף feedback copy (2026-10-14) ═══
   Feedback now follows each סעיף (producer decision, as in יעד 4 and יעד 9), replacing the combined
   answer slides 157/158. Each סעיף's explanation is its own row of those slides; the retry and
   wrong-final titles are the unit's standard ones (part 05's FB_RETRY / FB_WRONG2). */
const FB_RETRY  = { title: 'התשובה אינה נכונה.', body: ['שננסה שוב?'] };
const FB_WRONG2 = 'התשובה אינה נכונה.<br />התשובה הנכונה מסומנת.';
const fbPopups = explanation => ({
  retry:   FB_RETRY,
  correct: { title: 'נכון מאוד!', body: explanation },
  wrong2:  { title: FB_WRONG2,    body: explanation }
});
const PEAK_FEEDBACK = {
  1: fbPopups([   /* sb157 א */
    'נפח הפסלון = נפח המים הסופי פחות<br />נפח המים המקורי = <b>60 סמ"ק</b>.']),
  2: fbPopups([   /* sb157 ב */
    'בוצעו 3 מדידות כדי <b>לצמצם טעויות מקריות ולקבל קריאה מהימנה</b>.',
    'כדאי <b>לדווח על הממוצע</b> = 60 סמ"ק.']),
  3: fbPopups([   /* sb157 ג */
    'איריס צודקת: שלוש תוצאות המדידה קרובות מאוד זו לזו, מה שמוכיח שהתוצאות יציבות ואינן מקריות.']),
  4: fbPopups([   /* sb157 ד */
    'המדידה חריגה מאוד וסביר שנפלה בה טעות.',
    '<b>יש למדוד מחדש ולא להכליל את הערך 80 בחישוב הסופי</b>.'])
};

/* ⚠️ NOTHING HERE MAY REPORT. resetScreenState() runs on every navigation, every back-navigation
   and (from Stage 5) every resume replay, so a statement sent from here repeats.

   It used to send the component 'completed' when the learner landed on screen 5 — via xapiSend,
   which defers by a macrotask. Three separate faults in one line: it fired on mere navigation (so
   the dev bridge or a back-button produced a completed assessment), it hard-coded success:true so a
   learner who answered nothing was reported as having PASSED, and being deferred it would have
   escaped both of resume's guards — the sender stub and the _restoring flag are both gone by the
   time a macrotask runs. See RESUME.md risk R1. It now lives in partFinish(), synchronously. */
function resetScreenState(n) {
  renderCompanion(n);
  if (n >= 1 && n <= PEAK_PARTS) peakPaint(n);
}
/* First paint of s0. goTo() is what normally injects a screen's sprite, and a fresh entry never
   calls it — only a resume with a saved payload replays onto a screen — so the intro's character
   was missing on every first visit. Same top-level call part 04 makes. */
resetScreenState(0);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('[id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
  if (e.key === 'ArrowLeft')  { if (currentScreen >= 1 && currentScreen <= PEAK_PARTS) return; }
  if (e.key === 'ArrowRight') goBack();
});
/* The end screens were unreachable in reverse: this only ever handled 1-4, the scenario and 0, so
   every `חזרה` added to them would have been a dead button. Named edges, not `currentScreen - 1` —
   ROUTING-AND-RETAKE.md forbids assuming the numeric order anywhere in this unit, and it is wrong
   here twice over (the scenario is screen 5). Walking back into an answered
   sub-part is already safe: the doneQ ledger is what stops a graded answer being reported twice. */
function goBack() {
  if (currentScreen >= 2 && currentScreen <= PEAK_PARTS) { goTo(currentScreen - 1); return; }
  if (currentScreen === 1) { goTo(SCENARIO_SCREEN); return; }
  if (currentScreen === SCENARIO_SCREEN) { goTo(0); return; }
}
function advanceScreen() { if (currentScreen === 0) peakStart(); }

/* ─── Peak hints (storyboard gives every sub-part its own hint slide) ───
   Not the scq* hint machinery: that is keyed on SCQ_REG, which the peak
   components do not use. The overlay id ends in -hint-overlay so goTo()
   closes it on navigation, the same convention as the other parts. */
function peakHint(idx) {
  const ov = document.getElementById('s' + idx + '-hint-overlay');
  if (!ov) return;
  xapiRequestedHint(PEAK_ITEM, 'q' + idx);   // once per question per attempt (hints ledger); before the reveal
  ov.classList.remove('hidden');
}
function peakCloseHint(idx) {
  document.getElementById('s' + idx + '-hint-overlay')?.classList.add('hidden');
}

/* ─── Peak assessment ─────────────────────────────────────── */
/* s0 (transition) -> s5 (scenario) -> s1 (סעיף א). */
function peakStart() { goTo(SCENARIO_SCREEN); }

/* Per-סעיף feedback (2026-10-14), the same controller contract as the practice questions in part 05
   (scqCheck): צדקתי? checks; a first wrong answer gets the retry popup and the option it judged is
   gated; a correct answer, or a second wrong one, closes the סעיף with its explanation and the
   button turns into שנמשיך?. A סעיף counts toward the pass only if it was answered correctly, on
   either attempt.

   peakState[idx] = { sel, attempts, done, phase, lastWrong }. `phase` is WHAT THE LEARNER WAS LAST
   SHOWN — 'retry' | 'correct' | 'wrong2', or null for unchecked — and is the single source for the
   marks and the popup, so peakPaint() can rebuild a screen from state alone (navigation, resume). */
const PEAK_MAX_ATTEMPTS = 2;
let peakState = {};
function ps(idx) {
  return peakState[idx] || (peakState[idx] = { sel: null, attempts: 0, done: false, phase: null, lastWrong: null });
}
function peakOpts(idx) { return document.querySelectorAll('#s' + idx + '-opts .peak-opt'); }

/* The options are template .scq-opt pills, so the picked state is `.selected` — the class
   .scq-opt.selected .scq-radio keys on to fill the radio — and aria-checked follows it. */
function peakSelect(idx, id) {
  const s = ps(idx);
  if (s.done) return;
  /* Retry gate (720-templates): the option just judged wrong cannot be submitted again. */
  if (s.phase === 'retry' && id === s.sel) return;
  s.sel = id;
  s.phase = null;                 // a re-pick clears the retry verdict and its popup
  peakPaint(idx);
}

function peakCheck(idx) {
  const s = ps(idx);
  if (s.done) { peakNext(idx); return; }
  if (!s.sel || s.sel === s.lastWrong) return;
  s.attempts++;
  const correct = s.sel === PEAK_CORRECT[idx];
  const final = correct || s.attempts >= PEAK_MAX_ATTEMPTS;

  /* xAPI (synchronous): the option's visible text is resolved to the metadata answer string by the
     response layer (unit-js/20-xapi.js). The closing attempt is 'answered.last'. No re-answer ledger
     any more: under platform routing nothing re-enters this component after its 'completed', and
     peakState (restored by resume) already locks a resolved סעיף. */
  xapiAnswered(PEAK_ITEM, 'q' + idx, correct, final,
    { choices: [xapiAnswerText(document.querySelector('#s' + idx + '-opts .peak-opt[data-id="' + s.sel + '"]'))] });

  if (correct) s.phase = 'correct';
  else if (final) s.phase = 'wrong2';
  else { s.phase = 'retry'; s.lastWrong = s.sel; }
  if (final) { s.done = true; peakCloseHint(idx); }
  peakPaint(idx);

  /* Synchronous: an answer given and then abandoned without navigating would otherwise rest on the
     page-leave handlers, which Chrome may drop. */
  try { flushResumeSave(); } catch (e) {}
}

/* Rebuilds a סעיף's whole answered look from peakState: marks, button, hint, popup. Mirrors
   peakCheck's DOM writes and nothing else — no state, no statements. */
function peakPaint(idx) {
  const s = ps(idx), screen = 's' + idx, right = PEAK_CORRECT[idx];
  const verdict = s.phase === 'correct' || s.phase === 'wrong2';
  peakOpts(idx).forEach(o => {
    const id = o.dataset.id, picked = id === s.sel;
    const isCorrect = verdict && id === right;
    const isWrong = picked && id !== right && (s.phase === 'wrong2' || s.phase === 'retry');
    o.classList.toggle('correct', isCorrect);
    o.classList.toggle('wrong', isWrong);
    o.classList.toggle('selected', picked && !isCorrect && !isWrong);
    o.setAttribute('aria-checked', picked ? 'true' : 'false');
    o.disabled = s.done;
  });
  const btn = document.getElementById(screen + '-continue');
  if (btn) {
    btn.textContent = s.done ? 'שנמשיך?' : 'צדקתי?';
    btn.disabled = s.done ? (idx === PEAK_PARTS && xapiComponentEnded()) : (!s.sel || s.sel === s.lastWrong);   // D-8: the ledger decides
  }
  /* Hint policy: available on every סעיף until it resolves (slides "אפשר רמז?"), hidden — not
     disabled — afterwards. */
  const hint = document.getElementById(screen + '-hint');
  if (hint) hint.style.visibility = s.done ? 'hidden' : '';
  if (s.phase) renderFeedbackPopup(screen, s.phase, PEAK_FEEDBACK[idx]);
  else peakClosePopup(screen);
}

/* ═══ Feedback popup — same renderer as part 05's ═══ */
function renderFeedbackPopup(screen, type, popups) {
  const popup = document.getElementById(screen + '-scq-popup'); if (!popup) return;
  const cfg = popups[type];
  popup.style.background = (type === 'correct') ? '#edf8ed' : '#ffdbdc';
  popup.style.left = '2px'; popup.style.top = 'auto'; popup.style.bottom = '84px';
  document.getElementById(screen + '-scq-popup-title').innerHTML = cfg.title;
  document.getElementById(screen + '-scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
  /* s1's companion line stands where the popup opens; it steps aside while a popup is up. */
  document.getElementById(screen)?.classList.add('fb-shown');
}
function peakClosePopup(screen) {
  document.getElementById(screen + '-scq-popup')?.classList.add('hidden');
  document.getElementById(screen)?.classList.remove('fb-shown');
}
/* Draggable, like every other feedback popup in the unit (unit-js/15-ui.js). */
for (let i = 1; i <= PEAK_PARTS; i++) attachPopupDrag(document.getElementById('s' + i + '-scq-popup'));

/* "שנמשיך?" on a resolved סעיף. After סעיף ד the learner's click is the component's end: the
   verdict is recorded, the component is reported (on BOTH outcomes — a failed מועד א must still be
   reported or the attempt goes unrecorded) and the button is disabled. Nothing else: Kata removes
   the component on 'completed' and routes a failing learner to מועד ב (part 07) through the
   catalogue's recommendedAfterFail. The hop below is dev-only. */
function peakNext(idx) {
  if (idx < PEAK_PARTS) { goTo(idx + 1); return; }
  const passed = peakScore() >= PEAK_PASS;
  /* This part's own verdict, into its State document (RESULT_KEYS, unit-js/40-resume.js). Nothing
     reads it across parts. Written BEFORE the report so the document that carries the `done` ledger
     carries the verdict too. */
  try { setUnitResult('volume-solid-01_moedAPassed', passed ? 'true' : 'false'); } catch (e) {}
  partFinish(document.getElementById(XAPI_END_BTN));
  if (DEV_NAV && !passed) {
    writeForwardState(NEXT_PART_SLUG);
    window.location.href = '../' + NEXT_PART_SLUG + '/index.html' + window.location.search;
  }
}

function peakScore() { let n = 0; for (let i = 1; i <= PEAK_PARTS; i++) { const s = peakState[i]; if (s && s.done && s.sel === PEAK_CORRECT[i]) n++; } return n; }

/* ═══════════════════════════════════════════════════════════
   xAPI (720) — per-part seams
   ═══════════════════════════════════════════════════════════ */

/* All four sub-parts are questions q1–q4 of ONE catalog item, so the item stays open across screens
   1–4; xapiOnScreen() emits nothing while the suffix is unchanged, and partFinish() closes it. */
var SCREEN_TO_SUBCONTENT = {
  /* The intro is page 0 OF THE ITEM, not a no-item screen. Mapping it to null made the item close
     the moment a learner navigated back to the intro (goBack allows 2->1->0), emitting a premature
     item 'completed' carrying a partial score — which, once the Stage 5a ledger lands, would mark
     the item done and SUPPRESS the real one from partFinish(). Keeping the intro inside the item
     means the item opens on entry and closes only in partFinish(), whatever route the learner takes. */
  0: ['01', 0],       // intro
  1: ['01', 1],       // sub-part 1
  2: ['01', 2],       // sub-part 2
  3: ['01', 3],       // sub-part 3
  4: ['01', 4],       // sub-part 4
  /* The scenario belongs to the same item and the same page as the intro: it asks nothing, and
     mapping it anywhere else would open or close the item on a screen that carries no answer. */
  5: ['01', 0]        // scenario
};

var XAPI_COMP_SLUG = 'methodica-science-volume-solid-01-06';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

/* The single item, referenced by every send in this component. Replaces the old PEAK_QID constant,
   which hand-built the IRI and omitted the component segment. */
var PEAK_ITEM = '01';

var XAPI_EVAL_ITEMS = { '01': 1 };

/* The item's own 'completed' needs an explicit result, because the library's aggregate is an
   all-correct AND: a learner who scores 3 of 4 — which PASSES here — would otherwise be reported as
   success:false on the item while the component said success:true. */
var XAPI_ITEM_RESULT = {
  '01': function () {
    return { success: peakScore() >= PEAK_PASS, score: { scaled: peakScore() / PEAK_PARTS } };
  }
};

/* Per-part seam read by unit-js/50-loader.js. */
var XAPI_METADATA_FILE = '../metadata/methodica-science-volume-solid-01-06.json';

/* ── The end of this component (2026-10-20, platform owns routing) ──
   XAPI_END_BTN is the last button the learner clicks; partFinish() reports the component
   'completed' through xapiEndComponent (unit-js/20-xapi.js) and disables that button — and does
   NOTHING else: Kata removes the component from the screen when 'completed' arrives (v2.7 p.23)
   and decides what comes next from the catalogue. restoreEndedButton() keeps the button disabled
   after a reload (D-8). The hop to the next part lives only under DEV_NAV. */
var XAPI_END_BTN = 's4-continue';
/* מועד א: pass = PEAK_PASS of PEAK_PARTS סעיפים; reported on both outcomes. */
function xapiPartResult() {
  return { success: peakScore() >= PEAK_PASS, score: { scaled: peakScore() / PEAK_PARTS } };
}
function partFinish(btn) {
  xapiEndComponent(xapiPartResult(), btn || document.getElementById(XAPI_END_BTN));
}

/* ═══════════════════════════════════════════════════════════
   RESUME — this component's payload
   The assessment. peakState is the whole of it, and restoring it is LAYER 1 of the re-answer guard:
   with the state back, a resolved סעיף repaints as resolved and peakCheck() cannot grade it again.
   Layer 2 is the doneQ ledger in unit-js/40-resume.js, which does not depend on this working.
   That matters here specifically because part 07 offers "חזרה" back into part 06 — see
   ROUTING-AND-RETAKE.md.
   ═══════════════════════════════════════════════════════════ */

/* peakState is an OBJECT of objects, so it cannot travel through RESUME_PLAIN_VARS' verbatim copy —
   that would store a live reference that mutates along with the original, and the snapshot goTo()
   takes before resetScreenState() would already contain the change it exists to undo. It is
   deep-cloned explicitly below instead. */
var RESUME_PLAIN_VARS = [];
var RESUME_INPUT_IDS  = [];
var RESUME_TEXT_IDS   = [];

function clonePeakState(src) { return JSON.parse(JSON.stringify(src || {})); }

function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    peakState: clonePeakState(peakState),
    vars: {}
  };
}

/* The parameter MUST stay named `st` — see unit-js/README.md.
   A document written before per-סעיף feedback (2026-10-14) carries peakAnswers/peakCommitted
   instead: a committed pick was its single, final attempt, so it maps to a resolved סעיף. */
function applyResumeVars(st) {
  if (st.qResults) XAPI_Q_RESULTS = Object.assign({}, st.qResults);
  if (st.peakState) { peakState = clonePeakState(st.peakState); return; }
  if (st.peakAnswers) {
    peakState = {};
    Object.keys(st.peakAnswers).forEach(function (k) {
      var done = !!(st.peakCommitted && st.peakCommitted[k]), sel = st.peakAnswers[k];
      peakState[k] = { sel: sel, attempts: done ? 1 : 0, done: done, lastWrong: null,
                       phase: done ? (sel === PEAK_CORRECT[k] ? 'correct' : 'wrong2') : null };
    });
  }
}

function applyResumeDom(st) {}

/* peakPaint() rebuilds a סעיף completely from peakState — marks, button, hint and feedback popup —
   and resetScreenState() calls it for screens 1-4. goTo() wipes every popup before resetScreenState
   runs, so repainting here (after the state is re-applied) is what brings the popup back. */
function restoreScreenUI(n) {
  if (n >= 1 && n <= PEAK_PARTS) peakPaint(n);
}


/* ── xAPI ready hook ──
   Loads the unit metadata but reports NO unit-scope 'initialized' — this component is not the one
   that opens the unit. Preserved from the pre-extraction code; see the note in component 01. */
function onXapiReady() {
  loadUnitMetadata('../metadata/methodica-science-volume-solid-01_unit.json', function () {});
}
